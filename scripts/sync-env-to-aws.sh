#!/bin/bash

# Script to sync specific environment variables from local .env to AWS
# Usage: ./scripts/sync-env-to-aws.sh

set -e

SERVER_IP="13.201.90.240"
SSH_KEY="./ravem.pem"
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/rave"
LOCAL_ENV=".env"

echo "🔄 Syncing environment variables to AWS..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Check if local .env exists
if [ ! -f "$LOCAL_ENV" ]; then
    echo "⚠️  Local .env file not found. Will only check AWS .env"
    LOCAL_ENV=""
fi

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY"

# Variables to sync (in order of priority)
VARS_TO_SYNC=(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
    "GOOGLE_OAUTH_CLIENT_ID"
    "AWS_POCKETBASE_URL"
    "NEXT_PUBLIC_POCKETBASE_URL"
    "AWS_POCKETBASE_ADMIN_EMAIL"
    "AWS_POCKETBASE_ADMIN_PASSWORD"
    "POCKETBASE_ADMIN_EMAIL"
    "POCKETBASE_ADMIN_PASSWORD"
)

# Function to get value from local .env
get_local_value() {
    local var_name="$1"
    if [ -f "$LOCAL_ENV" ]; then
        grep "^${var_name}=" "$LOCAL_ENV" 2>/dev/null | cut -d '=' -f2- | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/"
    fi
}

# Connect to AWS and update .env
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << EOF
    set -e
    cd $REMOTE_DIR || {
        echo "❌ Project directory not found"
        exit 1
    }
    
    echo "📋 Updating .env file on AWS..."
    echo ""
    
    # Ensure .env file exists
    touch .env
    
    # Backup existing .env
    if [ -f ".env" ]; then
        cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)
        echo "✅ Backed up existing .env file"
    fi
EOF

# Sync each variable
for var in "${VARS_TO_SYNC[@]}"; do
    local_value=$(get_local_value "$var")
    
    if [ -n "$local_value" ]; then
        echo "📤 Syncing $var..."
        ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << EOF
            cd $REMOTE_DIR
            # Remove existing line if present
            sed -i "/^${var}=/d" .env
            # Add new value
            echo "${var}=${local_value}" >> .env
EOF
    else
        echo "⏭️  Skipping $var (not found in local .env)"
    fi
done

# Final check and display
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'FINALCHECK'
    cd /home/ec2-user/rave
    
    echo ""
    echo "✅ Environment variables synced!"
    echo ""
    echo "📋 Current .env file (sensitive values hidden):"
    echo "----------------------------------------"
    cat .env | sed 's/\(PASSWORD\|SECRET\|KEY\)=.*/\1=***HIDDEN***/g'
    echo "----------------------------------------"
    echo ""
    echo "💡 To manually edit:"
    echo "   ssh -i ravem.pem ec2-user@13.201.90.240"
    echo "   cd /home/ec2-user/rave"
    echo "   nano .env"
FINALCHECK

echo ""
echo "✅ Done! Environment variables synced to AWS."
echo ""
echo "🔄 To restart services with new env vars:"
echo "   ssh -i ravem.pem ec2-user@13.201.90.240 'cd /home/ec2-user/rave && pm2 restart all'"
