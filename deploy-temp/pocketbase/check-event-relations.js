
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function checkEventRelations() {
    try {
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        console.log('Fetching event r7vvjsvgq9iwbgl...');
        const event = await pb.collection('events').getOne('r7vvjsvgq9iwbgl');
        console.log('Event:', JSON.stringify(event, null, 2));

        if (event.venue_id) {
            console.log(`Checking venue ${event.venue_id}...`);
            try {
                const venue = await pb.collection('venues').getOne(event.venue_id);
                console.log('Venue found:', venue.name);
            } catch (e) {
                console.error('❌ Venue not found or inaccessible:', e.message);
            }
        }

        if (event.organizer_id) {
            console.log(`Checking organizer ${event.organizer_id}...`);
            try {
                const organizer = await pb.collection('organizers').getOne(event.organizer_id);
                console.log('Organizer found:', organizer.name);
            } catch (e) {
                console.error('❌ Organizer not found or inaccessible:', e.message);
            }
        }

        // Check API rules for venues and organizers
        const venuesCol = await pb.collections.getOne('venues');
        console.log('Venues Rules:', { list: venuesCol.listRule, view: venuesCol.viewRule });

        const organizersCol = await pb.collections.getOne('organizers');
        console.log('Organizers Rules:', { list: organizersCol.listRule, view: organizersCol.viewRule });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkEventRelations();
