#!/bin/bash

# Deploy Backoffice to Netlify
# Make sure you're logged in: netlify login

set -e

echo "🚀 Deploying Backoffice to Netlify..."

cd backoffice

# Build the project
echo "📦 Building backoffice..."
npm run build

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod --dir=.next

echo "✅ Backoffice deployed successfully!"


# Deploy Backoffice to Netlify
# Make sure you're logged in: netlify login

set -e

echo "🚀 Deploying Backoffice to Netlify..."

cd backoffice

# Build the project
echo "📦 Building backoffice..."
npm run build

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod --dir=.next

echo "✅ Backoffice deployed successfully!"

