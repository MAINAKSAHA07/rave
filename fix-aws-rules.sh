#!/bin/bash

# Fix AWS PocketBase Access Rules for Super Admin
# This ensures super_admin has full access to all collections

set -e

echo "🔧 Fixing AWS PocketBase access rules for super_admin..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Navigate to pocketbase directory
cd pocketbase

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run fix script
echo "🚀 Updating access rules..."
echo ""

node fix-aws-access-rules.js

echo ""
echo "✅ Access rules updated!"
