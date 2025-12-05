import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

// Priority: AWS_POCKETBASE_URL (for production/AWS) > POCKETBASE_URL (for local/other) > localhost default
// This allows the same code to work in both local and AWS environments
function getPocketBaseUrl(): string {
  // Check for AWS URL first (for AWS deployments)
  if (process.env.AWS_POCKETBASE_URL) {
    return process.env.AWS_POCKETBASE_URL;
  }
  
  // Check for explicit POCKETBASE_URL (for local or custom setups)
  if (process.env.POCKETBASE_URL) {
    return process.env.POCKETBASE_URL;
  }
  
  // Default to localhost for local development
  return 'http://localhost:8090';
}

const pbUrl = getPocketBaseUrl();

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone } = await request.json();

    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { error: 'Email, password, name, and phone are required' },
        { status: 400 }
      );
    }

    const pb = new PocketBase(pbUrl);
    
    // Create user
    const record = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name,
      phone,
      emailVisibility: true,
    });

    // Auto-login after registration
    let authData = null;
    try {
      authData = await pb.collection('users').authWithPassword(email, password);
    } catch (loginError) {
      console.warn('Auto-login after registration failed:', loginError);
    }

    return NextResponse.json({
      record: authData?.record || record,
      token: authData?.token || null,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: error.status || 400 }
    );
  }
}
