# Deployment Guide

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04 recommended)
- Domain name (optional, for production)
- SSL certificate (Let's Encrypt recommended)
- Razorpay account
- Resend account

## Server Setup

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Setup PocketBase

```bash
# Download PocketBase
cd /opt
sudo wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.0/pocketbase_0.20.0_linux_amd64.zip
sudo unzip pocketbase_0.20.0_linux_amd64.zip
sudo chmod +x pocketbase
sudo mv pocketbase /usr/local/bin/

# Create PocketBase service
sudo nano /etc/systemd/system/pocketbase.service
```

PocketBase service file:
```ini
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/pocketbase
ExecStart=/usr/local/bin/pocketbase serve --http=127.0.0.1:8092
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

### 3. Deploy Backend

```bash
# Clone repository
cd /opt
sudo git clone <your-repo-url> rave
cd rave/backend

# Install dependencies
sudo npm install

# Build
sudo npm run build

# Create .env file
sudo nano .env
# Add all environment variables

# Start with PM2
pm2 start dist/index.js --name rave-backend
pm2 save
pm2 startup
```

### 4. Deploy Frontend

```bash
cd /opt/rave/frontend

# Install dependencies
sudo npm install

# Build
sudo npm run build

# Start with PM2
pm2 start npm --name rave-frontend -- start
pm2 save
```

### 5. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/rave
```

Nginx configuration:
```nginx
# PocketBase
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8092;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Backend API
server {
    listen 80;
    server_name backend.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    root /opt/rave/frontend/.next;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rave /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com -d backend.yourdomain.com
```

### 7. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Environment Variables

### Backend (.env)
```
PORT=3001
NODE_ENV=production
POCKETBASE_URL=http://127.0.0.1:8092
POCKETBASE_ADMIN_EMAIL=your_admin_email
POCKETBASE_ADMIN_PASSWORD=your_admin_password
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Frontend (.env.local)
```
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://backend.yourdomain.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## Monitoring

- Use PM2 for process monitoring: `pm2 monit`
- Set up log rotation
- Configure backups for PocketBase data directory
- Monitor disk space and memory usage

## Backup

```bash
# Backup PocketBase data
sudo tar -czf pocketbase-backup-$(date +%Y%m%d).tar.gz /opt/pocketbase/pb_data

# Backup to S3 (optional)
aws s3 cp pocketbase-backup-*.tar.gz s3://your-backup-bucket/
```

## Updates

```bash
cd /opt/rave
git pull
cd backend && npm install && npm run build && pm2 restart rave-backend
cd ../frontend && npm install && npm run build && pm2 restart rave-frontend
```

