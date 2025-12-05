
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function checkMoreRules() {
    try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const venues = await pb.collections.getOne('venues');
        console.log('--- Collection: venues ---');
        console.log(`List Rule: ${venues.listRule}`);
        console.log(`View Rule: ${venues.viewRule}`);

        const organizers = await pb.collections.getOne('organizers');
        console.log('--- Collection: organizers ---');
        console.log(`List Rule: ${organizers.listRule}`);
        console.log(`View Rule: ${organizers.viewRule}`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkMoreRules();
