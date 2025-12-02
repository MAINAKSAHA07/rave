# AWS Deployment Guide

## Prerequisites

- AWS EC2 instance running Ubuntu 22.04
- SSH access to the server
- Domain name (optional, for production)

## Server Details

- **Server IP**: 3.144.160.219
- **SSH Key**: ./emotion.pem
- **Remote User**: ubuntu

## Quick Start

### 1. Initial Server Setup (Run Once)

```bash
./scripts/setup-aws-server.sh
```

This will:
- Update system packages
- Install Node.js 18
- Install PM2 (process manager)
- Install Nginx
- Install Git
- Configure firewall
- Download PocketBase
- Create project directory

### 2. Deploy Application

```bash
./scripts/deploy-aws.sh
```

This will:
- Build all projects (backend, frontend, backoffice)
- Upload files to server
- Install dependencies
- Start services with PM2

### 3. Configure Nginx (Optional - for domain setup)

```bash
./scripts/configure-nginx.sh yourdomain.com
```

Or for IP-based access:
```bash
./scripts/configure-nginx.sh 3.144.160.219
```

## Manual Deployment Steps

### 1. Connect to Server

```bash
ssh -i ./emotion.pem ubuntu@3.144.160.219
```

### 2. Clone Repository

```bash
cd /opt/rave
git clone <your-repo-url> .
```

### 3. Create .env File

```bash
nano .env
```

Add all required environment variables (see `.env.example`)

### 4. Install Dependencies

```bash
npm install
cd backend && npm install && npm run build && cd ..
cd frontend && npm install && npm run build && cd ..
cd backoffice && npm install && npm run build && cd ..
```

### 5. Start Services with PM2

```bash
# Backend
cd backend
pm2 start dist/index.js --name rave-backend
cd ..

# Frontend
cd frontend
pm2 start npm --name rave-frontend -- start
cd ..

# Backoffice
cd backoffice
pm2 start npm --name rave-backoffice -- start
cd ..

# Save PM2 configuration
pm2 save
pm2 startup
```

### 6. Setup PocketBase Service

```bash
sudo nano /etc/systemd/system/pocketbase.service
```

Add:
```ini
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/rave/pocketbase
ExecStart=/usr/local/bin/pocketbase serve --http=127.0.0.1:8092
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

## Service Management

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Delete services
pm2 delete all
```

### PocketBase Service

```bash
# Start
sudo systemctl start pocketbase

# Stop
sudo systemctl stop pocketbase

# Status
sudo systemctl status pocketbase

# Restart
sudo systemctl restart pocketbase
```

## Access URLs

After deployment, services are accessible at:

- **Frontend**: http://3.144.160.219:3000
- **Backoffice**: http://3.144.160.219:3002
- **Backend API**: http://3.144.160.219:3001
- **PocketBase**: http://3.144.160.219:8092 (or via Nginx if configured)

## Environment Variables

Make sure to set all required environment variables in `/opt/rave/.env`:

- `POCKETBASE_URL=http://127.0.0.1:8092`
- `POCKETBASE_ADMIN_EMAIL=your_email`
- `POCKETBASE_ADMIN_PASSWORD=your_password`
- `RAZORPAY_KEY_ID=your_key`
- `RAZORPAY_KEY_SECRET=your_secret`
- `RESEND_API_KEY=your_key`
- `FRONTEND_URL=http://3.144.160.219:3000`
- `BACKEND_URL=http://3.144.160.219:3001`

## Troubleshooting

### Check Service Status

```bash
pm2 status
sudo systemctl status pocketbase
sudo systemctl status nginx
```

### View Logs

```bash
pm2 logs rave-backend
pm2 logs rave-frontend
pm2 logs rave-backoffice
sudo journalctl -u pocketbase -f
```

### Port Issues

```bash
# Check if ports are in use
sudo netstat -tulpn | grep -E '3000|3001|3002|8092'

# Check firewall
sudo ufw status
```

## SSL Setup (Optional)

For production with a domain:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com
```

## Backup

```bash
# Backup PocketBase data
sudo tar -czf pocketbase-backup-$(date +%Y%m%d).tar.gz /opt/rave/pocketbase/pb_data

