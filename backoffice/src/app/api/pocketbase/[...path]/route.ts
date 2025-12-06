import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

// Use PocketBase URL from env, with sensible local fallback
// Priority: AWS_POCKETBASE_URL (for production/AWS) > POCKETBASE_URL (for local/other) > NEXT_PUBLIC_POCKETBASE_URL > localhost default
// This allows the same code to work in both local and AWS environments
function getPocketBaseUrl(): string {
  // Check for AWS URL first (for AWS deployments)
  if (process.env.AWS_POCKETBASE_URL) {
    return process.env.AWS_POCKETBASE_URL;
  }
  
  // Auto-detect AWS URL from NEXT_PUBLIC_POCKETBASE_URL if it contains AWS server IP
  if (process.env.NEXT_PUBLIC_POCKETBASE_URL && process.env.NEXT_PUBLIC_POCKETBASE_URL.includes('13.201.90.240')) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL;
  }
  
  // Check for explicit POCKETBASE_URL (for local or custom setups)
  if (process.env.POCKETBASE_URL) {
    return process.env.POCKETBASE_URL;
  }
  
  // Check for public URL (client-side accessible)
  if (process.env.NEXT_PUBLIC_POCKETBASE_URL) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL;
  }
  
  // Default to localhost for local development
  return 'http://localhost:8090';
}

const pbUrl = getPocketBaseUrl();
// Debug log to verify which PocketBase URL is being used
if (process.env.NODE_ENV === 'development') {
  console.log('[PocketBase Proxy] Using URL:', pbUrl);
}

