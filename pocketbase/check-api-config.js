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
const isAWS = pbUrl.includes('13.201.90.240') || pbUrl.includes('aws');

// Ping PocketBase health endpoint
function pingPocketBase(url) {
    return new Promise((resolve) => {
        const testUrl = new URL(url);
        const startTime = Date.now();
        const options = {
            hostname: testUrl.hostname,
            port: testUrl.port || (testUrl.protocol === 'https:' ? 443 : 80),
            path: '/api/health',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            const responseTime = Date.now() - startTime;
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    success: res.statusCode === 200,
                    statusCode: res.statusCode,
                    responseTime,
                    data: data ? JSON.parse(data) : null
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Connection timeout',
                responseTime: Date.now() - startTime
            });
        });

        req.end();
    });
}

// Check OAuth configuration
async function checkOAuthConfig() {
    try {
        const pb = new PocketBase(pbUrl);
        const authMethods = await pb.collection('customers').listAuthMethods();
        
        return {
            success: true,
            authProviders: authMethods.authProviders || [],
            googleProvider: authMethods.authProviders?.find(p => p.name === 'google') || null
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function checkAPI() {
    console.log('🔍 Checking PocketBase API Configuration...\n');
    console.log(`📍 PocketBase URL: ${pbUrl}`);
    if (isAWS) {
        console.log('🌐 AWS Mode Detected\n');
    } else {
        console.log('💻 Local Mode Detected\n');
    }

    // Step 1: Ping PocketBase
    console.log('1️⃣  Pinging PocketBase...');
    const pingResult = await pingPocketBase(pbUrl);
    
    if (pingResult.success) {
        console.log(`   ✅ PocketBase is reachable`);
        console.log(`   📊 Response time: ${pingResult.responseTime}ms`);
        console.log(`   📡 Status code: ${pingResult.statusCode}`);
        if (pingResult.data) {
            console.log(`   📋 Health status: ${JSON.stringify(pingResult.data)}`);
        }
    } else {
        console.log(`   ❌ Cannot reach PocketBase`);
        console.log(`   ⚠️  Error: ${pingResult.error || 'Unknown error'}`);
        console.log(`   ⏱️  Response time: ${pingResult.responseTime}ms`);
        if (isAWS) {
            console.log('\n   💡 To start PocketBase on AWS:');
            console.log('      ssh -i ravem.pem ec2-user@13.201.90.240');
            console.log('      cd /home/ec2-user/rave');
            console.log('      sudo docker-compose up -d pocketbase');
        } else {
            console.log('\n   💡 To start PocketBase locally:');
            console.log('      docker-compose up -d pocketbase');
        }
        return;
    }

    console.log('\n2️⃣  Checking OAuth Configuration...');
    const oauthConfig = await checkOAuthConfig();
    
    if (!oauthConfig.success) {
        console.log(`   ❌ Error checking OAuth: ${oauthConfig.error}`);
        return;
    }

    console.log(`   📋 Available OAuth Providers: ${oauthConfig.authProviders.map(p => p.name).join(', ') || 'none'}`);
    
    if (!oauthConfig.googleProvider) {
        console.log('\n   ❌ Google OAuth is NOT configured');
        console.log('   📝 To configure:');
        if (isAWS) {
            console.log('      node configure-google-auth-aws.js');
        } else {
            console.log('      node configure-google-auth.js');
        }
        return;
    }

    console.log('\n   ✅ Google OAuth is configured');
    
    // Extract client ID from authUrl if not directly available
    let clientId = oauthConfig.googleProvider.clientId;
    if (!clientId && oauthConfig.googleProvider.authUrl) {
        try {
            const url = new URL(oauthConfig.googleProvider.authUrl);
            clientId = url.searchParams.get('client_id') || 'Not found in URL';
        } catch (e) {
            clientId = 'Unable to parse from URL';
        }
    }
    
    console.log(`   🔑 Client ID: ${clientId ? (typeof clientId === 'string' && clientId.length > 30 ? clientId.substring(0, 30) + '...' : clientId) : 'MISSING'}`);
    console.log(`   🌐 Auth URL: ${oauthConfig.googleProvider.authUrl ? oauthConfig.googleProvider.authUrl.substring(0, 80) + '...' : 'Not set'}`);
    console.log(`   📜 Scope: ${oauthConfig.googleProvider.scope || 'not set'}`);

    // Check environment variables
    console.log('\n3️⃣  Checking Environment Variables...');
    const envClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    
    console.log(`   ${envClientId ? '✅' : '❌'} GOOGLE_OAUTH_CLIENT_ID: ${envClientId ? envClientId.substring(0, 30) + '...' : 'NOT SET'}`);
    console.log(`   ${envClientSecret ? '✅' : '❌'} GOOGLE_OAUTH_CLIENT_SECRET: ${envClientSecret ? 'SET (hidden)' : 'NOT SET'}`);

    // Verify match - extract client ID from authUrl if needed
    let configuredClientId = oauthConfig.googleProvider.clientId;
    if (!configuredClientId && oauthConfig.googleProvider.authUrl) {
        try {
            const url = new URL(oauthConfig.googleProvider.authUrl);
            configuredClientId = url.searchParams.get('client_id');
        } catch (e) {
            // Ignore parsing errors
        }
    }
    
    if (envClientId && configuredClientId) {
        if (envClientId.trim() === configuredClientId.trim()) {
            console.log('   ✅ Client ID matches environment variable');
        } else {
            console.log('   ⚠️  WARNING: Client ID in PocketBase does NOT match .env file');
            console.log('      PocketBase:', configuredClientId.substring(0, 30) + '...');
            console.log('      .env file:', envClientId.substring(0, 30) + '...');
            console.log('   💡 Run configuration script to sync them');
        }
    }

    // Check admin credentials
    console.log('\n4️⃣  Checking Admin Credentials...');
    const adminEmail = isAWS 
        ? (process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL)
        : process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = isAWS
        ? (process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD)
        : process.env.POCKETBASE_ADMIN_PASSWORD;
    
    console.log(`   ${adminEmail ? '✅' : '❌'} Admin Email: ${adminEmail ? adminEmail.substring(0, 20) + '...' : 'NOT SET'}`);
    console.log(`   ${adminPassword ? '✅' : '❌'} Admin Password: ${adminPassword ? 'SET (hidden)' : 'NOT SET'}`);

    // Test admin authentication
    if (adminEmail && adminPassword) {
        console.log('\n5️⃣  Testing Admin Authentication...');
        try {
            const pb = new PocketBase(pbUrl);
            await pb.admins.authWithPassword(adminEmail, adminPassword);
            console.log('   ✅ Admin authentication successful');
        } catch (error) {
            console.log(`   ❌ Admin authentication failed: ${error.message}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Configuration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ PocketBase: ${pingResult.success ? 'Reachable' : 'Not reachable'}`);
    console.log(`✅ Google OAuth: ${oauthConfig.googleProvider ? 'Configured' : 'Not configured'}`);
    console.log(`✅ Environment Variables: ${envClientId && envClientSecret ? 'Set' : 'Missing'}`);
    console.log(`✅ Admin Credentials: ${adminEmail && adminPassword ? 'Set' : 'Missing'}`);
    
    if (pingResult.success && oauthConfig.googleProvider && envClientId && envClientSecret) {
        console.log('\n🎉 All checks passed! Google OAuth should be working.');
        console.log('\n📝 Make sure redirect URIs are configured in Google Cloud Console:');
        if (isAWS) {
            console.log('   - http://13.201.90.240:3000/auth/callback');
        } else {
            console.log('   - http://localhost:3000/auth/callback');
        }
        console.log('   - https://yourdomain.com/auth/callback (for production)');
    } else {
        console.log('\n⚠️  Some configuration is missing. Please check the errors above.');
    }
    console.log('='.repeat(60));

}

async function main() {
    try {
        await checkAPI();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.data) {
            console.error('Error data:', JSON.stringify(error.data, null, 2));
        }
    }
}

main();
