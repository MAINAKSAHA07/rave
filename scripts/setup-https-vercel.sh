#!/bin/bash

# HTTPS Setup Script for Vercel Deployment
# This script sets up Nginx reverse proxy with Let's Encrypt SSL
# for PocketBase and Backend API to work with Vercel (HTTPS)
#
# Usage: ./scripts/setup-https-vercel.sh <pocketbase-domain> <backend-domain> [server-ip] [ssh-key] [ssh-user]
#
# Example:
#   ./scripts/setup-https-vercel.sh api.yourdomain.com backend.yourdomain.com
#   ./scripts/setup-https-vercel.sh api.yourdomain.com backend.yourdomain.com 13.201.90.240 ./ravem.pem ubuntu

set -e

# Configuration
POCKETBASE_DOMAIN="${1}"
BACKEND_DOMAIN="${2}"
SERVER_IP="${3:-13.201.90.240}"
SSH_KEY="${4:-./ravem.pem}"
REMOTE_USER="${5:-ubuntu}"

# Validate inputs
if [ -z "$POCKETBASE_DOMAIN" ] || [ -z "$BACKEND_DOMAIN" ]; then
    echo "❌ Error: Missing required arguments"
    echo ""
    echo "Usage: $0 <pocketbase-domain> <backend-domain> [server-ip] [ssh-key] [ssh-user]"
    echo ""
    echo "Example:"
    echo "  $0 api.yourdomain.com backend.yourdomain.com"
    echo "  $0 api.yourdomain.com backend.yourdomain.com 13.201.90.240 ./ravem.pem ubuntu"
    echo ""
    exit 1
fi

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    echo "Please provide the correct path to your SSH key"
    exit 1
fi

chmod 400 "$SSH_KEY"

echo "🔐 Setting up HTTPS for Vercel Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Configuration:"
echo "   PocketBase Domain: $POCKETBASE_DOMAIN"
echo "   Backend Domain:    $BACKEND_DOMAIN"
echo "   Server IP:          $SERVER_IP"
echo "   SSH Key:            $SSH_KEY"
echo "   SSH User:          $REMOTE_USER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Install Nginx and Certbot
echo "📦 Step 1: Installing Nginx and Certbot..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'INSTALL'
    set -e
    echo "Updating package list..."
    sudo apt update
    
    echo "Installing Nginx..."
    sudo apt install -y nginx || echo "Nginx may already be installed"
    
    echo "Installing Certbot..."
    sudo apt install -y certbot python3-certbot-nginx || echo "Certbot may already be installed"
    
    echo "✅ Installation complete!"
INSTALL

# Step 2: Create Nginx configuration for PocketBase
echo ""
echo "🔧 Step 2: Configuring Nginx for PocketBase ($POCKETBASE_DOMAIN)..."
cat > /tmp/pocketbase-nginx.conf << NGINXCONF
server {
    listen 80;
    server_name $POCKETBASE_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8092;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Increase body size for file uploads (PocketBase file uploads)
        client_max_body_size 50M;
    }
}
NGINXCONF

scp -i "$SSH_KEY" /tmp/pocketbase-nginx.conf "$REMOTE_USER@$SERVER_IP:/tmp/pocketbase-nginx.conf"
rm /tmp/pocketbase-nginx.conf

# Step 3: Create Nginx configuration for Backend
echo "🔧 Step 3: Configuring Nginx for Backend API ($BACKEND_DOMAIN)..."
cat > /tmp/backend-nginx.conf << NGINXCONF
server {
    listen 80;
    server_name $BACKEND_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Increase body size for API requests
        client_max_body_size 10M;
    }
}
NGINXCONF

scp -i "$SSH_KEY" /tmp/backend-nginx.conf "$REMOTE_USER@$SERVER_IP:/tmp/backend-nginx.conf"
rm /tmp/backend-nginx.conf

# Step 4: Enable Nginx configurations
echo ""
echo "🔌 Step 4: Enabling Nginx configurations..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << NGINXENABLE
    set -e
    
    # Move PocketBase config
    sudo mv /tmp/pocketbase-nginx.conf /etc/nginx/sites-available/pocketbase
    sudo ln -sf /etc/nginx/sites-available/pocketbase /etc/nginx/sites-enabled/pocketbase
    
    # Move Backend config
    sudo mv /tmp/backend-nginx.conf /etc/nginx/sites-available/backend
    sudo ln -sf /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/backend
    
    # Test configuration
    echo "Testing Nginx configuration..."
    sudo nginx -t
    
    # Reload Nginx
    echo "Reloading Nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx configurations enabled!"
NGINXENABLE

# Step 5: Get SSL certificates
echo ""
echo "🔐 Step 5: Obtaining SSL certificates from Let's Encrypt..."
echo "⚠️  Make sure your DNS is pointing to $SERVER_IP before continuing!"
echo ""
read -p "Have you configured DNS for $POCKETBASE_DOMAIN and $BACKEND_DOMAIN? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please configure DNS first, then run this script again."
    echo ""
    echo "DNS Configuration needed:"
    echo "   $POCKETBASE_DOMAIN → $SERVER_IP"
    echo "   $BACKEND_DOMAIN → $SERVER_IP"
    exit 1
fi

echo "Getting SSL certificate for PocketBase..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << CERTBOT1
    set -e
    sudo certbot --nginx -d $POCKETBASE_DOMAIN --non-interactive --agree-tos --email admin@$POCKETBASE_DOMAIN --redirect
CERTBOT1

echo "Getting SSL certificate for Backend..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << CERTBOT2
    set -e
    sudo certbot --nginx -d $BACKEND_DOMAIN --non-interactive --agree-tos --email admin@$BACKEND_DOMAIN --redirect
CERTBOT2

# Step 6: Verify SSL setup
echo ""
echo "✅ Step 6: Verifying SSL setup..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << VERIFY
    echo "Testing HTTPS endpoints..."
    curl -I https://$POCKETBASE_DOMAIN || echo "⚠️  PocketBase HTTPS test failed"
    curl -I https://$BACKEND_DOMAIN || echo "⚠️  Backend HTTPS test failed"
    echo ""
    echo "Checking SSL certificates..."
    sudo certbot certificates
VERIFY

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ HTTPS Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update Vercel Environment Variables:"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Go to your Vercel project dashboard → Settings → Environment Variables"
echo ""
echo "   For Frontend project:"
echo "   • NEXT_PUBLIC_POCKETBASE_URL = https://$POCKETBASE_DOMAIN"
echo "   • NEXT_PUBLIC_BACKEND_URL = https://$BACKEND_DOMAIN"
echo ""
echo "   For Backoffice project:"
echo "   • NEXT_PUBLIC_POCKETBASE_URL = https://$POCKETBASE_DOMAIN"
echo "   • NEXT_PUBLIC_BACKEND_URL = https://$BACKEND_DOMAIN"
echo ""
echo "2. Redeploy your Vercel projects after updating environment variables"
echo ""
echo "3. Test your deployment:"
echo "   • PocketBase: https://$POCKETBASE_DOMAIN"
echo "   • Backend API: https://$BACKEND_DOMAIN"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔒 SSL certificates will auto-renew via Certbot"
echo "📝 Check renewal status: sudo certbot certificates"
echo ""

