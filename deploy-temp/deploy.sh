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
