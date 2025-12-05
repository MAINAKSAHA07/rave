
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

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
