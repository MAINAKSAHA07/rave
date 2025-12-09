# Customers Collection - Google Login Configuration

This document explains how the `customers` collection should be configured to properly store data from Google login.

## Required Collection Configuration

### 1. Collection Type
- **Type**: `auth` (authentication collection)
- **Name**: `customers`

### 2. Required Schema Fields

The collection must have these fields:

| Field Name | Type | Required | Purpose |
|------------|------|----------|---------|
| `email` | Built-in auth field | Yes | User's email from Google |
| `password` | Built-in auth field | Yes | Temporary password for Google auth |
| `name` | `text` | No | User's name from Google |
| `phone` | `text` | No | Phone number (optional, can be empty) |
| `avatar` | `file` | No | Profile picture (optional, not currently stored from Google) |

### 3. Collection Options

```json
{
  "allowEmailAuth": true,
  "allowOAuth2Auth": true,
  "allowUsernameAuth": false,
  "minPasswordLength": 8,
  "requireEmail": false,
  "onlyVerified": false
}
```

**Important Settings:**
- ✅ `allowEmailAuth: true` - Required for email/password authentication
- ✅ `allowOAuth2Auth: true` - Required for OAuth (though we use Google Sign-In JS library)
- ❌ `onlyVerified: false` - Should be false to allow Google login without email verification
- ❌ `requireEmail: false` - Should be false (email is always provided by Google)

### 4. Collection Rules

For Google login to work properly:

```javascript
{
  "createRule": "",  // Empty - allows public creation (required for Google login)
  "updateRule": "id = @request.auth.id",  // Users can update their own records
  "listRule": "id = @request.auth.id",   // Users can only see their own records
  "viewRule": "id = @request.auth.id"    // Users can only view their own records
}
```

**Critical:** `createRule` must be empty (`""`) to allow new users to be created via Google login.

## Google Login Data Flow

### 1. Data Received from Google

When a user signs in with Google, we receive:
- `email` - User's email address
- `name` - User's full name
- `picture` - URL to user's profile picture (currently not stored)

### 2. Data Stored in PocketBase

The Google login API (`/api/auth/google/route.ts`) stores:

**For New Customers:**
```javascript
{
  email: "user@gmail.com",
  password: "google_<random_string>",  // Temporary password
  passwordConfirm: "google_<random_string>",
  name: "User Name",  // From Google, or email prefix if not provided
  phone: "",  // Empty, can be filled later
  emailVisibility: true
}
```

**For Existing Customers:**
- Updates password (for authentication)
- Updates name if it's missing or empty
- Keeps existing phone number

### 3. Authentication Process

1. Google Sign-In JavaScript library authenticates user
2. Frontend sends Google credential token to `/api/auth/google`
3. Backend verifies token with Google
4. Backend creates/updates customer in PocketBase
5. Backend authenticates customer with temporary password
6. Backend returns PocketBase auth token
7. Frontend saves token and user is logged in

## Verification Checklist

Use the verification script to check your configuration:

```bash
# For local PocketBase
POCKETBASE_URL=http://localhost:8090 \
POCKETBASE_ADMIN_EMAIL=your_email \
POCKETBASE_ADMIN_PASSWORD=your_password \
node scripts/verify-customers-collection.js

# For AWS PocketBase
AWS_POCKETBASE_URL=http://13.201.90.240:8090 \
AWS_POCKETBASE_ADMIN_EMAIL=your_email \
AWS_POCKETBASE_ADMIN_PASSWORD=your_password \
node scripts/verify-customers-collection.js
```

### What to Check:

- [ ] Collection exists and is of type `auth`
- [ ] `name` field exists (text, optional)
- [ ] `phone` field exists (text, optional)
- [ ] `avatar` field exists (file, optional)
- [ ] `allowEmailAuth` is `true`
- [ ] `allowOAuth2Auth` is `true`
- [ ] `onlyVerified` is `false`
- [ ] `createRule` is empty (`""`)
- [ ] `minPasswordLength` is 8 or less

## Common Issues

### Issue 1: "Cannot create customer" error

**Problem:** `createRule` is set and blocks public creation.

**Solution:** Set `createRule` to empty string (`""`) in PocketBase admin UI.

### Issue 2: "Email verification required" error

**Problem:** `onlyVerified` is set to `true`.

**Solution:** Set `onlyVerified` to `false` in collection options.

### Issue 3: Name not updating for existing users

**Problem:** The API only updates name if it's missing.

**Solution:** This is by design - we preserve existing names. The code will update if name is empty or matches email prefix.

### Issue 4: Profile picture not stored

**Problem:** Google profile picture URL is not currently stored in `avatar` field.

**Solution:** This is a known limitation. To implement:
1. Download the image from Google's URL
2. Upload it to PocketBase as a file
3. Store the file reference in the `avatar` field

## Testing Google Login

1. **Test New User Registration:**
   - Sign in with Google using a new email
   - Check PocketBase admin UI - customer should be created
   - Verify `name`, `email` fields are populated

2. **Test Existing User Login:**
   - Sign in with Google using an existing email
   - Check that password is updated
   - Verify name is updated if it was missing

3. **Test Data Integrity:**
   - Verify email is unique
   - Verify name is stored correctly
   - Verify phone remains empty (or existing value)

## AWS Configuration

On AWS, ensure these environment variables are set:

```env
# PocketBase URL
AWS_POCKETBASE_URL=http://13.201.90.240:8090
NEXT_PUBLIC_POCKETBASE_URL=http://13.201.90.240:8090

# Admin credentials
AWS_POCKETBASE_ADMIN_EMAIL=your_admin_email
AWS_POCKETBASE_ADMIN_PASSWORD=your_admin_password

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
```

## Related Files

- `/frontend/src/app/api/auth/google/route.ts` - Google login API endpoint
- `/pocketbase/create-customer-collection.js` - Script to create customers collection
- `/scripts/verify-customers-collection.js` - Verification script
