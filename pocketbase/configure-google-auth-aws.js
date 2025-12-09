require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');
const http = require('http');

// AWS PocketBase URL - prioritize AWS URL, then check for AWS IP in NEXT_PUBLIC, then fallback
function getPocketBaseUrl() {
    if (process.env.AWS_POCKETBASE_URL) {
        return process.env.AWS_POCKETBASE_URL;
    }
    if (process.env.NEXT_PUBLIC_POCKETBASE_URL && process.env.NEXT_PUBLIC_POCKETBASE_URL.includes('13.201.90.240')) {
        return process.env.NEXT_PUBLIC_POCKETBASE_URL;
    }
    if (process.env.POCKETBASE_URL) {
        return process.env.POCKETBASE_URL;
    }
    // Default AWS URL
    return 'http://13.201.90.240:8090';
}

const pbUrl = getPocketBaseUrl();
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

// Check if PocketBase is running
function checkPocketBaseRunning(url) {
    return new Promise((resolve) => {
        const testUrl = new URL(url);
        const options = {
            hostname: testUrl.hostname,
            port: testUrl.port || (testUrl.protocol === 'https:' ? 443 : 80),
            path: '/api/health',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

if (!adminEmail || !adminPassword) {
    console.error('❌ Error: AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD (or POCKETBASE_ADMIN_EMAIL/PASSWORD) must be set in .env');
    console.error('   For AWS, use AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD');
    process.exit(1);
}

if (!googleClientId || !googleClientSecret) {
    console.error('❌ Error: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in .env');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function configureGoogleAuth() {
    try {
        console.log('🌐 Configuring Google OAuth for AWS PocketBase...');
        console.log(`📍 PocketBase URL: ${pbUrl}\n`);
        
        // Check if PocketBase is running
        console.log(`Checking if PocketBase is running at ${pbUrl}...`);
        const isRunning = await checkPocketBaseRunning(pbUrl);
        
        if (!isRunning) {
            console.error(`\n❌ Error: Cannot connect to PocketBase at ${pbUrl}`);
            console.error('   PocketBase is not running or not accessible.');
            console.error('\n   To start PocketBase on AWS:');
            console.error('   ssh -i ravem.pem ec2-user@13.201.90.240');
            console.error('   cd /home/ec2-user/rave');
            console.error('   sudo docker-compose up -d pocketbase');
            console.error(`\n   Make sure POCKETBASE_URL or AWS_POCKETBASE_URL in .env matches your AWS PocketBase instance.`);
            process.exit(1);
        }

        console.log('✅ PocketBase is running\n');
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        console.log('Fetching current settings...');
        const settings = await pb.settings.getAll();

        console.log('Updating Google Auth settings...');

        const updatePayload = {
            googleAuth: {
                enabled: true,
                clientId: googleClientId.trim(),
                clientSecret: googleClientSecret.trim(),
            }
        };

        await pb.settings.update(updatePayload);
        console.log('✅ Google Auth configured successfully!');
        console.log(`   Client ID: ${googleClientId.substring(0, 20)}...`);
        console.log(`   PocketBase URL: ${pbUrl}`);
        console.log('\n📝 Important: Make sure these redirect URIs are configured in Google Cloud Console:');
        console.log('   - http://13.201.90.240:3000/auth/callback (for AWS frontend)');
        console.log('   - https://yourdomain.com/auth/callback (for production domain)');
        console.log('\n   Google Cloud Console: https://console.cloud.google.com/apis/credentials');

    } catch (error) {
        console.error('❌ Error:', error.message || error);
        if (error.data) {
            console.error('Error data:', JSON.stringify(error.data, null, 2));
        }
        if (error.status === 0) {
            console.error('\n💡 Tip: This might be a connection issue. Check:');
            console.error('   1. PocketBase is running on AWS');
            console.error('   2. Security groups allow access to port 8090');
            console.error('   3. The URL is correct in your .env file');
        }
        process.exit(1);
    }
}

configureGoogleAuth();
