
const PocketBase = require('pocketbase/cjs');

// Use the local PocketBase URL
const pbUrl = 'http://127.0.0.1:8092';
const pb = new PocketBase(pbUrl);

async function testGuestAccess() {
    try {
        console.log('--- Testing Guest Access ---');

        // 1. Fetch events without expand
        console.log('\n1. Fetching events (no expand)...');
        try {
            const events = await pb.collection('events').getList(1, 10, {
                filter: 'status="published"',
            });
            console.log(`✅ Success! Found ${events.items.length} events.`);
        } catch (e) {
            console.error('❌ Failed:', e.message);
            console.error('Status:', e.status);
        }

        // 2. Fetch events WITH expand
        console.log('\n2. Fetching events (WITH expand)...');
        try {
            const events = await pb.collection('events').getList(1, 10, {
                filter: 'status="published"',
                expand: 'venue_id,organizer_id',
            });
            console.log(`✅ Success! Found ${events.items.length} events.`);
        } catch (e) {
            console.error('❌ Failed:', e.message);
            console.error('Status:', e.status);
        }

        // 3. Check Venues directly
        console.log('\n3. Fetching venues directly...');
        try {
            const venues = await pb.collection('venues').getList(1, 10);
            console.log(`✅ Success! Found ${venues.items.length} venues.`);
        } catch (e) {
            console.error('❌ Failed:', e.message);
            console.error('Status:', e.status);
        }

    } catch (error) {
        console.error('Global Error:', error);
    }
}

testGuestAccess();
