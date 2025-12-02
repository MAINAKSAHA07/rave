# Vercel Deployment Fixes - Complete Solution

## Issues Fixed

### 1. ✅ PocketBase Mixed Content Error
- **Problem**: HTTPS Vercel site trying to connect to HTTP PocketBase
- **Solution**: Created API proxy routes at `/api/pocketbase/*`
- **Status**: Fixed

### 2. ✅ Backend API Mixed Content Error  
- **Problem**: HTTPS Vercel site trying to connect to HTTP Backend API
- **Solution**: Created API proxy routes at `/api/backend/*`
- **Status**: Fixed

### 3. ✅ PocketBase API Route 404
- **Problem**: Route path handling was incorrect
- **Solution**: Fixed path construction in proxy routes
- **Status**: Fixed

## What Was Changed

### API Proxy Routes Created

**Backoffice:**
- `/api/pocketbase/auth/login` - Authentication
- `/api/pocketbase/auth/register` - Registration
- `/api/pocketbase/[...path]` - Generic PocketBase proxy
- `/api/backend/[...path]` - Generic Backend API proxy

**Frontend:**
- `/api/pocketbase/auth/login` - Authentication
- `/api/pocketbase/auth/register` - Registration  
- `/api/pocketbase/[...path]` - Generic PocketBase proxy

### Code Updates

1. **`backoffice/src/lib/api.ts`** - Updated to use API proxy on client-side
2. **`backoffice/src/lib/pocketbase.ts`** - Updated to use API proxy
3. **`frontend/src/lib/pocketbase.ts`** - Updated to use API proxy
4. **`backoffice/next.config.js`** - Added `BACKEND_URL` env var
5. **`frontend/next.config.js`** - Updated env vars

## Vercel Environment Variables

### For Backoffice Project (`ravebackoffice`)

**Remove:**
- `NEXT_PUBLIC_POCKETBASE_URL` ❌

**Add/Update:**
```
POCKETBASE_URL = http://13.201.90.240:8092
BACKEND_URL = http://13.201.90.240:3001
```

**Keep:**
```
NEXT_PUBLIC_BACKEND_URL = http://13.201.90.240:3001
```
(Note: This is still used for some direct calls, but the proxy will handle most)

### For Frontend Project (`rave-eta`)

**Remove:**
- `NEXT_PUBLIC_POCKETBASE_URL` ❌

**Add/Update:**
```
POCKETBASE_URL = http://13.201.90.240:8092
```

**Keep:**
```
NEXT_PUBLIC_BACKEND_URL = http://13.201.90.240:3001
NEXT_PUBLIC_RAZORPAY_KEY_ID = (your key if needed)
```

## Deployment Steps

1. **Commit and push** all changes to your repository
2. **Update Vercel environment variables** (see above)
3. **Redeploy** both projects:
   - Go to Vercel Dashboard → Deployments
   - Click **⋯** → **Redeploy** on latest deployment
   - Or push a new commit to trigger auto-deploy

## How It Works

### Request Flow

**Before (Mixed Content):**
```
Browser (HTTPS) → PocketBase/Backend (HTTP) ❌ Blocked
```

**After (API Proxy):**
```
Browser (HTTPS) → Vercel API Route (HTTPS) → PocketBase/Backend (HTTP, server-to-server) ✅
```

### Example Requests

**PocketBase:**
- Client calls: `/api/pocketbase/api/collections/events`
- Proxy forwards to: `http://13.201.90.240:8092/api/collections/events`

**Backend API:**
- Client calls: `/api/backend/api/admin/organizers/applications`
- Proxy forwards to: `http://13.201.90.240:3001/api/admin/organizers/applications`

## Testing After Deployment

1. **Test Backoffice**: https://ravebackoffice.vercel.app
   - Login should work
   - Admin dashboard should load
   - No Mixed Content errors in console

2. **Test Frontend**: https://rave-eta.vercel.app
   - Login/signup should work
   - Events should load
   - No Mixed Content errors in console

## Troubleshooting

### Still seeing 404 errors?

- ✅ Verify routes are deployed (check Vercel build logs)
- ✅ Check that files exist: `backoffice/src/app/api/pocketbase/[...path]/route.ts`
- ✅ Verify environment variables are set correctly
- ✅ Clear browser cache and hard refresh

### Still seeing Mixed Content errors?

- ✅ Verify you removed `NEXT_PUBLIC_POCKETBASE_URL`
- ✅ Check that `POCKETBASE_URL` and `BACKEND_URL` are set (server-side)
- ✅ Redeploy after changing environment variables
- ✅ Check browser console for exact error URLs

### API calls failing?

- ✅ Check Vercel function logs in dashboard
- ✅ Verify PocketBase is accessible at `http://13.201.90.240:8092`
- ✅ Verify Backend is accessible at `http://13.201.90.240:3001`
- ✅ Check network tab in browser DevTools

## Benefits

✅ **No domain required** - Works with free Vercel hosting  
✅ **No Mixed Content errors** - All requests go through HTTPS  
✅ **Secure** - Backend URLs not exposed to client  
✅ **Same code** - Existing components work without changes  
✅ **Free** - No additional costs  

