# Fix: "The given origin is not allowed" (403 Error)

## ✅ What's Working
- Client ID is correct: `564835892032-amhm6la5hdnub8tp41q3m92skuk5h0oc.apps.googleusercontent.com`
- Client ID format is valid
- Code is using the correct Client ID

## ❌ The Problem
Google is rejecting `http://localhost:3000` because it's not in the **Authorized JavaScript origins** list.

## 🔧 Exact Fix Steps

### Step 1: Go to Google Cloud Console
1. Open: https://console.cloud.google.com/apis/credentials
2. **IMPORTANT:** Check the project dropdown (top-left) - make sure you're in the project that contains Client ID `564835892032-amhm6la5hdnub8tp41q3m92skuk5h0oc`

### Step 2: Find and Edit the OAuth Client
1. Scroll to **OAuth 2.0 Client IDs** section
2. Find: `564835892032-amhm6la5hdnub8tp41q3m92skuk5h0oc.apps.googleusercontent.com`
3. Click the **pencil icon** (Edit) on the right

### Step 3: Add JavaScript Origin (CRITICAL)
In the **Authorized JavaScript origins** section:

**Current value should show:**
- `http://localhost:3000`
- `https://rave-eta.vercel.app`

**If `http://localhost:3000` is NOT there:**
1. Click **+ ADD URI** button
2. Type **exactly**: `http://localhost:3000`
   - ✅ Must start with `http://`
   - ✅ Must include port `:3000`
   - ❌ NO trailing slash
   - ❌ NO path (like `/auth/callback`)
3. Press Enter or click outside the field
4. **Verify it appears in the list below** (not just in the input field)

### Step 4: Add Redirect URI
In the **Authorized redirect URIs** section:

**Should have:**
- `http://localhost:3000/auth/callback`
- `https://rave-eta.vercel.app/auth/callback`

**If missing:**
1. Click **+ ADD URI**
2. Add: `http://localhost:3000/auth/callback`
3. Add: `https://rave-eta.vercel.app/auth/callback`

### Step 5: Save
1. Scroll to bottom
2. Click **SAVE** button
3. Wait for confirmation message

### Step 6: Wait and Test
1. **Wait 5-10 minutes** (Google propagation time)
2. **Clear browser cache completely**
3. **Close and reopen browser** (or use incognito)
4. **Hard refresh** the page (Ctrl+F5 / Cmd+Shift+R)
5. Test again

## 🔍 Verification Checklist

Before testing, verify in Google Cloud Console:

- [ ] You're in the correct Google Cloud project
- [ ] Client ID matches: `564835892032-amhm6la5hdnub8tp41q3m92skuk5h0oc`
- [ ] **Authorized JavaScript origins** shows `http://localhost:3000` in the list (not just typed)
- [ ] **Authorized JavaScript origins** shows `https://rave-eta.vercel.app` in the list
- [ ] **Authorized redirect URIs** shows `http://localhost:3000/auth/callback`
- [ ] **Authorized redirect URIs** shows `https://rave-eta.vercel.app/auth/callback`
- [ ] Changes are **SAVED** (you clicked Save button)
- [ ] You've waited at least 5 minutes after saving

## ⚠️ Common Mistakes

1. **Typing but not saving** - The URI must appear in the list, not just in the input field
2. **Wrong project** - Make sure you're editing the OAuth client in the correct Google Cloud project
3. **Typo in origin** - Must be exactly `http://localhost:3000` (not `https://`, not `localhost:3000`, not `http://localhost:3000/`)
4. **Not waiting** - Google changes can take 5-30 minutes to propagate
5. **Browser cache** - Old errors might be cached, clear cache completely

## 🧪 Quick Test

After making changes and waiting:

1. Open browser console
2. Go to: `http://localhost:3000/login`
3. Check console - the 403 error should be gone
4. The Google Sign-In button should load without errors

## 📞 Still Not Working?

If after 10-15 minutes it's still not working:

1. **Double-check the Client ID** in the URL of the error matches your Client ID
2. **Verify you're in the right Google Cloud project** (check project dropdown)
3. **Try a different browser** or incognito mode
4. **Check if there are multiple OAuth clients** - make sure you're editing the right one
5. **Verify the origin format** - copy-paste `http://localhost:3000` exactly

