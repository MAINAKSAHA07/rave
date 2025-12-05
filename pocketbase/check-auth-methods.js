
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const pb = new PocketBase(pbUrl);

async function checkAuthMethods() {
    try {
        console.log('Checking auth methods for "customers" collection...');
        const result = await pb.collection('customers').listAuthMethods();

        console.log('Auth Providers:', result.authProviders.map(p => p.name));
        console.log('Username/Password:', result.usernamePassword);
        console.log('Email/Password:', result.emailPassword);

        const googleProvider = result.authProviders.find(p => p.name === 'google');
        if (googleProvider) {
            console.log('✅ Google provider is enabled.');
            console.log('   ClientId:', googleProvider.clientId);
            console.log('   AuthUrl:', googleProvider.authUrl);
        } else {
            console.log('❌ Google provider is NOT enabled for "customers" collection.');
            console.log('   You need to configure it in the PocketBase Admin UI under Settings > Auth Providers.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkAuthMethods();
