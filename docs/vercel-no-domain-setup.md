# Vercel Deployment Without Domain (API Proxy Solution)

Since you're using Vercel's free hosting without a custom domain, we've set up an **API proxy solution** to avoid Mixed Content errors. This routes all PocketBase requests through Vercel's HTTPS endpoints.

## How It Works

Instead of making direct HTTP calls from the browser to PocketBase:
- ❌ **Before**: Browser (HTTPS) → PocketBase (HTTP) = Mixed Content Error
- ✅ **Now**: Browser (HTTPS) → Vercel API Route (HTTPS) → PocketBase (HTTP, server-to-server)

## Architecture

```
Client (HTTPS) 
  ↓
Vercel API Routes (/api/pocketbase/*)
  ↓
PocketBase Server (HTTP) - Server-to-server, no Mixed Content issues
```

## Environment Variables for Vercel

### Frontend Project (`rave-eta`)

**Remove** `NEXT_PUBLIC_POCKETBASE_URL` (no longer needed on client)

**Add** server-side only variable:
```
POCKETBASE_URL = http://13.201.90.240:8092
```

**Keep**:
```
NEXT_PUBLIC_BACKEND_URL = http://13.201.90.240:3001
NEXT_PUBLIC_RAZORPAY_KEY_ID = (your key if needed)
```

### Backoffice Project (`ravebackoffice`)

Same as frontend:
```
POCKETBASE_URL = http://13.201.90.240:8092
NEXT_PUBLIC_BACKEND_URL = http://13.201.90.240:3001
```

## API Routes Created

1. **`/api/pocketbase/auth/login`** - User login
2. **`/api/pocketbase/auth/register`** - User registration
3. **`/api/pocketbase/[...path]`** - Generic proxy for all PocketBase API calls

## Benefits

✅ **No Mixed Content errors** - All requests go through HTTPS  
✅ **Works with free Vercel hosting** - No domain needed  
✅ **Secure** - PocketBase URL not exposed to client  
✅ **Same API** - Your existing code works with minimal changes  

## Limitations

⚠️ **Backend API still needs HTTPS** - The `NEXT_PUBLIC_BACKEND_URL` will still have Mixed Content issues if it's HTTP. You'll need to either:
- Set up HTTPS for the backend (requires domain)
- Or create API routes for backend calls too

## Next Steps

1. **Update Vercel Environment Variables**:
   - Remove `NEXT_PUBLIC_POCKETBASE_URL`
   - Add `POCKETBASE_URL` (server-side only)

2. **Redeploy** both frontend and backoffice projects

3. **Test** - Mixed Content errors for PocketBase should be gone!

4. **For Backend API** - If you still see Mixed Content errors for backend calls, we can create similar API routes for the backend.

## Troubleshooting

### Still seeing Mixed Content errors?

- Check that you removed `NEXT_PUBLIC_POCKETBASE_URL` from Vercel
- Verify `POCKETBASE_URL` is set (server-side only)
- Redeploy after changing environment variables
- Check browser console for exact error messages

### Backend API Mixed Content?

The backend API (`NEXT_PUBLIC_BACKEND_URL`) will still have Mixed Content issues. Options:
1. Create API proxy routes for backend (similar to PocketBase)
2. Set up HTTPS for backend (requires domain)
3. Use a free domain service for backend

