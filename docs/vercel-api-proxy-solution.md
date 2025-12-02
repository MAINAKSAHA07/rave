# Vercel API Proxy Solution (No Domain Required)

## ✅ Solution Implemented

Since you're using Vercel's free hosting without a custom domain, I've implemented an **API proxy solution** that routes all PocketBase requests through Vercel's HTTPS endpoints. This eliminates Mixed Content errors without requiring a domain or SSL certificates.

## How It Works

**Before (Mixed Content Error):**
```
Browser (HTTPS) → PocketBase (HTTP) ❌ Blocked
```

**After (API Proxy):**
```
Browser (HTTPS) → Vercel API Route (HTTPS) → PocketBase (HTTP, server-to-server) ✅
```

## What Was Changed

### 1. Created API Proxy Routes

**Frontend & Backoffice:**
- `/api/pocketbase/auth/login` - User authentication
- `/api/pocketbase/auth/register` - User registration  
- `/api/pocketbase/[...path]` - Generic proxy for all PocketBase API calls

### 2. Updated PocketBase Client

Modified `frontend/src/lib/pocketbase.ts` and `backoffice/src/lib/pocketbase.ts` to:
- Use API proxy routes on client-side (browser)
- Use direct PocketBase connection on server-side
- Maintain same API interface (no code changes needed in your components)

### 3. Updated Environment Variables

Changed from `NEXT_PUBLIC_POCKETBASE_URL` (client-exposed) to `POCKETBASE_URL` (server-side only) for better security.

## Next Steps: Update Vercel Environment Variables

### For Frontend Project (`rave-eta`)

1. Go to Vercel Dashboard → Your Frontend Project → Settings → Environment Variables

2. **Remove** (if exists):
   - `NEXT_PUBLIC_POCKETBASE_URL`

3. **Add/Update**:
   ```
   POCKETBASE_URL = http://13.201.90.240:8092
   ```
   (This is server-side only, not exposed to client)

4. **Keep**:
   ```
   NEXT_PUBLIC_BACKEND_URL = http://13.201.90.240:3001
   NEXT_PUBLIC_RAZORPAY_KEY_ID = (your key if needed)
   ```

### For Backoffice Project (`ravebackoffice`)

1. Go to Vercel Dashboard → Your Backoffice Project → Settings → Environment Variables

2. **Remove** (if exists):
   - `NEXT_PUBLIC_POCKETBASE_URL`

3. **Add/Update**:
   ```
   POCKETBASE_URL = http://13.201.90.240:8092
   ```

4. **Keep**:
   ```
   NEXT_PUBLIC_BACKEND_URL = http://13.201.90.240:3001
   ```

### 5. Redeploy Both Projects

After updating environment variables:
- Go to **Deployments** tab
- Click **⋯** menu on latest deployment
- Select **Redeploy**

Or push a new commit to trigger automatic redeploy.

## Testing

After redeployment:

1. **Test Frontend**: https://rave-eta.vercel.app
   - Try logging in
   - Browse events
   - Check browser console - no Mixed Content errors for PocketBase!

2. **Test Backoffice**: https://ravebackoffice.vercel.app
   - Try logging in
   - Check browser console - no Mixed Content errors for PocketBase!

## Remaining Issue: Backend API

⚠️ **Note**: The `NEXT_PUBLIC_BACKEND_URL` will still have Mixed Content issues if it's HTTP. You have two options:

### Option A: Create API Proxy for Backend (Recommended)
Similar to PocketBase, create API routes that proxy backend requests. This requires:
- Creating `/api/backend/[...path]` routes
- Updating backend API calls to use the proxy

### Option B: Set Up HTTPS for Backend
Use the HTTPS setup script (requires domain):
```bash
./scripts/setup-https-vercel.sh api.yourdomain.com backend.yourdomain.com
```

## Benefits of This Solution

✅ **No domain required** - Works with free Vercel hosting  
✅ **No Mixed Content errors** - All requests go through HTTPS  
✅ **Secure** - PocketBase URL not exposed to client  
✅ **Same code** - Your existing components work without changes  
✅ **Free** - No additional costs  

## Files Modified

- `frontend/src/lib/pocketbase.ts` - Updated to use API proxy
- `frontend/src/app/api/pocketbase/**` - New API proxy routes
- `backoffice/src/lib/pocketbase.ts` - Updated to use API proxy  
- `backoffice/src/app/api/pocketbase/**` - New API proxy routes
- `frontend/next.config.js` - Updated env vars
- `backoffice/next.config.js` - Updated env vars

## Troubleshooting

### Still seeing Mixed Content errors?

1. ✅ Verify you removed `NEXT_PUBLIC_POCKETBASE_URL` from Vercel
2. ✅ Verify `POCKETBASE_URL` is set (server-side only)
3. ✅ Redeploy after changing environment variables
4. ✅ Clear browser cache and hard refresh (Cmd+Shift+R)

### API calls failing?

- Check Vercel function logs in dashboard
- Verify `POCKETBASE_URL` is correct
- Check that PocketBase is accessible at `http://13.201.90.240:8092`

### OAuth (Google Login) issues?

OAuth still uses direct PocketBase connection (bypasses proxy) because it requires redirects. This is expected and should work, but may show warnings in development.

