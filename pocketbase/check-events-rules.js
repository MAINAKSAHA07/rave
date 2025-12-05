
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
    console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

console.log(`POCKETBASE_URL: ${process.env.POCKETBASE_URL}`);
console.log(`NEXT_PUBLIC_POCKETBASE_URL: ${process.env.NEXT_PUBLIC_POCKETBASE_URL}`);

async function checkEventsRules() {
    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        const collection = await pb.collections.getOne('events');
        console.log(`Events Collection ID: ${collection.id}`);
        console.log('Events Collection Rules:');
        console.log(`- List Rule: ${collection.listRule}`);
        console.log(`- View Rule: ${collection.viewRule}`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkEventsRules();
