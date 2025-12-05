
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function updateEvent() {
    try {
        // Authenticate as super_admin user
        await pb.collection('users').authWithPassword('mainak.tln@gmail.com', '1234567890');

        // Get the event
        const event = await pb.collection('events').getFirstListItem('name="Test"');

        // Set date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        await pb.collection('events').update(event.id, {
            start_date: tomorrow.toISOString(),
            end_date: new Date(tomorrow.getTime() + 3600000).toISOString(), // +1 hour
        });

        console.log(`Updated event "${event.name}" start date to ${tomorrow.toISOString()}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

updateEvent();
