import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { OAuth2Client } from 'google-auth-library';

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
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential is required' },
        { status: 400 }
      );
    }

    // Verify Google token
    const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return NextResponse.json(
        { error: 'Google Client ID not configured' },
        { status: 500 }
      );
    }

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    const email = payload.email;
    const name = payload.name || email?.split('@')[0] || '';
    const picture = payload.picture || '';

    if (!email) {
      return NextResponse.json(
        { error: 'Email not provided by Google' },
        { status: 400 }
      );
    }

    // Connect to PocketBase as admin
    const pbUrl = getPocketBaseUrl();
    const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }
    
    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    // Check if customer exists (by email)
    let customer;
    let tempPassword: string;
    
    try {
      const customers = await adminPb.collection('customers').getList(1, 1, {
        filter: `email = "${email}"`,
      });

      if (customers.items.length > 0) {
        customer = customers.items[0];
        // For existing customers, generate a new temp password for Google auth
        tempPassword = `google_${Math.random().toString(36).slice(-16)}`;
        
        // Update customer with Google data (update name if missing or different)
        const updateData: any = {
          password: tempPassword,
          passwordConfirm: tempPassword,
        };
        
        // Update name if it's missing or empty, or if Google provides a better name
        if (!customer.name || customer.name.trim() === '' || customer.name === customer.email?.split('@')[0]) {
          if (name && name.trim() !== '') {
            updateData.name = name;
          }
        }
        
        // Update password to allow authentication
        await adminPb.collection('customers').update(customer.id, updateData);
      } else {
        // Check if email is already used in users collection (backoffice)
        const existingUsers = await adminPb.collection('users').getList(1, 1, {
          filter: `email = "${email}"`,
        });

        if (existingUsers.items.length > 0) {
          return NextResponse.json(
            { error: 'This email is already registered as a backoffice user. Please use a different email or contact support.' },
            { status: 400 }
          );
        }

        // Create new customer with a temporary password
        tempPassword = `google_${Math.random().toString(36).slice(-16)}`;
        
        customer = await adminPb.collection('customers').create({
          email,
          password: tempPassword,
          passwordConfirm: tempPassword,
          name: name || email.split('@')[0],
          phone: '', // Phone is optional, can be filled later
          emailVisibility: true, // Make email visible for the user
        });
      }
    } catch (error: any) {
      // Check if error is due to duplicate email
      if (error.response?.data?.data?.email) {
        return NextResponse.json(
          { error: 'This email is already registered. Please try logging in.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to authenticate customer', details: error.message },
        { status: 500 }
      );
    }

    // Authenticate as the customer to get PocketBase token
    const customerPb = new PocketBase(pbUrl);
    await customerPb.collection('customers').authWithPassword(email, tempPassword);

    // Return PocketBase auth token and customer data
    return NextResponse.json({
      token: customerPb.authStore.token,
      record: customerPb.authStore.record,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone || '',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
