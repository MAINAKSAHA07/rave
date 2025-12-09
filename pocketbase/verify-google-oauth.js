require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');
const http = require('http');

// Auto-detect AWS or local PocketBase URL
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
    // Default to local
    return 'http://127.0.0.1:8092';
}

const pbUrl = getPocketBaseUrl();
const pb = new PocketBase(pbUrl);

// Get admin credentials (prioritize AWS credentials)
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

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

async function verifyGoogleOAuth() {
    try {
        const isAWS = pbUrl.includes('13.201.90.240') || pbUrl.includes('aws');
        console.log('Checking Google OAuth configuration...\n');
        console.log(`PocketBase URL: ${pbUrl}`);
        if (isAWS) {
            console.log('🌐 AWS Mode Detected\n');
        } else {
            console.log('💻 Local Mode Detected\n');
        }
        
        // Check if PocketBase is running
        const isRunning = await checkPocketBaseRunning(pbUrl);
        if (!isRunning) {
            console.error(`❌ Error: Cannot connect to PocketBase at ${pbUrl}`);
            console.error('   PocketBase is not running or not accessible.');
            if (isAWS) {
                console.error('\n   To start PocketBase on AWS:');
                console.error('   ssh -i ravem.pem ec2-user@13.201.90.240');
                console.error('   cd /home/ec2-user/rave');
                console.error('   sudo docker-compose up -d pocketbase');
            } else {
                console.error('\n   To start PocketBase:');
                console.error('   1. Start Docker Desktop (if using Docker)');
                console.error('   2. Then run: docker-compose up -d pocketbase');
                console.error('   3. Or start PocketBase manually if not using Docker');
            }
            return;
        }
        
        console.log('✅ PocketBase is running\n');
        
        // Check auth methods (no auth needed for listAuthMethods)
        const authMethods = await pb.collection('customers').listAuthMethods();
        
        console.log('Available OAuth Providers:', authMethods.authProviders?.map(p => p.name).join(', ') || 'none');
        
        const googleProvider = authMethods.authProviders?.find(p => p.name === 'google');
        
        if (!googleProvider) {
            console.log('\n❌ Google OAuth provider is NOT configured.');
            console.log('   Please configure it in PocketBase Admin UI: Settings > Auth Providers > Google');
            return;
        }
        
        console.log('\n✅ Google OAuth provider is configured.');
        console.log('   Client ID:', googleProvider.clientId ? `${googleProvider.clientId.substring(0, 20)}...` : 'MISSING');
        console.log('   Auth URL:', googleProvider.authUrl);
        console.log('   Scope:', googleProvider.scope || 'not set');
        
        // Check environment variables
        const envClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const envClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        
        console.log('\n📋 Environment Variables:');
        console.log('   GOOGLE_OAUTH_CLIENT_ID:', envClientId ? `${envClientId.substring(0, 20)}...` : 'NOT SET');
        console.log('   GOOGLE_OAUTH_CLIENT_SECRET:', envClientSecret ? 'SET (hidden)' : 'NOT SET');
        
        // Verify client ID matches
        if (envClientId && googleProvider.clientId && envClientId.trim() !== googleProvider.clientId.trim()) {
            console.log('\n⚠️  WARNING: Client ID in PocketBase does not match environment variable!');
            console.log('   PocketBase:', googleProvider.clientId.substring(0, 20) + '...');
            console.log('   .env file:', envClientId.substring(0, 20) + '...');
            console.log('   Run: node configure-google-auth.js to sync them');
        }
        
        // Check redirect URI requirements
        console.log('\n📝 Important: Make sure these redirect URIs are configured in Google Cloud Console:');
        if (isAWS) {
            console.log('   - http://13.201.90.240:3000/auth/callback (for AWS frontend)');
            console.log('   - https://yourdomain.com/auth/callback (for production domain)');
        } else {
            console.log('   - http://localhost:3000/auth/callback (for local development)');
            console.log('   - https://yourdomain.com/auth/callback (for production)');
        }
        console.log('\n   Google Cloud Console: https://console.cloud.google.com/apis/credentials');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.data) {
            console.error('Error data:', JSON.stringify(error.data, null, 2));
        }
    }
}

verifyGoogleOAuth();
