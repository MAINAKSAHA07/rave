import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

// Use environment variable from next.config.js, with fallback
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
 * Generic PocketBase API proxy
 * Routes: /api/pocketbase/api/collections/events -> PocketBase /api/collections/events
 * Uses PocketBase SDK instead of fetch to properly handle authentication and rules
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

    // Use PocketBase SDK which properly handles collection rules
    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    // Set user auth token if provided (not admin token)
    if (token) {
      // Try to set as user token (not admin)
      try {
      pb.authStore.save(token, null);
      } catch (e) {
        // If token is invalid, continue without auth
        console.warn('[Proxy] Invalid token, continuing as guest');
      }
    }

    // Parse the path to determine collection and action
    // Path format: api/collections/{collection} or api/collections/{collection}/records/{id}
    const pathParts = path.split('/');
    
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
          const filter = searchParams.get('filter') || undefined;
          const sortParam = searchParams.get('sort');
          const expandParam = searchParams.get('expand');
          
          // Only include sort and expand if they're valid (not undefined/null strings)
          const sort = sortParam && sortParam !== 'undefined' && sortParam !== 'null' ? sortParam : undefined;
          const expand = expandParam && expandParam !== 'undefined' && expandParam !== 'null' ? expandParam : undefined;

          const options: any = {
            ...(filter && { filter }),
            ...(sort && { sort }),
            ...(expand && { expand }),
          };

          const result = await pb.collection(collectionName).getList(page, perPage, options);

          return NextResponse.json(result);
        } else {
          // getFullList request (no page parameter)
          const filterParam = searchParams.get('filter');
          const sortParam = searchParams.get('sort');
          const expandParam = searchParams.get('expand');
          
          // Build options object, only including valid (non-empty, non-undefined) values
          const options: any = {};
          if (filterParam && filterParam !== 'undefined' && filterParam !== 'null') {
            options.filter = filterParam;
          }
          if (sortParam && sortParam !== 'undefined' && sortParam !== 'null') {
            options.sort = sortParam;
          }
          if (expandParam && expandParam !== 'undefined' && expandParam !== 'null') {
            options.expand = expandParam;
          }
          const fieldsParam = searchParams.get('fields');
          if (fieldsParam && fieldsParam !== 'undefined' && fieldsParam !== 'null') {
            options.fields = fieldsParam;
          }

          try {
            // Log the options being sent to PocketBase for debugging
            if (collectionName === 'ticket_types' || collectionName === 'tables') {
              console.log(`[Proxy] getFullList for ${collectionName} with options:`, JSON.stringify(options, null, 2));
            }
            const result = await pb.collection(collectionName).getFullList(options);
            // Log the result to see what fields are returned
            if (collectionName === 'ticket_types' && result.length > 0) {
              console.log(`[Proxy] getFullList result for ticket_types - first record fields:`, Object.keys(result[0]));
              console.log(`[Proxy] First record has ticket_type_category:`, result[0].ticket_type_category !== undefined);
              console.log(`[Proxy] First record has table_ids:`, result[0].table_ids !== undefined);
            }
            if (collectionName === 'tables') {
              console.log(`[Proxy] getFullList result for tables: ${result.length} tables found`);
              if (result.length > 0) {
                console.log(`[Proxy] First table:`, {
                  id: result[0].id,
                  name: result[0].name,
                  venue_id: result[0].venue_id,
                  section: result[0].section,
                });
              }
            }
            return NextResponse.json({ items: result, totalItems: result.length, page: 1, perPage: result.length, totalPages: 1 });
          } catch (error: any) {
            console.error(`[Proxy] getFullList error for ${collectionName}:`, error);
            console.error('Options:', JSON.stringify(options, null, 2));
            if (error.response?.data) {
              console.error('Error details:', JSON.stringify(error.response.data, null, 2));
            }
            return NextResponse.json(
              { error: error.message || 'Request failed', details: error.response?.data },
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
          // Expand can be comma-separated string or array
          options.expand = expandParam;
        }
        
        try {
          console.log(`[Proxy] Fetching ${collectionName}/${recordId}`, { expand: options.expand });
          const result = await pb.collection(collectionName).getOne(recordId, options);
          console.log(`[Proxy] Successfully fetched ${collectionName}/${recordId}`);
          return NextResponse.json(result);
        } catch (error: any) {
          // If record not found, return proper 404
          if (error.status === 404 || error.response?.status === 404) {
            console.error(`[Proxy] 404 - ${collectionName}/${recordId} not found`);
            return NextResponse.json(
              { code: 404, message: "The requested resource wasn't found.", data: {} },
              { status: 404 }
            );
          }
          // Log other errors for debugging
          console.error(`[Proxy] Error fetching ${collectionName}/${recordId}:`, {
            message: error.message,
            status: error.status || error.response?.status,
            data: error.response?.data,
          });
          // Re-throw other errors to be handled by outer catch
          throw error;
        }
      } else if (pathParts.length === 4 && pathParts[3] === 'auth-methods') {
        // Get auth methods: api/collections/{collection}/auth-methods
        const result = await pb.collection(collectionName).listAuthMethods();
        return NextResponse.json(result);
      }
    }

    // Fallback to direct fetch for other endpoints
    const apiPath = path.startsWith('api/') ? path : `api/${path}`;
    const url = new URL(`/${apiPath}`, pbUrl);
    // Only append valid query parameters (skip undefined, null, or empty string values)
    searchParams.forEach((value, key) => {
      // Skip undefined, null, or empty string values
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
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    if (token) {
      try {
      pb.authStore.save(token, null);
      } catch (e) {
        console.warn('[Proxy] Invalid token, continuing as guest');
      }
    }

    // Parse path for collection operations
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

    // Fallback to fetch for other endpoints
    const apiPath = path.startsWith('api/') ? path : `api/${path}`;
    const url = new URL(`/${apiPath}`, pbUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    if (token) {
      try {
      pb.authStore.save(token, null);
      } catch (e) {
        console.warn('[Proxy] Invalid token, continuing as guest');
      }
    }

    // Parse path for collection operations
    const pathParts = path.split('/');
    
    if (pathParts[0] === 'api' && pathParts[1] === 'collections') {
      const collectionName = pathParts[2];
      
      if (pathParts.length === 5 && pathParts[3] === 'records') {
        // Update record: api/collections/{collection}/records/{id}
        const recordId = pathParts[4];
        const result = await pb.collection(collectionName).update(recordId, body);
        return NextResponse.json(result);
      }
    }

    // Fallback to fetch for other endpoints
    const apiPath = path.startsWith('api/') ? path : `api/${path}`;
    const url = new URL(`/${apiPath}`, pbUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
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
      } catch (e) {
        console.warn('[Proxy] Invalid token, continuing as guest');
      }
    }

    // Parse path for collection operations
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

    // Fallback to fetch for other endpoints
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

