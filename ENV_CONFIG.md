# Environment Configuration Guide

## PocketBase URL Configuration

The application supports both **local** and **AWS** environments automatically.

### Priority Order:
1. `AWS_POCKETBASE_URL` - Used when deploying to AWS
2. `POCKETBASE_URL` - Used for local development or custom setups
3. `NEXT_PUBLIC_POCKETBASE_URL` - Public URL (accessible from client-side)
4. Default: `http://localhost:8090` - Local development fallback

### Local Development (.env):
```
POCKETBASE_URL=http://localhost:8090
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
# AWS_POCKETBASE_URL is not set (will use POCKETBASE_URL)
```

### AWS Deployment (.env on server):
```
AWS_POCKETBASE_URL=http://13.201.90.240:8090
# POCKETBASE_URL can be set as fallback
```

✅ The code automatically detects which environment it's running in!
