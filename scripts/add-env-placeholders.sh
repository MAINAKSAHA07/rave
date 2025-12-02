#!/bin/bash

# Script to add Google OAuth placeholders to .env file if they don't exist

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your actual values."
    exit 0
fi

# Check if Google OAuth variables exist
if ! grep -q "GOOGLE_OAUTH_CLIENT_ID" "$ENV_FILE"; then
    echo "Adding Google OAuth placeholders to .env file..."
    
    # Add Google OAuth section before Razorpay section
    if grep -q "RAZORPAY_KEY_ID" "$ENV_FILE"; then
        # Insert before Razorpay section
        sed -i.bak '/^# ============================================$/a\
# ============================================\
# Google OAuth Configuration (for Customer Login)\
# ============================================\
# Get these from Google Cloud Console: https://console.cloud.google.com/\
# 1. Create OAuth 2.0 Client ID\
# 2. Add redirect URI: http://127.0.0.1:8092/api/oauth2-redirect (dev)\
# 3. Configure in PocketBase Admin UI: Settings > Auth providers > Google\
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here\
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here\
# OAuth Redirect URL (configured in PocketBase, not here)\
# Development: http://127.0.0.1:8092/api/oauth2-redirect\
# Production: https://your-domain.com/api/oauth2-redirect\
' "$ENV_FILE"
        echo "✅ Added Google OAuth placeholders to .env file"
    else
        # Append to end of file
        cat >> "$ENV_FILE" << 'EOF'

# ============================================
# Google OAuth Configuration (for Customer Login)
# ============================================
# Get these from Google Cloud Console: https://console.cloud.google.com/
# 1. Create OAuth 2.0 Client ID
# 2. Add redirect URI: http://127.0.0.1:8092/api/oauth2-redirect (dev)
# 3. Configure in PocketBase Admin UI: Settings > Auth providers > Google
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here
# OAuth Redirect URL (configured in PocketBase, not here)
# Development: http://127.0.0.1:8092/api/oauth2-redirect
# Production: https://your-domain.com/api/oauth2-redirect
EOF
        echo "✅ Added Google OAuth placeholders to .env file"
    fi
else
    echo "✅ Google OAuth placeholders already exist in .env file"
fi

echo ""
echo "📝 Next steps:"
echo "1. Get Google OAuth credentials from: https://console.cloud.google.com/"
echo "2. Update GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env"
echo "3. Configure Google OAuth in PocketBase Admin UI"
echo "4. See docs/google-oauth-setup.md for detailed instructions"

