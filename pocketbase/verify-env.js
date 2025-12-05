
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

console.log('--- Environment Variable Verification ---');
if (clientId) {
    console.log(`GOOGLE_OAUTH_CLIENT_ID found.`);
    console.log(`Length: ${clientId.length}`);
    console.log(`Start: ${clientId.substring(0, 10)}...`);
    console.log(`End: ...${clientId.substring(clientId.length - 5)}`);
    // Check for whitespace
    if (clientId.trim() !== clientId) {
        console.warn('⚠️ WARNING: Client ID has leading/trailing whitespace!');
    }
} else {
    console.error('❌ GOOGLE_OAUTH_CLIENT_ID is missing!');
}

if (clientSecret) {
    console.log(`GOOGLE_OAUTH_CLIENT_SECRET found.`);
    console.log(`Length: ${clientSecret.length}`);
    console.log(`Start: ${clientSecret.substring(0, 5)}...`);
    // Check for whitespace
    if (clientSecret.trim() !== clientSecret) {
        console.warn('⚠️ WARNING: Client Secret has leading/trailing whitespace!');
    }
} else {
    console.error('❌ GOOGLE_OAUTH_CLIENT_SECRET is missing!');
}

const pbUrl = process.env.POCKETBASE_URL;
if (pbUrl) {
    console.log(`POCKETBASE_URL: ${pbUrl}`);
} else {
    console.log('POCKETBASE_URL is missing, defaulting to http://127.0.0.1:8092');
}
