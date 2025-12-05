
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function simplifyEventsRule() {
    try {
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        console.log('Updating "events" rule to simple version...');
        await pb.collections.update('events', {
            listRule: "status = 'published'",
            viewRule: "status = 'published'",
        });
        console.log('✅ Events rule updated to: status = "published"');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

simplifyEventsRule();
