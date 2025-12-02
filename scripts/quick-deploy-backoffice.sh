#!/bin/bash

# Quick deploy backoffice to Netlify
# Make sure you're in the project root and logged in to Netlify

set -e

echo "🚀 Quick Deploy: Backoffice to Netlify"

cd backoffice

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📥 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Build
echo "📦 Building backoffice..."
npm run build

# Deploy
echo "🌐 Deploying to Netlify..."
netlify deploy --prod --dir=.next

echo "✅ Backoffice deployed!"


# Quick deploy backoffice to Netlify
# Make sure you're in the project root and logged in to Netlify

set -e

echo "🚀 Quick Deploy: Backoffice to Netlify"

cd backoffice

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📥 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Build
echo "📦 Building backoffice..."
npm run build

# Deploy
echo "🌐 Deploying to Netlify..."
netlify deploy --prod --dir=.next

echo "✅ Backoffice deployed!"

