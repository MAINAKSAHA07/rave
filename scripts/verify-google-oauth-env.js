#!/usr/bin/env node

/**
 * Google OAuth Environment Variable Verification Script
 * 
 * This script verifies that your Google OAuth environment variables
 * are configured correctly according to best practices.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

console.log('🔍 Google OAuth Environment Variable Verification\n');
console.log('='.repeat(60));

// Check NEXT_PUBLIC_GOOGLE_CLIENT_ID (required for client-side)
const nextPublicClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
console.log('\n1. NEXT_PUBLIC_GOOGLE_CLIENT_ID (Client-side):');
if (nextPublicClientId) {
  console.log('   ✅ Found');
  console.log(`   Value: ${nextPublicClientId.substring(0, 30)}...${nextPublicClientId.substring(nextPublicClientId.length - 20)}`);
  console.log(`   Length: ${nextPublicClientId.length} characters`);
  
  if (nextPublicClientId.endsWith('.apps.googleusercontent.com')) {
    console.log('   ✅ Valid format (ends with .apps.googleusercontent.com)');
  } else {
    console.log('   ❌ INVALID FORMAT - Must end with .apps.googleusercontent.com');
  }
  
  if (nextPublicClientId.startsWith('GOCSPX-')) {
    console.log('   ❌ ERROR: This looks like a CLIENT SECRET, not a CLIENT ID!');
    console.log('   Client IDs end with .apps.googleusercontent.com');
    console.log('   Client Secrets start with GOCSPX-');
  }
} else {
  console.log('   ❌ NOT SET');
  console.log('   This is REQUIRED for client-side Google Sign-In');
}

// Check GOOGLE_OAUTH_CLIENT_ID (server-side)
const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
console.log('\n2. GOOGLE_OAUTH_CLIENT_ID (Server-side):');
if (oauthClientId) {
  console.log('   ✅ Found');
  console.log(`   Value: ${oauthClientId.substring(0, 30)}...${oauthClientId.substring(oauthClientId.length - 20)}`);
  console.log(`   Length: ${oauthClientId.length} characters`);
  
  if (oauthClientId.endsWith('.apps.googleusercontent.com')) {
    console.log('   ✅ Valid format');
  } else {
    console.log('   ❌ INVALID FORMAT');
  }
  
  // Check if they match
  if (nextPublicClientId && oauthClientId && nextPublicClientId !== oauthClientId) {
    console.log('   ⚠️  WARNING: Different from NEXT_PUBLIC_GOOGLE_CLIENT_ID');
    console.log('   They should match unless you have different clients for client/server');
  } else if (nextPublicClientId && oauthClientId && nextPublicClientId === oauthClientId) {
    console.log('   ✅ Matches NEXT_PUBLIC_GOOGLE_CLIENT_ID');
  }
} else {
  console.log('   ⚠️  NOT SET (optional if using NEXT_PUBLIC_GOOGLE_CLIENT_ID)');
}

// Check GOOGLE_OAUTH_CLIENT_SECRET
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
console.log('\n3. GOOGLE_OAUTH_CLIENT_SECRET (Server-side only):');
if (clientSecret) {
  console.log('   ✅ Found');
  console.log(`   Value: ${clientSecret.substring(0, 10)}... (hidden)`);
  console.log(`   Length: ${clientSecret.length} characters`);
  
  if (clientSecret.startsWith('GOCSPX-')) {
    console.log('   ✅ Valid format (starts with GOCSPX-)');
  } else {
    console.log('   ⚠️  WARNING: Doesn\'t start with GOCSPX-');
    console.log('   Google Client Secrets usually start with GOCSPX-');
  }
  
  if (clientSecret.endsWith('.apps.googleusercontent.com')) {
    console.log('   ❌ ERROR: This looks like a CLIENT ID, not a CLIENT SECRET!');
    console.log('   Client IDs end with .apps.googleusercontent.com');
    console.log('   Client Secrets start with GOCSPX-');
  }
} else {
  console.log('   ⚠️  NOT SET (required for server-side OAuth)');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📋 Summary:');

const issues = [];
const warnings = [];

if (!nextPublicClientId) {
  issues.push('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
} else if (!nextPublicClientId.endsWith('.apps.googleusercontent.com')) {
  issues.push('NEXT_PUBLIC_GOOGLE_CLIENT_ID has invalid format');
} else if (nextPublicClientId.startsWith('GOCSPX-')) {
  issues.push('NEXT_PUBLIC_GOOGLE_CLIENT_ID appears to be a SECRET, not an ID');
}

if (clientSecret && !clientSecret.startsWith('GOCSPX-')) {
  warnings.push('GOOGLE_OAUTH_CLIENT_SECRET format may be incorrect');
}

if (nextPublicClientId && oauthClientId && nextPublicClientId !== oauthClientId) {
  warnings.push('Client IDs don\'t match (may be intentional)');
}

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Your configuration looks good.');
  console.log('\n📝 Next steps:');
  console.log('   1. Restart your Next.js dev server (not just hot reload)');
  console.log('   2. Check browser console for debug logs');
  console.log('   3. Verify the Client ID exists in Google Cloud Console');
  console.log('   4. Make sure Authorized JavaScript origins include your domain');
} else {
  if (issues.length > 0) {
    console.log('\n❌ Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }
}

console.log('\n🔗 Google Cloud Console:');
console.log('   https://console.cloud.google.com/apis/credentials');
console.log(`\n📌 Expected Client ID format:`);
console.log(`   xxxxxx-xxxxx.apps.googleusercontent.com`);
console.log(`\n📌 Expected Client Secret format:`);
console.log(`   GOCSPX-xxxxx`);

