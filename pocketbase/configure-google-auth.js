
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');
const http = require('http');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
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
            timeout: 2000
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
    console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

if (!googleClientId || !googleClientSecret) {
    console.error('Error: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in .env');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function configureGoogleAuth() {
    try {
        // Check if PocketBase is running
        console.log(`Checking if PocketBase is running at ${pbUrl}...`);
        const isRunning = await checkPocketBaseRunning(pbUrl);
        
        if (!isRunning) {
            console.error(`\n❌ Error: Cannot connect to PocketBase at ${pbUrl}`);
            console.error('   PocketBase is not running or not accessible.');
            console.error('\n   To start PocketBase:');
            console.error('   1. Start Docker Desktop (if using Docker)');
            console.error('   2. Then run: docker-compose up -d pocketbase');
            console.error('   3. Or start PocketBase manually if not using Docker');
            console.error(`\n   Make sure POCKETBASE_URL in .env matches your PocketBase instance.`);
            console.error(`   Current POCKETBASE_URL: ${pbUrl}`);
            console.error('\n   Common ports:');
            console.error('   - Docker: http://127.0.0.1:8090 or http://127.0.0.1:8092');
            console.error('   - Local: http://127.0.0.1:8090');
            console.error('   - Remote: Check your server configuration');
            process.exit(1);
        }

        console.log('✅ PocketBase is running\n');
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        console.log('Fetching current settings...');
        const settings = await pb.settings.getAll();

        console.log('Updating Google Auth settings...');

        // Update Google Auth settings
        // Note: The key might be 'googleAuth' or inside 'authProviders' depending on version.
        // For standard PocketBase, it's usually top-level keys like { googleAuth: { enabled: true, ... } }

        // Try sending ONLY the googleAuth update. 
        // PocketBase Go API usually merges top-level keys if they are provided, 
        // but if it expects a full object, we might need to sanitize the existing one.
        // However, let's try sending just the part we want to change first.

        const updatePayload = {
            googleAuth: {
                enabled: true,
                clientId: googleClientId,
                clientSecret: googleClientSecret,
            }
        };

        await pb.settings.update(updatePayload);
        console.log('✅ Google Auth configured successfully!');
        console.log(`   Client ID: ${googleClientId.substring(0, 10)}...`);

    } catch (error) {
        console.error('❌ Error:', error);
        if (error.data) {
            console.error('Error data:', JSON.stringify(error.data, null, 2));
        }
    }
}

configureGoogleAuth();
