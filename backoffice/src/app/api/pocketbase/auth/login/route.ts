import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://13.201.90.240:8092';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const pb = new PocketBase(pbUrl);
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
