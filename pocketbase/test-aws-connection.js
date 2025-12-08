/**
 * Test AWS PocketBase Connection
 * 
 * This script tests if we can connect to AWS PocketBase and provides
 * helpful guidance if connection fails.
 */

const PocketBase = require('pocketbase/cjs');
const path = require('path');
const { config } = require('dotenv');

// Load .env from root
config({ path: path.resolve(__dirname, '../.env') });

const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://13.201.90.240:8092';
// Support AWS-specific credentials, fallback to general credentials
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function testConnection() {
    console.log(`🔗 Testing connection to: ${pbUrl}\n`);
    
    // Test 1: Basic connectivity
    try {
        const response = await fetch(`${pbUrl}/api/health`);
        if (response.ok) {
            console.log('✅ Server is reachable');
        } else {
            console.log('⚠️  Server responded but health check failed');
        }
    } catch (error) {
        console.error('❌ Cannot reach PocketBase server');
        console.error('   Error:', error.message);
        console.error('\n   Troubleshooting:');
        console.error('   1. Check if PocketBase is running: ssh into AWS and run "sudo docker ps | grep rave-pb"');
        console.error('   2. Check if port 8092 is open in AWS Security Group');
        console.error('   3. Verify the server IP is correct:', pbUrl);
        process.exit(1);
    }
    
    // Test 2: Admin UI accessibility
    try {
        const response = await fetch(`${pbUrl}/_/`);
        if (response.ok) {
            console.log('✅ Admin UI is accessible');
        }
    } catch (error) {
        console.log('⚠️  Admin UI might not be accessible');
    }
    
    // Test 3: Authentication
    if (!adminEmail || !adminPassword) {
        console.log('\n⚠️  Admin credentials not set in .env');
        console.log('   Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD');
        return;
    }
    
    console.log('\n🔐 Testing authentication...');
    try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authentication successful!');
        console.log('\n✅ All checks passed! You can now run sync-aws-db.js');
    } catch (error) {
        console.error('❌ Authentication failed');
        console.error('\n   This usually means:');
        console.error('   1. Admin account does not exist on AWS PocketBase');
        console.error('   2. Wrong email/password in .env file');
        console.error('\n   To create an admin account:');
        console.error(`   1. Open ${pbUrl}/_/ in your browser`);
        console.error('   2. Create an admin account (first-time setup)');
        console.error('   3. Use the same credentials in your .env file');
        console.error(`\n   Current .env values:`);
        console.error(`   POCKETBASE_ADMIN_EMAIL=${adminEmail}`);
        console.error(`   POCKETBASE_ADMIN_PASSWORD=${adminPassword ? '***' : 'NOT SET'}`);
    }
}

testConnection().catch(console.error);


