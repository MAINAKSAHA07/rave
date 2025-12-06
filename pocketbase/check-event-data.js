
const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://127.0.0.1:8090');

// Disable auto-cancellation
pb.autoCancellation(false);

async function checkData() {
    try {
        const eventId = 'r7vvjsvgq9iwbgl';
        console.log(`Checking ticket types for event ${eventId}...`);

        try {
            const tickets = await pb.collection('ticket_types').getList(1, 50, {
                filter: `event_id = "${eventId}"`,
            });
            console.log(`Found ${tickets.totalItems} ticket types.`);
            tickets.items.forEach(t => {
                console.log(`- Ticket: ${t.name} (${t.id})`);
            });
        } catch (e) {
            console.error('❌ Failed to list ticket types:', e.message);
        }

        console.log('--- Listing All Venues ---');
        try {
            const venues = await pb.collection('venues').getList(1, 50);
            console.log(`Total venues: ${venues.totalItems}`);
            venues.items.forEach(v => {
                console.log(`- Venue: ${v.name} (${v.id})`);
            });
        } catch (e) {
            console.error('❌ Failed to list venues:', e.message);
        }

        console.log('\n--- Listing All Events ---');
        try {
            const events = await pb.collection('events').getList(1, 50);
            console.log(`Total events: ${events.totalItems}`);
            events.items.forEach(e => {
                console.log(`- Event: ${e.name} (${e.id})`);
                console.log(`  Values: venue_id=${e.venue_id}`);

                if (e.venue_id === 'sgpwgpu9pi8hmns') {
                    console.log('  ⚠️  MATCH FOUND: This event references the missing venue!');
                }
            });
        } catch (e) {
            console.error('❌ Failed to list events:', e.message);
        }

    } catch (e) {
        console.error('❌ Unexpected error:', e);
    }
}

checkData();
