#!/bin/bash

# Nginx Configuration Script for Rave Platform
# Usage: ./scripts/configure-nginx.sh [domain]

set -e

SERVER_IP="3.144.160.219"
SSH_KEY="./emotion.pem"
REMOTE_USER="ubuntu"
DOMAIN="${1:-$SERVER_IP}"

echo "🌐 Configuring Nginx for domain: $DOMAIN"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

chmod 400 "$SSH_KEY"

# Create Nginx configuration
cat > /tmp/rave-nginx.conf << NGINXCONF
# Frontend (Customer-facing)
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Backoffice
server {
    listen 80;
    server_name admin.$DOMAIN;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.$DOMAIN;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# PocketBase (Internal only - can be restricted)
server {
    listen 80;
    server_name db.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8092;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXCONF

echo "📤 Uploading Nginx configuration..."
scp -i "$SSH_KEY" /tmp/rave-nginx.conf "$REMOTE_USER@$SERVER_IP:/tmp/rave-nginx.conf"

echo "🔌 Configuring Nginx on server..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'NGINXSETUP'
    sudo mv /tmp/rave-nginx.conf /etc/nginx/sites-available/rave
    sudo ln -sf /etc/nginx/sites-available/rave /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl reload nginx
    echo "✅ Nginx configured successfully!"
NGINXSETUP

rm /tmp/rave-nginx.conf

echo "✅ Nginx configuration complete!"
echo "🌐 Your services are now accessible:"
echo "   - Frontend: http://$DOMAIN"
echo "   - Backoffice: http://admin.$DOMAIN"
echo "   - API: http://api.$DOMAIN"
echo "   - PocketBase: http://db.$DOMAIN"


# Nginx Configuration Script for Rave Platform
# Usage: ./scripts/configure-nginx.sh [domain]

set -e

SERVER_IP="3.144.160.219"
SSH_KEY="./emotion.pem"
REMOTE_USER="ubuntu"
DOMAIN="${1:-$SERVER_IP}"

echo "🌐 Configuring Nginx for domain: $DOMAIN"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

chmod 400 "$SSH_KEY"

# Create Nginx configuration
cat > /tmp/rave-nginx.conf << NGINXCONF
# Frontend (Customer-facing)
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Backoffice
server {
    listen 80;
    server_name admin.$DOMAIN;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.$DOMAIN;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# PocketBase (Internal only - can be restricted)
server {
    listen 80;
    server_name db.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8092;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXCONF

echo "📤 Uploading Nginx configuration..."
scp -i "$SSH_KEY" /tmp/rave-nginx.conf "$REMOTE_USER@$SERVER_IP:/tmp/rave-nginx.conf"

echo "🔌 Configuring Nginx on server..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'NGINXSETUP'
    sudo mv /tmp/rave-nginx.conf /etc/nginx/sites-available/rave
    sudo ln -sf /etc/nginx/sites-available/rave /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl reload nginx
    echo "✅ Nginx configured successfully!"
NGINXSETUP

rm /tmp/rave-nginx.conf

echo "✅ Nginx configuration complete!"
echo "🌐 Your services are now accessible:"
echo "   - Frontend: http://$DOMAIN"
echo "   - Backoffice: http://admin.$DOMAIN"
echo "   - API: http://api.$DOMAIN"
echo "   - PocketBase: http://db.$DOMAIN"

