
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

async function updateTicketSales() {
    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        const event = await pb.collection('events').getFirstListItem('name="Test"');
        const ticketTypes = await pb.collection('ticket_types').getFullList({
            filter: `event_id="${event.id}"`,
        });

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2); // Extend for 2 days

        for (const tt of ticketTypes) {
            await pb.collection('ticket_types').update(tt.id, {
                sales_end: tomorrow.toISOString(),
            });
            console.log(`Updated sales_end for ${tt.name} to ${tomorrow.toISOString()}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateTicketSales();
