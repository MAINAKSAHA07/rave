
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function checkRules() {
    try {
        // Authenticate as admin
        await pb.admins.authWithPassword('mainak.tln@gmail.com', '1234567890');

        const collections = await pb.collections.getFullList();

        const ticketTypes = collections.find(c => c.name === 'ticket_types');
        console.log('ticket_types rules:', ticketTypes?.listRule, ticketTypes?.viewRule);

        const events = collections.find(c => c.name === 'events');
        console.log('events rules:', events?.listRule, events?.viewRule);

    } catch (e) {
        console.error('Error:', e);
    }
}

checkRules();
