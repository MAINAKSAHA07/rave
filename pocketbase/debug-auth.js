/**
 * Debug Authentication to AWS PocketBase
 * 
 * This script helps debug authentication issues
 */

const PocketBase = require('pocketbase/cjs');
const path = require('path');
const { config } = require('dotenv');
const fs = require('fs');

console.log('🔍 Debugging PocketBase Authentication\n');

// Check .env file location
const envPath = path.resolve(__dirname, '../.env');
console.log('📁 Looking for .env at:', envPath);
console.log('   Exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasEmail = envContent.includes('POCKETBASE_ADMIN_EMAIL');
    const hasPassword = envContent.includes('POCKETBASE_ADMIN_PASSWORD');
    console.log('   Contains POCKETBASE_ADMIN_EMAIL:', hasEmail);
    console.log('   Contains POCKETBASE_ADMIN_PASSWORD:', hasPassword);
}

// Load .env
config({ path: envPath });

const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://13.201.90.240:8092';
// Support AWS-specific credentials, fallback to general credentials
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

console.log('\n📋 Environment Variables:');
console.log('   POCKETBASE_URL:', process.env.POCKETBASE_URL || 'NOT SET');
console.log('   AWS_POCKETBASE_URL:', process.env.AWS_POCKETBASE_URL || 'NOT SET');
console.log('   AWS_POCKETBASE_ADMIN_EMAIL:', process.env.AWS_POCKETBASE_ADMIN_EMAIL || 'NOT SET');
console.log('   AWS_POCKETBASE_ADMIN_PASSWORD:', process.env.AWS_POCKETBASE_ADMIN_PASSWORD ? '***' : 'NOT SET');
console.log('   POCKETBASE_ADMIN_EMAIL:', process.env.POCKETBASE_ADMIN_EMAIL || 'NOT SET');
console.log('   POCKETBASE_ADMIN_PASSWORD:', process.env.POCKETBASE_ADMIN_PASSWORD ? '***' : 'NOT SET');
console.log('\n📡 Using:');
console.log('   PocketBase URL:', pbUrl);
console.log('   Admin Email:', adminEmail || 'NOT SET');
console.log('   Admin Password:', adminPassword ? '***' : 'NOT SET');

if (!adminEmail || !adminPassword) {
    console.error('\n❌ Missing credentials!');
    console.error('   Make sure .env file has one of these:');
    console.error('   Option 1 (AWS-specific):');
    console.error('   AWS_POCKETBASE_ADMIN_EMAIL=your_email@example.com');
    console.error('   AWS_POCKETBASE_ADMIN_PASSWORD=your_password');
    console.error('   Option 2 (General):');
    console.error('   POCKETBASE_ADMIN_EMAIL=your_email@example.com');
    console.error('   POCKETBASE_ADMIN_PASSWORD=your_password');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function testAuth() {
    try {
        console.log('\n🔐 Attempting authentication...');
        console.log('   Email:', adminEmail);
        console.log('   Password:', '***');
        
        const authData = await pb.admins.authWithPassword(adminEmail, adminPassword);
        
        console.log('\n✅ Authentication successful!');
        console.log('   Admin ID:', authData.admin.id);
        console.log('   Admin Email:', authData.admin.email);
        
        // Test API access
        console.log('\n📦 Testing API access...');
        const collections = await pb.collections.getFullList();
        console.log(`   Found ${collections.length} collections`);
        
        console.log('\n✅ All tests passed!');
        
    } catch (error) {
        console.error('\n❌ Authentication failed!');
        console.error('   Error message:', error.message);
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Status Text:', error.response.statusText);
            console.error('   Response:', JSON.stringify(error.response.data || {}, null, 2));
        }
        
        if (error.originalError) {
            console.error('   Original Error:', error.originalError.message);
        }
        
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Verify you can access the admin UI:');
        console.error(`      ${pbUrl}/_/`);
        console.error('   2. Try logging in manually with the same credentials');
        console.error('   3. Check if the email/password are correct');
        console.error('   4. Verify PocketBase is running:');
        console.error('      ssh -i ./ravem.pem ec2-user@13.201.90.240 "sudo docker ps | grep rave-pb"');
        
        process.exit(1);
    }
}

testAuth();

