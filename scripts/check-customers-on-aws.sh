#!/bin/bash

# Script to check customers collection on AWS
# Usage: ./scripts/check-customers-on-aws.sh

set -e

SERVER_IP="13.201.90.240"
SSH_KEY="./ravem.pem"
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/rave"

echo "🔍 Checking customers collection on AWS..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

chmod 400 "$SSH_KEY"

# Upload the check script
echo "📤 Uploading check script..."
scp -i "$SSH_KEY" scripts/check-customers-collection-simple.js "$REMOTE_USER@$SERVER_IP:$REMOTE_DIR/"

# Run the check on AWS
echo "🔌 Running check on AWS..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'EOF'
    cd /home/ec2-user/rave
    
    # Load environment variables
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    
    # Run the check
    node check-customers-collection-simple.js
EOF

echo ""
echo "✅ Check complete!"

