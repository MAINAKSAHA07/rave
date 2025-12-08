#!/bin/bash

# Quick deployment script to update and restart services on AWS
# Usage: ./scripts/deploy-update-aws.sh

set -e

SERVER_IP="13.201.90.240"
SSH_KEY="./ravem.pem"
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/rave"

echo "🚀 Quick AWS Deployment Update..."

chmod 400 "$SSH_KEY"

echo "📤 Uploading updated files..."

# Upload frontend
echo "  - Frontend..."
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  frontend/ "$REMOTE_USER@$SERVER_IP:$REMOTE_DIR/frontend/"

# Upload backoffice
echo "  - Backoffice..."
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  backoffice/ "$REMOTE_USER@$SERVER_IP:$REMOTE_DIR/backoffice/"

echo "🔌 Running deployment on server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_USER@$SERVER_IP" << 'DEPLOYSCRIPT'
    set -e
    cd /home/ec2-user/rave
    
    echo "🐳 Ensuring PocketBase Docker is running..."
    if ! sudo docker ps | grep -q rave-pb; then
        sudo docker-compose up -d pocketbase || sudo docker compose up -d pocketbase
        sleep 5
    fi
    
    echo "📦 Installing dependencies..."
    
    # Frontend
    echo "Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    
    # Backoffice
    echo "Building backoffice..."
    cd backoffice
    npm install
    npm run build
    cd ..
    
    echo "🔄 Restarting services with PM2..."
    
    # Stop existing processes
    pm2 stop rave-frontend rave-backoffice 2>/dev/null || true
    pm2 delete rave-frontend rave-backoffice 2>/dev/null || true
    
    # Start frontend
    cd frontend
    pm2 start npm --name rave-frontend -- start
    cd ..
    
    # Start backoffice
    cd backoffice
    pm2 start npm --name rave-backoffice -- start
    cd ..
    
    # Save PM2 configuration
    pm2 save
    
    echo "✅ Deployment complete!"
    echo ""
    echo "📊 Service Status:"
    pm2 status
    echo ""
    echo "🐳 Docker Status:"
    sudo docker ps | grep pocketbase
DEPLOYSCRIPT

echo ""
echo "✅ Deployment Update Complete!"
echo "🌐 Services:"
echo "   - Frontend: http://$SERVER_IP:3000"
echo "   - Backoffice: http://$SERVER_IP:3001"
echo "   - PocketBase: http://$SERVER_IP:8090"


