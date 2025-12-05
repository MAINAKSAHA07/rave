
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function checkSchema() {
    try {
        // Authenticate as admin
        await pb.admins.authWithPassword('mainak.tln@gmail.com', '1234567890');

        const collection = await pb.collections.getOne('events');
        console.log('Events Collection Schema:');
        collection.schema.forEach(field => {
            console.log(`- ${field.name} (${field.type})`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

checkSchema();
