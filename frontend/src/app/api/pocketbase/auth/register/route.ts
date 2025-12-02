import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://13.201.90.240:8092';

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

