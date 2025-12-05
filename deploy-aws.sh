#!/bin/bash

# AWS Deployment Script for Rave Platform
# Usage: ./deploy-aws.sh [--force] [--clean]
#   --force: Force upload even if files exist on server
#   --clean: Delete all files from AWS server before uploading (fresh deployment)

set -e

SERVER_IP="13.201.90.240"
SSH_KEY="./ravem.pem"
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/rave"

# Check for flags
FORCE_OVERWRITE=false
CLEAN_DEPLOYMENT=false
for arg in "$@"; do
    if [[ "$arg" == "--force" ]] || [[ "$arg" == "-f" ]]; then
        FORCE_OVERWRITE=true
        echo "⚠️  Force mode enabled - will overwrite existing files"
    fi
    if [[ "$arg" == "--clean" ]] || [[ "$arg" == "-c" ]]; then
        CLEAN_DEPLOYMENT=true
        FORCE_OVERWRITE=true  # Force mode is automatically enabled with clean mode
        echo "🧹 Clean deployment mode enabled - will delete all files from server first"
    fi
done

echo "🚀 Starting AWS Deployment..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY"

# Clean deployment: Delete all files from server first
if [ "$CLEAN_DEPLOYMENT" = true ]; then
    echo "🗑️  Cleaning up existing files on server..."
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
            echo "  ✅ Cleanup complete"
        else
            echo "  ℹ️  Directory doesn't exist, creating it..."
            mkdir -p /home/ec2-user/rave
        fi
CLEANUP
    echo "✅ Server cleanup complete"
    echo ""
fi

echo "📦 Preparing deployment package..."

# Create deployment directory
DEPLOY_DIR="deploy-temp"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
echo "📋 Copying files..."

# Use rsync to copy directories excluding problematic folders (avoids symlink cycles)
if command -v rsync &> /dev/null; then
    echo "  - Frontend..."
    mkdir -p "$DEPLOY_DIR/frontend"
    rsync -av --exclude='node_modules' --exclude='.next' --exclude='.netlify' --exclude='.git' --exclude='*.log' frontend/ "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    
    echo "  - Backoffice..."
    mkdir -p "$DEPLOY_DIR/backoffice"
    rsync -av --exclude='node_modules' --exclude='.next' --exclude='.netlify' --exclude='.git' --exclude='*.log' backoffice/ "$DEPLOY_DIR/backoffice/" 2>/dev/null || true
else
    # Fallback to tar if rsync not available
    echo "  - Frontend..."
    mkdir -p "$DEPLOY_DIR/frontend"
    (cd frontend && tar --exclude='node_modules' --exclude='.next' --exclude='.netlify' --exclude='.git' --exclude='*.log' -cf - . 2>/dev/null) | (cd "$DEPLOY_DIR/frontend" && tar -xf - 2>/dev/null) || true
    
    echo "  - Backoffice..."
    mkdir -p "$DEPLOY_DIR/backoffice"
    (cd backoffice && tar --exclude='node_modules' --exclude='.next' --exclude='.netlify' --exclude='.git' --exclude='*.log' -cf - . 2>/dev/null) | (cd "$DEPLOY_DIR/backoffice" && tar -xf - 2>/dev/null) || true
fi

# Copy pocketbase (no exclusions needed)
echo "  - PocketBase..."
cp -r pocketbase "$DEPLOY_DIR/" 2>/dev/null || true

# Copy root files
cp package.json "$DEPLOY_DIR/" 2>/dev/null || true
cp package-lock.json "$DEPLOY_DIR/" 2>/dev/null || true
cp docker-compose.yml "$DEPLOY_DIR/" 2>/dev/null || true
cp Dockerfile.pocketbase "$DEPLOY_DIR/" 2>/dev/null || true
cp Makefile "$DEPLOY_DIR/" 2>/dev/null || true
cp .env "$DEPLOY_DIR/" 2>/dev/null || echo "⚠️  Warning: .env file not found. Make sure to create it on the server."

# Cleanup: Remove any node_modules that might have been copied (safety check)
echo "🧹 Cleaning up node_modules..."
find "$DEPLOY_DIR" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
find "$DEPLOY_DIR" -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
find "$DEPLOY_DIR" -type d -name ".netlify" -exec rm -rf {} + 2>/dev/null || true
find "$DEPLOY_DIR" -type d -name "dist" -path "*/backend/*" -exec rm -rf {} + 2>/dev/null || true

# Create deployment script
cat > "$DEPLOY_DIR/deploy.sh" << 'DEPLOYSCRIPT'
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
DEPLOYSCRIPT

chmod +x "$DEPLOY_DIR/deploy.sh"

echo "📤 Uploading files to server..."
# Create directory on server first if it doesn't exist
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR"

# Function to check if file/directory exists on server and skip if it does
upload_if_not_exists() {
    local local_path="$1"
    local remote_path="$2"
    
    # Skip check if force overwrite is enabled
    if [ "$FORCE_OVERWRITE" = true ]; then
        echo "  📤 Uploading $remote_path (force mode)..."
        ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "mkdir -p \"$REMOTE_DIR/$(dirname \"$remote_path\")\"" 2>/dev/null || true
        scp -i "$SSH_KEY" -r "$local_path" "$REMOTE_USER@$SERVER_IP:$REMOTE_DIR/$remote_path" 2>/dev/null || true
        return 1
    fi
    
    # Check if file/directory exists on server
    if ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "[ -e \"$REMOTE_DIR/$remote_path\" ]" 2>/dev/null; then
        echo "  ⏭️  Skipping $remote_path (already exists - use --force to overwrite)"
        return 0
    else
        echo "  📤 Uploading $remote_path..."
        # Create parent directory on server
        ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "mkdir -p \"$REMOTE_DIR/$(dirname \"$remote_path\")\"" 2>/dev/null || true
        # Upload file/directory
        scp -i "$SSH_KEY" -r "$local_path" "$REMOTE_USER@$SERVER_IP:$REMOTE_DIR/$remote_path" 2>/dev/null || true
        return 1
    fi
}

# Upload files with existence check
echo "Checking existing files on server..."
upload_if_not_exists "$DEPLOY_DIR/frontend" "frontend"
upload_if_not_exists "$DEPLOY_DIR/backoffice" "backoffice"
upload_if_not_exists "$DEPLOY_DIR/pocketbase" "pocketbase"
upload_if_not_exists "$DEPLOY_DIR/package.json" "package.json"
upload_if_not_exists "$DEPLOY_DIR/package-lock.json" "package-lock.json"
upload_if_not_exists "$DEPLOY_DIR/docker-compose.yml" "docker-compose.yml"
upload_if_not_exists "$DEPLOY_DIR/Dockerfile.pocketbase" "Dockerfile.pocketbase"
upload_if_not_exists "$DEPLOY_DIR/Makefile" "Makefile"
if [ -f "$DEPLOY_DIR/.env" ]; then
    upload_if_not_exists "$DEPLOY_DIR/.env" ".env"
fi
upload_if_not_exists "$DEPLOY_DIR/deploy.sh" "deploy.sh"

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
echo "   - Frontend: http://$SERVER_IP:3000"
echo "   - Backoffice: http://$SERVER_IP:3001"
echo "   - PocketBase: http://$SERVER_IP:8090 (Docker)"
echo ""
echo "📊 Check service status:"
echo "   - PM2: ssh -i $SSH_KEY $REMOTE_USER@$SERVER_IP 'pm2 status'"
echo "   - Docker: ssh -i $SSH_KEY $REMOTE_USER@$SERVER_IP 'sudo docker ps'"

