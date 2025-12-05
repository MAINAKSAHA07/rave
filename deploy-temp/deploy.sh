#!/bin/bash
set -e

echo "🔧 Installing dependencies..."

# Detect OS type
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "⚠️  Cannot detect OS type, assuming Debian-based"
    OS="debian"
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    if [[ "$OS" == "amzn" ]] || [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "fedora" ]]; then
        # RPM-based systems (Amazon Linux, RHEL, CentOS, Fedora)
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs || sudo dnf install -y nodejs
    else
        # Debian-based systems (Ubuntu, Debian)
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📥 Installing Nginx..."
    if [[ "$OS" == "amzn" ]] || [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "fedora" ]]; then
        # RPM-based systems
        sudo yum install -y nginx || sudo dnf install -y nginx
        sudo systemctl enable nginx || true
    else
        # Debian-based systems
        sudo apt-get update
        sudo apt-get install -y nginx
    fi
fi

cd /home/ec2-user/rave

# Install project dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing project dependencies..."
    npm install
else
    echo "⏭️  Skipping root npm install (node_modules exists)"
fi

echo "🐳 Ensuring PocketBase Docker is running..."
# Start PocketBase in Docker if not already running
if ! sudo docker ps | grep -q rave-pb; then
    echo "Starting PocketBase Docker container..."
    sudo docker-compose up -d pocketbase || sudo docker compose up -d pocketbase
    sleep 5
    echo "✅ PocketBase Docker started"
else
    echo "✅ PocketBase Docker is already running"
fi

echo "🏗️  Building projects..."

# Build frontend
echo "Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "  ⏭️  Skipping frontend npm install (node_modules exists)"
fi
if [ ! -d ".next" ]; then
    npm run build
else
    echo "  ⏭️  Skipping frontend build (.next exists)"
fi
cd ..

# Build backoffice
echo "Building backoffice..."
cd backoffice
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "  ⏭️  Skipping backoffice npm install (node_modules exists)"
fi
if [ ! -d ".next" ]; then
    npm run build
else
    echo "  ⏭️  Skipping backoffice build (.next exists)"
fi
cd ..

echo "🔄 Restarting services with PM2..."

# Stop existing processes (except PocketBase which runs in Docker)
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

# Setup PM2 startup script
pm2 startup systemd -u $USER --hp /home/$USER

echo "✅ Deployment complete!"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pm2 logs"
