#!/bin/bash

# Setup PocketBase with Docker on AWS
# Usage: ./scripts/setup-pocketbase-docker-aws.sh

set -e

SERVER_IP="13.201.90.240"
SSH_KEY="./ravem.pem"
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/rave"

echo "🐳 Setting up PocketBase with Docker on AWS..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY"

echo "🔌 Connecting to AWS server..."

ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'SETUPSCRIPT'
    set -e
    
    echo "📦 Installing Docker..."
    
    # Install Docker on Amazon Linux 2023
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
    
    echo "📦 Installing Docker Compose..."
    # Install Docker Compose v2 (plugin)
    sudo yum install -y docker-compose-plugin || {
        # Fallback to standalone docker-compose
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    }
    
    echo "🛑 Stopping existing PocketBase process..."
    # Stop PocketBase if running
    sudo pkill -f "pocketbase serve" || echo "No PocketBase process found"
    sleep 2
    
    echo "📁 Checking PocketBase data directory..."
    cd /home/ec2-user/rave || cd /opt/rave || {
        echo "⚠️  Project directory not found. Creating it..."
        mkdir -p /home/ec2-user/rave
        cd /home/ec2-user/rave
    }
    
    # Check if pb_data exists
    if [ -d "pocketbase/pb_data" ]; then
        echo "✅ Found existing PocketBase data at pocketbase/pb_data"
        # Backup existing data
        if [ ! -d "backups" ]; then
            mkdir -p backups
        fi
        tar -czf "backups/pb_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz" -C pocketbase pb_data 2>/dev/null || echo "⚠️  Could not backup pb_data"
    else
        echo "📁 Creating PocketBase data directory..."
        mkdir -p pocketbase/pb_data
        mkdir -p pocketbase/pb_migrations
    fi
    
    echo "📝 Creating docker-compose.yml..."
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:0.22.27
    container_name: rave-pb
    volumes:
      - ./pocketbase/pb_data:/pb/pb_data
      - ./pocketbase/pb_migrations:/pb/pb_migrations
    ports:
      - "8090:8090"
      - "8092:8090"  # Keep backward compatibility
    environment:
      - PB_ENCRYPTION_KEY=${PB_ENCRYPTION_KEY:-changeme}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8090/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  backup:
    image: alpine:latest
    container_name: rave-backup
    volumes:
      - ./pocketbase/pb_data:/data/pb_data:ro
      - ./backups:/backups
    command: >
      sh -c "
        apk add --no-cache tar gzip &&
        mkdir -p /backups &&
        tar -czf /backups/pb_backup_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data pb_data &&
        find /backups -name 'pb_backup_*.tar.gz' -mtime +7 -delete
      "
    restart: "no"
    profiles:
      - backup
EOF
    
    echo "🔒 Opening firewall ports..."
    sudo ufw allow 8090/tcp 2>/dev/null || sudo firewall-cmd --permanent --add-port=8090/tcp 2>/dev/null || echo "⚠️  Could not configure firewall (may need manual setup)"
    sudo ufw allow 8092/tcp 2>/dev/null || sudo firewall-cmd --permanent --add-port=8092/tcp 2>/dev/null || echo "⚠️  Could not configure firewall (may need manual setup)"
    
    echo "🐳 Starting PocketBase in Docker..."
    # Need to use newgrp or logout/login for docker group to take effect
    # For now, use sudo
    sudo docker compose up -d pocketbase || sudo docker-compose up -d pocketbase
    
    echo "⏳ Waiting for PocketBase to start..."
    sleep 5
    
    echo "🏥 Checking PocketBase health..."
    for i in {1..10}; do
        if curl -f http://localhost:8090/api/health > /dev/null 2>&1; then
            echo "✅ PocketBase is healthy on port 8090!"
            break
        fi
        echo "   Attempt $i/10..."
        sleep 2
    done
    
    echo "📊 Docker status:"
    sudo docker ps | grep pocketbase || echo "⚠️  PocketBase container not found"
    
    echo ""
    echo "✅ Setup complete!"
    echo "🌐 PocketBase should be accessible at:"
    echo "   - http://13.201.90.240:8090"
    echo "   - http://13.201.90.240:8092 (backward compatibility)"
SETUPSCRIPT

echo ""
echo "✅ Docker setup script completed!"
echo "📝 Note: You may need to log out and log back in for docker group permissions to take effect"
echo "   Or use 'sudo' with docker commands until then"
