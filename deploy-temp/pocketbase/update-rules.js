
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function updateRules() {
    try {
        // Try to auth as admin
        await pb.admins.authWithPassword('mainak.tln@gmail.com', '1234567890');

        const collections = await pb.collections.getFullList();
        const ticketTypes = collections.find(c => c.name === 'ticket_types');

        if (ticketTypes) {
            ticketTypes.listRule = "";
            ticketTypes.viewRule = "";
            await pb.collections.update(ticketTypes.id, ticketTypes);
            console.log('Updated ticket_types rules to public');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

updateRules();
