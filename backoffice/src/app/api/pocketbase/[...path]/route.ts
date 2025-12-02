import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://13.201.90.240:8092';

/**
 * Generic PocketBase API proxy
 * Routes: /api/pocketbase/api/collections/events -> PocketBase /api/collections/events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    
    // Set auth token if provided
    if (token) {
      pb.authStore.save(token, null);
    }

    // Build the full URL
    const url = new URL(`/api/${path}`, pbUrl);
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Make request to PocketBase
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
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
      { status: 500 }
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    
    if (token) {
      pb.authStore.save(token, null);
    }

    const url = new URL(`/api/${path}`, pbUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
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
      { status: 500 }
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    
    if (token) {
      pb.authStore.save(token, null);
    }

    const url = new URL(`/api/${path}`, pbUrl);
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
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
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const pb = new PocketBase(pbUrl);
    
    if (token) {
      pb.authStore.save(token, null);
    }

    const url = new URL(`/api/${path}`, pbUrl);
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
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
      { status: 500 }
    );
  }
}
