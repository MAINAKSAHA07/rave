#!/bin/bash

# Setup AWS Users Collection with Superadmin Access
# This script adds role, backoffice_access, and can_manage_roles fields to users collection

set -e

echo "🔧 Setting up AWS users collection with superadmin access..."
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

# Run setup script
echo "🚀 Running users collection setup..."
echo ""

node setup-aws-users.js

echo ""
echo "✅ Setup complete!"

