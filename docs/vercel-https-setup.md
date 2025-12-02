# Setting Up HTTPS for Vercel Deployment

## Problem

When deploying to Vercel (HTTPS), your app cannot make requests to HTTP endpoints due to **Mixed Content** security restrictions. You need HTTPS for:
- PocketBase (`http://13.201.90.240:8092`)
- Backend API (`http://13.201.90.240:3001`)

## Solution Options

### Option 1: Set Up Nginx Reverse Proxy with Let's Encrypt SSL (Recommended)

This is the best long-term solution. It provides:
- Free SSL certificates via Let's Encrypt
- Proper domain names instead of IP addresses
- Better security and professional setup

#### Prerequisites
- A domain name (e.g., `rave-api.com`, `api.yourdomain.com`)
- DNS access to point subdomains to your server IP (`13.201.90.240`)

#### Step 1: Install Nginx and Certbot

On your AWS server (`13.201.90.240`):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install -y nginx

# Install Certbot for Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 2: Configure DNS

Point your subdomains to your server IP:
- `api.yourdomain.com` → `13.201.90.240` (for PocketBase)
- `backend.yourdomain.com` → `13.201.90.240` (for Backend API)

Or use separate domains:
- `rave-api.com` → `13.201.90.240` (for PocketBase)
- `rave-backend.com` → `13.201.90.240` (for Backend API)

#### Step 3: Configure Nginx for PocketBase

Create Nginx config for PocketBase:

```bash
sudo nano /etc/nginx/sites-available/pocketbase
```

Add this configuration (replace `api.yourdomain.com` with your domain):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8092;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/pocketbase /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

#### Step 4: Configure Nginx for Backend API

Create Nginx config for Backend:

```bash
sudo nano /etc/nginx/sites-available/backend
```

Add this configuration (replace `backend.yourdomain.com` with your domain):

```nginx
server {
    listen 80;
    server_name backend.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 5: Get SSL Certificates

Run Certbot to get free SSL certificates:

```bash
# For PocketBase
sudo certbot --nginx -d api.yourdomain.com

# For Backend
sudo certbot --nginx -d backend.yourdomain.com
```

Certbot will:
- Automatically configure SSL
- Set up automatic renewal
- Redirect HTTP to HTTPS

#### Step 6: Update Vercel Environment Variables

In your Vercel dashboard, update environment variables:

**Frontend:**
```
NEXT_PUBLIC_POCKETBASE_URL = https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL = https://backend.yourdomain.com
```

**Backoffice:**
```
NEXT_PUBLIC_POCKETBASE_URL = https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL = https://backend.yourdomain.com
```

Then **redeploy** your Vercel projects.

### Option 2: Use Cloudflare Tunnel (Quick Alternative)

If you don't have a domain or want a quick solution:

1. Install Cloudflare Tunnel on your server
2. Create tunnels for ports 8092 and 3001
3. Cloudflare provides HTTPS endpoints automatically

See: [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

### Option 3: Use a Self-Signed Certificate (Development Only)

⚠️ **Not recommended for production** - browsers will show security warnings.

1. Generate self-signed certificates
2. Configure Nginx to use them
3. Users will need to accept security warnings

## Quick Fix: Temporary Workaround

If you need a quick temporary solution while setting up HTTPS, you can create Next.js API route proxies. However, this is not recommended for production as it adds latency and complexity.

## Verification

After setting up HTTPS:

1. Test your endpoints:
   ```bash
   curl https://api.yourdomain.com/api/health
   curl https://backend.yourdomain.com/api/health
   ```

2. Check SSL certificate:
   ```bash
   openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com
   ```

3. Update Vercel environment variables and redeploy

4. Test your Vercel app - Mixed Content errors should be gone

## Troubleshooting

### Certificate Issues
- Ensure DNS is properly configured (use `dig api.yourdomain.com` to verify)
- Check firewall allows ports 80 and 443
- Verify Nginx is running: `sudo systemctl status nginx`

### Connection Refused
- Ensure PocketBase is running: `sudo systemctl status pocketbase`
- Ensure Backend is running: `pm2 status`
- Check Nginx proxy_pass URLs are correct

### Mixed Content Still Appearing
- Clear browser cache
- Check Vercel environment variables are updated
- Verify you redeployed after changing environment variables
- Check browser console for exact URLs being requested

## Security Notes

- Always use HTTPS in production
- Keep SSL certificates renewed (Certbot does this automatically)
- Use strong security headers in Nginx
- Consider adding rate limiting for API endpoints

