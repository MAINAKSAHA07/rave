#!/bin/bash

# Sync AWS PocketBase Database with Local Schema
# This script runs all migrations on the AWS PocketBase instance

set -e

echo "🔄 Syncing AWS PocketBase database with local schema..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Please create .env file with:"
    echo "   - AWS_POCKETBASE_ADMIN_EMAIL (or POCKETBASE_ADMIN_EMAIL)"
    echo "   - AWS_POCKETBASE_ADMIN_PASSWORD (or POCKETBASE_ADMIN_PASSWORD)"
    echo "   - AWS_POCKETBASE_URL (optional, defaults to http://13.201.90.240:8092)"
    exit 1
fi

# Navigate to pocketbase directory
cd pocketbase

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run sync script
echo "🚀 Running database sync..."
echo ""

# Set AWS URL if not already set
export AWS_POCKETBASE_URL=${AWS_POCKETBASE_URL:-"http://13.201.90.240:8092"}

node sync-aws-db.js

echo ""
echo "✅ Sync complete!"

