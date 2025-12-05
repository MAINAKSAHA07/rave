
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function checkEvents() {
    try {
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        console.log('Fetching events...');
        const events = await pb.collection('events').getFullList();

        if (events.length === 0) {
            console.log('No events found in the database.');
        } else {
            console.log(`Found ${events.length} events:`);
            events.forEach(e => {
                console.log(`- ID: ${e.id}`);
                console.log(`  Name: ${e.name}`);
                console.log(`  Status: "${e.status}"`);
                console.log(`  Start Date: ${e.start_date}`);
                console.log(`  Visibility: ${e.visibility || 'N/A'}`); // Check if there's a visibility field
                console.log('---');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkEvents();
