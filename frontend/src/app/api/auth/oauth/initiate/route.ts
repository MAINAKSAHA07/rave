import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import crypto from 'crypto';

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

const pbUrl = getPocketBaseUrl();

// Generate PKCE code verifier and challenge
function generateCodeVerifier(): string {
  const length = 64;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
  const randomBytes = crypto.randomBytes(length);
  let verifier = '';
  for (let i = 0; i < length; i++) {
    verifier += charset[randomBytes[i] % charset.length];
  }
  return verifier;
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, redirectUrl, collection = 'customers' } = body;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    // Get auth methods to check if provider is available
    const authMethods = await pb.collection(collection).listAuthMethods();
    
    if (!authMethods.authProviders || !Array.isArray(authMethods.authProviders)) {
      return NextResponse.json(
        { error: 'OAuth providers not available. Please configure OAuth providers in PocketBase admin settings.' },
        { status: 400 }
      );
    }

    const providerConfig = authMethods.authProviders.find((p: any) => p.name === provider) as any;
    
    if (!providerConfig) {
      const availableProviders = authMethods.authProviders.map((p: any) => p.name).join(', ');
      return NextResponse.json(
        { 
          error: `OAuth provider "${provider}" is not configured. Available providers: ${availableProviders || 'none'}. Please configure Google OAuth in PocketBase admin settings (Settings > Auth Providers).`
        },
        { status: 400 }
      );
    }

    // Validate client ID exists
    const clientId = (providerConfig as any).clientId || '';
    if (!clientId || clientId.trim() === '') {
      return NextResponse.json(
        { 
          error: `Google OAuth Client ID is not configured. Please configure it in PocketBase admin settings (Settings > Auth Providers > Google).`
        },
        { status: 400 }
      );
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(32).toString('base64url');

    // Build OAuth URL with PKCE
    const finalRedirectUrl = redirectUrl || `${request.nextUrl.origin}/auth/callback`;
    
    const authUrl = new URL((providerConfig as any).authUrl);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', finalRedirectUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', (providerConfig as any).scope || 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return NextResponse.json({
      url: authUrl.toString(),
      state,
      codeVerifier,
    });
  } catch (error: any) {
    // Provide detailed error message for OAuth configuration issues
    const errorMessage = error.message || 'Failed to initiate OAuth flow';
    
    if (errorMessage.includes('invalid_client') || errorMessage.includes('client_id')) {
      return NextResponse.json(
        { 
          error: 'Google OAuth Client ID is invalid or not found. Please verify: 1) The Client ID is correct in PocketBase settings, 2) The redirect URI matches your Google Cloud Console configuration, 3) The OAuth consent screen is properly configured.',
          details: 'Error 401: invalid_client - The OAuth client was not found in Google Cloud Console.'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
