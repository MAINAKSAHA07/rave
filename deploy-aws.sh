#!/bin/bash

# AWS Deployment Script for Rave Platform
# Usage: ./scripts/deploy-aws.sh

set -e

SERVER_IP="3.144.160.219"
SSH_KEY="./emotion.pem"
REMOTE_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/rave"

echo "🚀 Starting AWS Deployment..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY"

echo "📦 Preparing deployment package..."

# Create deployment directory
DEPLOY_DIR="deploy-temp"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
echo "📋 Copying files..."
cp -r backend "$DEPLOY_DIR/"
cp -r frontend "$DEPLOY_DIR/"
cp -r backoffice "$DEPLOY_DIR/"
cp -r pocketbase "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/" 2>/dev/null || true
cp .env "$DEPLOY_DIR/" 2>/dev/null || echo "⚠️  Warning: .env file not found. Make sure to create it on the server."

# Create deployment script
cat > "$DEPLOY_DIR/deploy.sh" << 'DEPLOYSCRIPT'
#!/bin/bash
set -e

echo "🔧 Installing dependencies..."

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📥 Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

cd /home/ubuntu/rave

echo "📦 Installing project dependencies..."
npm install

echo "🏗️  Building projects..."

# Build backend
echo "Building backend..."
cd backend
npm install
npm run build
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build backoffice
echo "Building backoffice..."
cd backoffice
npm install
npm run build
cd ..

echo "🔄 Restarting services with PM2..."

# Stop existing processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start backend
cd backend
pm2 start dist/index.js --name rave-backend
cd ..

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

# Setup PM2 startup script
pm2 startup systemd -u $USER --hp /home/$USER

echo "✅ Deployment complete!"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pm2 logs"
DEPLOYSCRIPT

chmod +x "$DEPLOY_DIR/deploy.sh"

echo "📤 Uploading files to server..."
# Create directory on server first if it doesn't exist
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR"
# Upload files
scp -i "$SSH_KEY" -r "$DEPLOY_DIR"/* "$REMOTE_USER@$SERVER_IP:$REMOTE_DIR/"

echo "🔌 Connecting to server to run deployment..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << EOF
    cd $REMOTE_DIR
    chmod +x deploy.sh
    sudo ./deploy.sh
EOF

echo "🧹 Cleaning up..."
rm -rf "$DEPLOY_DIR"

echo "✅ AWS Deployment Complete!"
echo "🌐 Your services should be running on:"
echo "   - Backend API: http://$SERVER_IP:3001"
echo "   - Frontend: http://$SERVER_IP:3000"
echo "   - Backoffice: http://$SERVER_IP:3002"
echo "   - PocketBase: http://$SERVER_IP:8092"

