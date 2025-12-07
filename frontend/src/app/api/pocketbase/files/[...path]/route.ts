import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

// Use environment variable from next.config.js, with fallback
function getPocketBaseUrl(): string {
  // Check for AWS URL first (for production/AWS)
  if (process.env.AWS_POCKETBASE_URL) {
    return process.env.AWS_POCKETBASE_URL;
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

/**
 * File proxy route to serve PocketBase files over HTTPS
 * Routes: /api/pocketbase/files/{collectionId}/{recordId}/{filename} -> PocketBase /api/files/{collectionId}/{recordId}/{filename}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams;
    const authHeader = request.headers.get('authorization');
    
    // Build the full PocketBase file URL
    const fileUrl = new URL(`/api/files/${path}`, pbUrl);
    
    // Forward query parameters
    searchParams.forEach((value, key) => {
      if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') {
        fileUrl.searchParams.append(key, value);
      }
    });

    // Fetch the file from PocketBase
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(fileUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: response.status }
      );
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Get the file data as a blob
    const blob = await response.blob();

    // Return the file with proper headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('PocketBase file proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load file' },
      { status: 500 }
    );
  }
}