/**
 * Generic PocketBase API proxy for backoffice
 * Examples:
 * - /api/pocketbase/api/collections/events -> PocketBase /api/collections/events
 * - /api/pocketbase/api/collections/events/records/{id} -> PocketBase /api/collections/events/records/{id}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    // Set user auth token if provided (not admin token)
    if (token) {
      try {
        pb.authStore.save(token, null);
        console.log(`[Proxy] Auth token set for request to ${path}`);
      } catch (e) {
        // If token is invalid, continue without auth
        console.warn(`[Proxy] Invalid token, continuing as guest:`, e);
      }
    } else {
      console.log(`[Proxy] No auth token provided for request to ${path}`);
    }

    // Parse the path to determine collection and action
    // Path format: api/collections/{collection} or api/collections/{collection}/records/{id}
    // Also handle: api/files/{collectionId}/{recordId}/{filename}
    const pathParts = path.split('/');

    // Handle file requests: api/files/{collectionId}/{recordId}/{filename}
    if (pathParts[0] === 'api' && pathParts[1] === 'files' && pathParts.length >= 5) {
      let collectionId = pathParts[2];
      const recordId = pathParts[3];
      const filename = decodeURIComponent(pathParts.slice(4).join('/')); // Handle filenames with slashes
      
      // If collectionId is a collection name (not an ID), we need to get the actual collection ID
      // Try to get collection info to resolve name to ID
      try {
        const pb = new PocketBase(pbUrl);
        pb.autoCancellation(false);
        
        if (token) {
          pb.authStore.save(token, null);
        }
        
        // Try to get collection by name if it looks like a name (not a short ID)
        // PocketBase collection IDs are typically short strings like '6jufmvxr0ihyle1'
        // Collection names are longer like 'venues', 'events', etc.
        if (collectionId.length > 10 || !collectionId.match(/^[a-z0-9]+$/)) {
          // This looks like a collection name, try to get the collection
          try {
            const collections = await pb.collections.getFullList();
            const collection = collections.find((c: any) => c.name === collectionId);
            if (collection) {
              collectionId = collection.id;
              console.log(`[Proxy] Resolved collection name "${pathParts[2]}" to ID "${collectionId}"`);
            }
          } catch (e) {
            console.warn(`[Proxy] Could not resolve collection name, using as-is:`, e);
          }
        }
        
        // Build the file URL using PocketBase SDK
        const record = { id: recordId, collectionId };
        const fileUrl = pb.files.getUrl(record, filename);
        
        console.log('[Proxy] Fetching file:', {
          collectionId,
          recordId,
          filename,
          fileUrl,
          hasAuth: !!token,
        });
        
        // Fetch the file with authentication if available
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const fileResponse = await fetch(fileUrl, {
          headers,
        });
        
        if (!fileResponse.ok) {
          console.error('[Proxy] File fetch failed:', {
            status: fileResponse.status,
            statusText: fileResponse.statusText,
            url: fileUrl,
          });
          return NextResponse.json(
            { error: `File not found: ${fileResponse.statusText}` },
            { status: fileResponse.status }
          );
        }
        
        // Get the file content and content type
        const fileBlob = await fileResponse.blob();
        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
        
        console.log('[Proxy] File fetched successfully:', {
          contentType,
          size: fileBlob.size,
        });
        
        // Return the file with proper headers
        return new NextResponse(fileBlob, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error: any) {
        console.error('[Proxy] File fetch error:', {
          error: error.message,
          stack: error.stack,
          collectionId,
          recordId,
          filename,
        });
        return NextResponse.json(
          { error: error.message || 'Failed to fetch file' },
          { status: 500 }
        );
      }
    }

    if (pathParts[0] === 'api' && pathParts[1] === 'collections') {
      const collectionName = pathParts[2];

      if (pathParts.length === 3) {
        // List records: api/collections/{collection}
        // Handle both getList (with page) and getFullList (without page)
        const hasPage = searchParams.has('page');

        if (hasPage) {
          // getList request
          const page = parseInt(searchParams.get('page') || '1');
          const perPage = parseInt(searchParams.get('perPage') || '20');
          const filterParam = searchParams.get('filter');
          const sortParam = searchParams.get('sort');
          const expandParam = searchParams.get('expand');

          const options: any = {};
          if (filterParam && filterParam !== 'undefined' && filterParam !== 'null') {
            options.filter = filterParam;
          }
          if (sortParam && sortParam !== 'undefined' && sortParam !== 'null') {
            options.sort = sortParam;
          }
          if (expandParam && expandParam !== 'undefined' && expandParam !== 'null') {
            options.expand = expandParam.split(',');
          }

          const result = await pb.collection(collectionName).getList(page, perPage, options);
          return NextResponse.json(result);
        } else {
          // getFullList request (no page parameter)
          const filterParam = searchParams.get('filter');
          const sortParam = searchParams.get('sort');
          const expandParam = searchParams.get('expand');

          const options: any = {};
          if (filterParam && filterParam !== 'undefined' && filterParam !== 'null') {
            options.filter = filterParam;
          }
          if (sortParam && sortParam !== 'undefined' && sortParam !== 'null') {
            options.sort = sortParam;
          }
          if (expandParam && expandParam !== 'undefined' && expandParam !== 'null') {
            options.expand = expandParam.split(',');
          }

          try {
            console.log(`[Proxy] getFullList for ${collectionName}`, { 
              filter: options.filter, 
              sort: options.sort,
              expand: options.expand,
              hasAuth: !!token,
            });
            const result = await pb.collection(collectionName).getFullList(options);
            console.log(`[Proxy] getFullList success for ${collectionName}: ${result.length} items`);
            return NextResponse.json({
              items: result,
              totalItems: result.length,
              page: 1,
              perPage: result.length,
              totalPages: 1,
            });
          } catch (error: any) {
            console.error(`[Proxy] getFullList error for ${collectionName}:`, {
              message: error.message,
              status: error.status || error.response?.status,
              data: error.response?.data,
              filter: options.filter,
            });
            // Return empty array instead of error to prevent UI crashes
            return NextResponse.json(
              { 
                error: error.message || 'Request failed', 
                items: [], 
                totalItems: 0, 
                page: 1, 
                perPage: 0, 
                totalPages: 1 
              },
              { status: error.status || 500 }
            );
          }
        }
      } else if (pathParts.length === 5 && pathParts[3] === 'records') {
        // Get single record: api/collections/{collection}/records/{id}
        const recordId = pathParts[4];
        const expandParam = searchParams.get('expand');

        const options: any = {};
        if (expandParam && expandParam !== 'undefined' && expandParam !== 'null') {
          options.expand = expandParam.split(',');
        }

        const result = await pb.collection(collectionName).getOne(recordId, options);
        return NextResponse.json(result);
      } else if (pathParts.length === 4 && pathParts[3] === 'auth-methods') {
        // Get auth methods: api/collections/{collection}/auth-methods
        const result = await pb.collection(collectionName).listAuthMethods();
        return NextResponse.json(result);
      }
    }

    // Fallback to direct fetch for other endpoints (admin APIs, etc.)
    const apiPath = path.startsWith('api/') ? path : `api/${path}`;
    const url = new URL(`/${apiPath}`, pbUrl);
    // Only append valid query parameters
    searchParams.forEach((value, key) => {
      if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') {
        url.searchParams.append(key, value);
      }
    });

    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PocketBase proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Request failed' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    if (token) {
      try {
        pb.authStore.save(token, null);
      } catch {
        // ignore invalid token
      }
    }

    // Check if request is FormData (multipart/form-data)
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');

    let body: any;
    if (isFormData) {
      body = await request.formData();
    } else {
      const bodyText = await request.text();
      body = bodyText ? JSON.parse(bodyText) : {};
    }

    const pathParts = path.split('/');

    if (pathParts[0] === 'api' && pathParts[1] === 'collections') {
      const collectionName = pathParts[2];

      if (pathParts.length === 4 && pathParts[3] === 'records') {
        // Create record: api/collections/{collection}/records
        const result = await pb.collection(collectionName).create(body);
        return NextResponse.json(result);
      } else if (pathParts.length === 4 && pathParts[3] === 'auth-with-oauth2') {
        // OAuth2 auth: api/collections/{collection}/auth-with-oauth2
        const result = await pb.collection(collectionName).authWithOAuth2(body);
        return NextResponse.json(result);
      }
    }

    // Fallback to direct fetch
    const apiPath = path.startsWith('api/') ? path : `api/${path}`;
    const url = new URL(`/${apiPath}`, pbUrl);
    const headers: Record<string, string> = {};
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PocketBase proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Request failed' },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    if (token) {
      try {
        pb.authStore.save(token, null);
      } catch {
        // ignore invalid token
      }
    }

    // Check if request is FormData (multipart/form-data)
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');

    let body: any;
    if (isFormData) {
      body = await request.formData();
    } else {
      const bodyText = await request.text();
      body = bodyText ? JSON.parse(bodyText) : {};
    }

    const pathParts = path.split('/');

    if (pathParts[0] === 'api' && pathParts[1] === 'collections') {
      const collectionName = pathParts[2];

      if (pathParts.length === 5 && pathParts[3] === 'records') {
        // Update record: api/collections/{collection}/records/{id}
        const recordId = pathParts[4];
        
        // Add logging for ticket_types updates
        if (collectionName === 'ticket_types') {
          console.log(`[Proxy] PUT update for ticket_types/${recordId}`);
          console.log(`[Proxy] Update data:`, JSON.stringify(body, null, 2));
          console.log(`[Proxy] Has ticket_type_category:`, body.ticket_type_category !== undefined);
          console.log(`[Proxy] Has table_ids:`, body.table_ids !== undefined);
        }
        
        try {
          const result = await pb.collection(collectionName).update(recordId, body);
          
          if (collectionName === 'ticket_types') {
            console.log(`[Proxy] Update successful for ticket_types/${recordId}`);
            console.log(`[Proxy] Updated record:`, {
              id: result.id,
              ticket_type_category: result.ticket_type_category,
              table_ids: result.table_ids,
            });
          }
          
          return NextResponse.json(result);
        } catch (updateError: any) {
          console.error(`[Proxy] Update failed for ${collectionName}/${recordId}:`, updateError);
          console.error(`[Proxy] Error details:`, {
            message: updateError.message,
            status: updateError.status,
            response: updateError.response?.data,
          });
          throw updateError;
        }
      }
    }

    // Fallback to direct fetch
    const apiPath = path.startsWith('api/') ? path : `api/${path}`;
    const url = new URL(`/${apiPath}`, pbUrl);
    const headers: Record<string, string> = {};
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PocketBase proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Request failed' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    if (token) {
      try {
        pb.authStore.save(token, null);
      } catch {
        // ignore invalid token
      }
    }

    const pathParts = path.split('/');

    if (pathParts[0] === 'api' && pathParts[1] === 'collections') {
      const collectionName = pathParts[2];

      if (pathParts.length === 5 && pathParts[3] === 'records') {
        // Delete record: api/collections/{collection}/records/{id}
        const recordId = pathParts[4];
        await pb.collection(collectionName).delete(recordId);
        return new NextResponse(null, { status: 204 });
      }
    }

    // Fallback to direct fetch
    const apiPath = path.startsWith('api/') ? path : `api/${path}`;
    const url = new URL(`/${apiPath}`, pbUrl);
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers,
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PocketBase proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Request failed' },
      { status: error.status || 500 }
    );
  }
}
