
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function checkEventImage() {
    try {
        // No auth needed if public
        const event = await pb.collection('events').getFirstListItem('name="Test"');
        console.log(`Event: ${event.name} (${event.id})`);
        console.log(`Status: ${event.status}`);
        console.log(`Cover Image: ${event.cover_image}`);

        const url = pb.files.getUrl(event, event.cover_image);
        console.log(`Constructed URL: ${url}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

checkEventImage();
