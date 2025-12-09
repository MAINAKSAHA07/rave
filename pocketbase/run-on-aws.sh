#!/bin/bash

# Script to run Google OAuth configuration on AWS server
# This script will SSH into AWS and run the configuration there

set -e

SERVER_IP="13.201.90.240"
SSH_KEY="./ravem.pem"
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/rave"

echo "🌐 Configuring Google OAuth on AWS PocketBase..."
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY"

echo "📤 Uploading configuration script to AWS..."
scp -i "$SSH_KEY" "$(dirname "$0")/configure-google-auth-aws.js" "$REMOTE_USER@$SERVER_IP:$REMOTE_DIR/pocketbase/"

echo "🔌 Connecting to AWS server..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'EOF'
    cd /home/ec2-user/rave
    
    echo "📦 Checking Node.js..."
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js first."
        exit 1
    fi
    
    echo "📦 Installing dependencies if needed..."
    cd pocketbase
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    echo "🔧 Running Google OAuth configuration..."
    node configure-google-auth-aws.js
    
    echo ""
    echo "✅ Configuration complete!"
    echo ""
    echo "🔍 Verify configuration:"
    echo "   node verify-google-oauth.js"
EOF

echo ""
echo "✅ Done! Google OAuth has been configured on AWS PocketBase."
