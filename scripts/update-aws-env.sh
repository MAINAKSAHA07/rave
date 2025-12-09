#!/bin/bash

# Script to check and update .env file on AWS server
# Usage: ./scripts/update-aws-env.sh

set -e

SERVER_IP="13.201.90.240"
SSH_KEY="./ravem.pem"
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/rave"

echo "🔍 Checking and updating .env file on AWS..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Set correct permissions for SSH key
chmod 400 "$SSH_KEY"

# Connect to AWS and check/update .env
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'ENVUPDATE'
    set -e
    cd /home/ec2-user/rave || {
        echo "❌ Project directory not found"
        exit 1
    }
    
    echo "📋 Current .env file contents:"
    echo "----------------------------------------"
    if [ -f ".env" ]; then
        # Show .env file (hiding sensitive values)
        cat .env | sed 's/\(PASSWORD\|SECRET\|KEY\)=.*/\1=***HIDDEN***/g' | head -50
        echo "----------------------------------------"
    else
        echo "⚠️  .env file not found. Creating new one..."
        touch .env
    fi
    
    echo ""
    echo "🔧 Checking required environment variables..."
    echo ""
    
    # Check for Google Sign-In variables
    if ! grep -q "NEXT_PUBLIC_GOOGLE_CLIENT_ID" .env 2>/dev/null; then
        echo "⚠️  NEXT_PUBLIC_GOOGLE_CLIENT_ID not found"
        echo "   Adding placeholder (you need to set the actual value)"
        echo "" >> .env
        echo "# Google Sign-In JavaScript Library Client ID" >> .env
        echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=" >> .env
    else
        echo "✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID found"
    fi
    
    if ! grep -q "^GOOGLE_OAUTH_CLIENT_ID" .env 2>/dev/null; then
        echo "⚠️  GOOGLE_OAUTH_CLIENT_ID not found"
        echo "   Adding placeholder (you need to set the actual value)"
        if ! grep -q "GOOGLE_OAUTH_CLIENT_ID" .env 2>/dev/null; then
            echo "GOOGLE_OAUTH_CLIENT_ID=" >> .env
        fi
    else
        echo "✅ GOOGLE_OAUTH_CLIENT_ID found"
    fi
    
    # Check for AWS PocketBase variables
    if ! grep -q "^AWS_POCKETBASE_URL" .env 2>/dev/null; then
        echo "⚠️  AWS_POCKETBASE_URL not found"
        echo "   Adding default: http://13.201.90.240:8090"
        echo "" >> .env
        echo "# AWS PocketBase Configuration" >> .env
        echo "AWS_POCKETBASE_URL=http://13.201.90.240:8090" >> .env
    else
        echo "✅ AWS_POCKETBASE_URL found"
    fi
    
    if ! grep -q "^NEXT_PUBLIC_POCKETBASE_URL" .env 2>/dev/null; then
        echo "⚠️  NEXT_PUBLIC_POCKETBASE_URL not found"
        echo "   Adding default: http://13.201.90.240:8090"
        echo "NEXT_PUBLIC_POCKETBASE_URL=http://13.201.90.240:8090" >> .env
    else
        echo "✅ NEXT_PUBLIC_POCKETBASE_URL found"
    fi
    
    if ! grep -q "^AWS_POCKETBASE_ADMIN_EMAIL" .env 2>/dev/null; then
        echo "⚠️  AWS_POCKETBASE_ADMIN_EMAIL not found"
        echo "   Adding placeholder (you need to set the actual value)"
        echo "" >> .env
        echo "# AWS PocketBase Admin Credentials" >> .env
        echo "AWS_POCKETBASE_ADMIN_EMAIL=" >> .env
    else
        echo "✅ AWS_POCKETBASE_ADMIN_EMAIL found"
    fi
    
    if ! grep -q "^AWS_POCKETBASE_ADMIN_PASSWORD" .env 2>/dev/null; then
        echo "⚠️  AWS_POCKETBASE_ADMIN_PASSWORD not found"
        echo "   Adding placeholder (you need to set the actual value)"
        echo "AWS_POCKETBASE_ADMIN_PASSWORD=" >> .env
    else
        echo "✅ AWS_POCKETBASE_ADMIN_PASSWORD found"
    fi
    
    echo ""
    echo "📝 Summary of required variables:"
    echo "----------------------------------------"
    echo "Required for Google Sign-In:"
    echo "  - NEXT_PUBLIC_GOOGLE_CLIENT_ID (your Google Client ID)"
    echo "  - GOOGLE_OAUTH_CLIENT_ID (same as above, or fallback)"
    echo ""
    echo "Required for PocketBase:"
    echo "  - AWS_POCKETBASE_URL (default: http://13.201.90.240:8090)"
    echo "  - NEXT_PUBLIC_POCKETBASE_URL (default: http://13.201.90.240:8090)"
    echo "  - AWS_POCKETBASE_ADMIN_EMAIL (your PocketBase admin email)"
    echo "  - AWS_POCKETBASE_ADMIN_PASSWORD (your PocketBase admin password)"
    echo ""
    echo "💡 To edit .env file on AWS:"
    echo "   ssh -i ravem.pem ec2-user@13.201.90.240"
    echo "   cd /home/ec2-user/rave"
    echo "   nano .env"
    echo ""
    echo "✅ .env file updated!"
ENVUPDATE

echo ""
echo "✅ Done! Check the output above for any missing variables."
echo ""
echo "📝 Next steps:"
echo "   1. SSH into AWS: ssh -i ravem.pem ec2-user@13.201.90.240"
echo "   2. Edit .env: cd /home/ec2-user/rave && nano .env"
echo "   3. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID with your Google Client ID"
echo "   4. Restart services if needed: pm2 restart all"
