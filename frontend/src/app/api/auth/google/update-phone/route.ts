import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

function getPocketBaseUrl(): string {
  if (process.env.AWS_POCKETBASE_URL) {
    return process.env.AWS_POCKETBASE_URL;
  }
  if (process.env.NEXT_PUBLIC_POCKETBASE_URL && process.env.NEXT_PUBLIC_POCKETBASE_URL.includes('13.201.90.240')) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL;
  }
  if (process.env.POCKETBASE_URL) {
    return process.env.POCKETBASE_URL;
  }
  if (process.env.NEXT_PUBLIC_POCKETBASE_URL) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL;
  }
  return 'http://localhost:8090';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, phone } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token is required' },
        { status: 401 }
      );
    }

    if (!phone || phone.trim() === '') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const pbUrl = getPocketBaseUrl();
    const pb = new PocketBase(pbUrl);
    
    // Set the auth token
    pb.authStore.save(token, null);
    
    // Get current user
    const user = pb.authStore.model;
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Update phone number
    const updated = await pb.collection('customers').update(user.id, {
      phone: phone.trim(),
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update phone number' },
      { status: 500 }
    );
  }
}



