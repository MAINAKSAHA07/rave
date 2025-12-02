# Google OAuth Setup for PocketBase

This guide explains how to configure Google OAuth authentication for the customer-facing frontend.

## Prerequisites

1. Google Cloud Console account
2. PocketBase admin access
3. Domain or localhost setup for OAuth redirects

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For development: `http://127.0.0.1:8092/api/oauth2-redirect`
     - For production: `https://your-domain.com/api/oauth2-redirect`
   - Save the Client ID and Client Secret

## Step 2: Configure PocketBase

1. Open PocketBase Admin UI: `http://127.0.0.1:8092/_/`
2. Go to Settings > Auth providers
3. Enable Google OAuth:
   - Provider: Google
   - Client ID: (from Google Cloud Console)
   - Client Secret: (from Google Cloud Console)
   - Redirect URL: `http://127.0.0.1:8092/api/oauth2-redirect` (development)
   - Save settings

## Step 3: Update Environment Variables

Add to your `.env` file (if needed for backend):

```env
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

## Step 4: Test OAuth Flow

1. Navigate to `/login` on the frontend
2. Click "Continue with Google"
3. You should be redirected to Google login
4. After authentication, you'll be redirected back to the app

## Troubleshooting

### Common Issues:

1. **Redirect URI mismatch**: Ensure the redirect URI in Google Console exactly matches PocketBase's redirect URL
2. **CORS errors**: Make sure PocketBase allows requests from your frontend domain
3. **OAuth popup blocked**: Some browsers block popups - use full redirect instead

### Development Setup:

For local development, you can use:
- Redirect URI: `http://127.0.0.1:8092/api/oauth2-redirect`
- Authorized JavaScript origins: `http://127.0.0.1:8092`

### Production Setup:

For production:
- Redirect URI: `https://your-domain.com/api/oauth2-redirect`
- Authorized JavaScript origins: `https://your-domain.com`
- Update PocketBase settings accordingly

## Notes

- PocketBase handles the OAuth flow automatically
- Users created via Google OAuth will have `role: 'customer'` by default
- The OAuth callback is handled at `/auth/callback` in the frontend
- Make sure PocketBase is accessible from the internet for production OAuth to work

