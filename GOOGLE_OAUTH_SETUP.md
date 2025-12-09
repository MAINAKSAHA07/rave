# Google OAuth Setup Guide

## Error: "The given origin is not allowed for the given client ID"

This error occurs when your application's origin (domain/URL) is not authorized in Google Cloud Console.

## How to Fix

### Step 1: Identify Your Current Origin

Check the browser console or the error message to see what origin is being used. Common origins:
- `http://localhost:3000` (local development)
- `http://localhost:3001` (local development on different port)
- `http://13.201.90.240:3000` (AWS server)
- `https://yourdomain.com` (production domain)

### Step 2: Add Authorized Origins in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Find your OAuth 2.0 Client ID (starts with `1010543666744-...`)
5. Click **Edit** (pencil icon)

### Step 3: Add Authorized JavaScript Origins

In the **Authorized JavaScript origins** section, add:
- `http://localhost:3000` (for local development)
- `http://localhost:3001` (if using different port)
- `http://13.201.90.240:3000` (for AWS server)
- `https://yourdomain.com` (for production)

**Important:** 
- Include the protocol (`http://` or `https://`)
- Include the port number if not using standard ports (80 for http, 443 for https)
- Do NOT include trailing slashes
- Do NOT include paths (e.g., `/login`)

### Step 4: Add Authorized Redirect URIs

In the **Authorized redirect URIs** section, add:
- `http://localhost:3000/auth/callback` (for local development)
- `http://localhost:3001/auth/callback` (if using different port)
- `http://13.201.90.240:3000/auth/callback` (for AWS server)
- `https://yourdomain.com/auth/callback` (for production)

**Also add PocketBase OAuth callback:**
- `http://13.201.90.240:8092/api/oauth2/google/callback` (for PocketBase OAuth)

### Step 5: Save and Wait

1. Click **Save**
2. Wait 1-2 minutes for changes to propagate
3. Refresh your application and try again

## Quick Checklist

- [ ] Added JavaScript origin: `http://localhost:3000` (or your current origin)
- [ ] Added redirect URI: `http://localhost:3000/auth/callback` (or your current origin + `/auth/callback`)
- [ ] Added PocketBase redirect URI: `http://13.201.90.240:8092/api/oauth2/google/callback`
- [ ] Saved changes in Google Cloud Console
- [ ] Waited 1-2 minutes for propagation
- [ ] Cleared browser cache if needed

## Finding Your Current Origin

To find the exact origin your app is using:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `window.location.origin`
4. Press Enter
5. Copy the value shown (e.g., `http://localhost:3000`)

Add this exact value to **Authorized JavaScript origins** in Google Cloud Console.

## Common Issues

### Issue: Still getting 403 error after adding origin
**Solution:** 
- Clear browser cache
- Wait 2-3 minutes for Google's changes to propagate
- Make sure you added the exact origin (including port if present)
- Check that you're editing the correct OAuth client ID

### Issue: Works locally but not on AWS
**Solution:**
- Add the AWS origin: `http://13.201.90.240:3000` (or your AWS frontend port)
- Make sure the port matches your frontend server port

### Issue: Redirect URI mismatch
**Solution:**
- Make sure redirect URI includes the full path: `/auth/callback`
- Check that the protocol matches (http vs https)
- Verify the port number is correct

## Environment Variables

Make sure these are set in your `.env` file:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1010543666744-...
# or
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=1010543666744-...
```

## Need Help?

If you're still having issues:
1. Check the browser console for the exact error message
2. Verify the client ID matches in both `.env` and Google Cloud Console
3. Ensure all origins and redirect URIs are added correctly
4. Wait a few minutes after making changes in Google Cloud Console
