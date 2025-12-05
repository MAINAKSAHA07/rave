#!/bin/bash
# Command to delete all files from AWS server

SERVER_IP="13.201.90.240"
SSH_KEY="./ravem.pem"
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/rave"

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY" 2>/dev/null || true

echo "🗑️  Deleting all files from AWS server..."

ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'CLEANUP'
    set -e
    echo "  ⏹️  Stopping PM2 processes..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    echo "  🐳 Stopping Docker containers..."
    cd /home/ec2-user/rave 2>/dev/null || true
    sudo docker-compose down 2>/dev/null || sudo docker compose down 2>/dev/null || true
    
    echo "  🗑️  Removing all files from /home/ec2-user/rave..."
    if [ -d "/home/ec2-user/rave" ]; then
        rm -rf /home/ec2-user/rave/*
        rm -rf /home/ec2-user/rave/.* 2>/dev/null || true
        echo "  ✅ All files deleted"
    else
        echo "  ℹ️  Directory doesn't exist"
    fi
CLEANUP

echo "✅ Cleanup complete!"
