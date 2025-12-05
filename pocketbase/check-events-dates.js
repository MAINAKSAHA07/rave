
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function checkEvents() {
    try {
        const events = await pb.collection('events').getFullList({
            sort: '-start_date',
        });

        console.log(`Found ${events.length} events.`);
        const now = new Date().toISOString();
        console.log(`Current time: ${now}`);

        events.forEach(e => {
            console.log(`- ${e.name} (${e.id})`);
            console.log(`  Status: ${e.status}`);
            console.log(`  Start:  ${e.start_date}`);
            console.log(`  Visible? ${e.status === 'published' && e.start_date >= now ? 'YES' : 'NO'}`);
            console.log('---');
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

checkEvents();
