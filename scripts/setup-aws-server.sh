#!/bin/bash

# Initial AWS Server Setup Script
# Run this once to set up the server environment
# Usage: ./scripts/setup-aws-server.sh

set -e

SERVER_IP="3.144.160.219"
SSH_KEY="./emotion.pem"
REMOTE_USER="ubuntu"
REMOTE_DIR="/opt/rave"

echo "🔧 Setting up AWS Server..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY"

echo "📤 Running initial server setup..."

ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'SETUPSCRIPT'
    set -e
    
    echo "📦 Updating system packages..."
    sudo apt-get update
    sudo apt-get upgrade -y
    
    echo "📥 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
    
    echo "📥 Installing Nginx..."
    sudo apt-get install -y nginx
    
    echo "📥 Installing Git..."
    sudo apt-get install -y git
    
    echo "🔒 Setting up firewall..."
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    sudo ufw allow 3001/tcp
    sudo ufw allow 3002/tcp
    sudo ufw allow 8092/tcp
    sudo ufw --force enable
    
    echo "📁 Creating project directory..."
    sudo mkdir -p /opt/rave
    sudo chown $USER:$USER /opt/rave
    
    echo "📥 Downloading PocketBase..."
    cd /tmp
    wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.0/pocketbase_0.20.0_linux_amd64.zip
    unzip pocketbase_0.20.0_linux_amd64.zip
    sudo mv pocketbase /usr/local/bin/
    sudo chmod +x /usr/local/bin/pocketbase
    rm pocketbase_0.20.0_linux_amd64.zip
    
    echo "✅ Server setup complete!"
    echo "Node.js version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "PM2 version: $(pm2 --version)"
SETUPSCRIPT

echo "✅ AWS Server setup complete!"
echo "🚀 You can now run ./scripts/deploy-aws.sh to deploy your application"


# Initial AWS Server Setup Script
# Run this once to set up the server environment
# Usage: ./scripts/setup-aws-server.sh

set -e

SERVER_IP="3.144.160.219"
SSH_KEY="./emotion.pem"
REMOTE_USER="ubuntu"
REMOTE_DIR="/opt/rave"

echo "🔧 Setting up AWS Server..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY"

echo "📤 Running initial server setup..."

ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'SETUPSCRIPT'
    set -e
    
    echo "📦 Updating system packages..."
    sudo apt-get update
    sudo apt-get upgrade -y
    
    echo "📥 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
    
    echo "📥 Installing Nginx..."
    sudo apt-get install -y nginx
    
    echo "📥 Installing Git..."
    sudo apt-get install -y git
    
    echo "🔒 Setting up firewall..."
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    sudo ufw allow 3001/tcp
    sudo ufw allow 3002/tcp
    sudo ufw allow 8092/tcp
    sudo ufw --force enable
    
    echo "📁 Creating project directory..."
    sudo mkdir -p /opt/rave
    sudo chown $USER:$USER /opt/rave
    
    echo "📥 Downloading PocketBase..."
    cd /tmp
    wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.0/pocketbase_0.20.0_linux_amd64.zip
    unzip pocketbase_0.20.0_linux_amd64.zip
    sudo mv pocketbase /usr/local/bin/
    sudo chmod +x /usr/local/bin/pocketbase
    rm pocketbase_0.20.0_linux_amd64.zip
    
    echo "✅ Server setup complete!"
    echo "Node.js version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "PM2 version: $(pm2 --version)"
SETUPSCRIPT

echo "✅ AWS Server setup complete!"
echo "🚀 You can now run ./scripts/deploy-aws.sh to deploy your application"