# Backup environment
cp /opt/rave/.env /opt/rave/.env.backup
```


## Prerequisites

- AWS EC2 instance running Ubuntu 22.04
- SSH access to the server
- Domain name (optional, for production)

## Server Details

- **Server IP**: 3.144.160.219
- **SSH Key**: ./emotion.pem
- **Remote User**: ubuntu

## Quick Start

### 1. Initial Server Setup (Run Once)

```bash
./scripts/setup-aws-server.sh
```

This will:
- Update system packages
- Install Node.js 18
- Install PM2 (process manager)
- Install Nginx
- Install Git
- Configure firewall
- Download PocketBase
- Create project directory

### 2. Deploy Application

```bash
./scripts/deploy-aws.sh
```

This will:
- Build all projects (backend, frontend, backoffice)
- Upload files to server
- Install dependencies
- Start services with PM2

### 3. Configure Nginx (Optional - for domain setup)

```bash
./scripts/configure-nginx.sh yourdomain.com
```

Or for IP-based access:
```bash
./scripts/configure-nginx.sh 3.144.160.219
```

## Manual Deployment Steps

### 1. Connect to Server

```bash
ssh -i ./emotion.pem ubuntu@3.144.160.219
```

### 2. Clone Repository

```bash
cd /opt/rave
git clone <your-repo-url> .
```

### 3. Create .env File

```bash
nano .env
```

Add all required environment variables (see `.env.example`)

### 4. Install Dependencies

```bash
npm install
cd backend && npm install && npm run build && cd ..
cd frontend && npm install && npm run build && cd ..
cd backoffice && npm install && npm run build && cd ..
```

### 5. Start Services with PM2

```bash
# Backend
cd backend
pm2 start dist/index.js --name rave-backend
cd ..

# Frontend
cd frontend
pm2 start npm --name rave-frontend -- start
cd ..

# Backoffice
cd backoffice
pm2 start npm --name rave-backoffice -- start
cd ..

# Save PM2 configuration
pm2 save
pm2 startup
```

### 6. Setup PocketBase Service

```bash
sudo nano /etc/systemd/system/pocketbase.service
```

Add:
```ini
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/rave/pocketbase
ExecStart=/usr/local/bin/pocketbase serve --http=127.0.0.1:8092
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

## Service Management

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Delete services
pm2 delete all
```

### PocketBase Service

```bash
# Start
sudo systemctl start pocketbase

# Stop
sudo systemctl stop pocketbase

# Status
sudo systemctl status pocketbase

# Restart
sudo systemctl restart pocketbase
```

## Access URLs

After deployment, services are accessible at:

- **Frontend**: http://3.144.160.219:3000
- **Backoffice**: http://3.144.160.219:3002
- **Backend API**: http://3.144.160.219:3001
- **PocketBase**: http://3.144.160.219:8092 (or via Nginx if configured)

## Environment Variables

Make sure to set all required environment variables in `/opt/rave/.env`:

- `POCKETBASE_URL=http://127.0.0.1:8092`
- `POCKETBASE_ADMIN_EMAIL=your_email`
- `POCKETBASE_ADMIN_PASSWORD=your_password`
- `RAZORPAY_KEY_ID=your_key`
- `RAZORPAY_KEY_SECRET=your_secret`
- `RESEND_API_KEY=your_key`
- `FRONTEND_URL=http://3.144.160.219:3000`
- `BACKEND_URL=http://3.144.160.219:3001`

## Troubleshooting

### Check Service Status

```bash
pm2 status
sudo systemctl status pocketbase
sudo systemctl status nginx
```

### View Logs

```bash
pm2 logs rave-backend
pm2 logs rave-frontend
pm2 logs rave-backoffice
sudo journalctl -u pocketbase -f
```

### Port Issues

```bash
# Check if ports are in use
sudo netstat -tulpn | grep -E '3000|3001|3002|8092'

# Check firewall
sudo ufw status
```

## SSL Setup (Optional)

For production with a domain:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com
```

## Backup

```bash
# Backup PocketBase data
sudo tar -czf pocketbase-backup-$(date +%Y%m%d).tar.gz /opt/rave/pocketbase/pb_data

# Backup environment
cp /opt/rave/.env /opt/rave/.env.backup
```

