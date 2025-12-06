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
        const result = await pb.collection(collectionName).update(recordId, body);
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
