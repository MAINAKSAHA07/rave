import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

// Priority: POCKETBASE_URL (for local) > AWS_POCKETBASE_URL (for AWS) > localhost default
// For local development, POCKETBASE_URL takes priority
// For AWS deployment, set AWS_POCKETBASE_URL explicitly
function getPocketBaseUrl(): string {
  // For local development, prioritize POCKETBASE_URL
  // This ensures local .env settings work correctly
  if (process.env.POCKETBASE_URL && !process.env.AWS_POCKETBASE_URL) {
    return process.env.POCKETBASE_URL;
  }
  
  // Check for AWS URL (only if explicitly set for AWS deployment)
  if (process.env.AWS_POCKETBASE_URL) {
    return process.env.AWS_POCKETBASE_URL;
  }
  
  // Check for explicit POCKETBASE_URL as fallback
  if (process.env.POCKETBASE_URL) {
    return process.env.POCKETBASE_URL;
  }
  
  // Default to localhost for local development
  return 'http://localhost:8090';
}

const pbUrl = getPocketBaseUrl();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get PocketBase URL dynamically to ensure env vars are loaded
    const dynamicPbUrl = getPocketBaseUrl();
    if (!dynamicPbUrl) {
      console.error('PocketBase URL is not configured');
      return NextResponse.json(
        { error: 'PocketBase URL is not configured' },
        { status: 500 }
      );
    }

    const pb = new PocketBase(dynamicPbUrl);
    const authData = await pb.collection('users').authWithPassword(email, password);

    // Return auth data with token
    return NextResponse.json({
      token: authData.token,
      record: authData.record,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: error.status || 400 }
    );
  }
}
