# Environment Variables - Google OAuth Placeholders

## Added Placeholders

The following placeholders have been added to `.env.example` for Google OAuth login:

```env
# ============================================
# Google OAuth Configuration (for Customer Login)
# ============================================
# Get these from Google Cloud Console: https://console.cloud.google.com/
# 1. Create OAuth 2.0 Client ID
# 2. Add redirect URI: http://127.0.0.1:8092/api/oauth2-redirect (dev)
# 3. Configure in PocketBase Admin UI: Settings > Auth providers > Google
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here
```

## How to Add to Your .env File

### Option 1: Manual Addition

Add the following to your root `.env` file:

```env
# Google OAuth Configuration (for Customer Login)
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here
```

### Option 2: Use the Script

Run the helper script to automatically add placeholders:

```bash
./scripts/add-env-placeholders.sh
```

## Getting Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API:**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - Development: `http://127.0.0.1:8092/api/oauth2-redirect`
     - Production: `https://your-domain.com/api/oauth2-redirect`
   - Save and copy the Client ID and Client Secret

4. **Update .env file:**
   ```env
   GOOGLE_OAUTH_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
   ```

5. **Configure in PocketBase:**
   - Open PocketBase Admin UI: `http://127.0.0.1:8092/_/`
   - Go to Settings > Auth providers
   - Enable Google OAuth
   - Enter the same Client ID and Client Secret
   - Set redirect URL: `http://127.0.0.1:8092/api/oauth2-redirect`

## Testing

After configuration:

1. Restart all services (backend, frontend)
2. Visit `/login` on the frontend
3. Click "Continue with Google"
4. You should be redirected to Google login
5. After authentication, you'll be redirected back to the app

## Notes

- These credentials are for **customer login only**
- The OAuth flow is handled by PocketBase
- The frontend just initiates the OAuth request
- Make sure PocketBase is accessible for OAuth redirects to work

