
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function updateTicketSales() {
    try {
        // Authenticate as admin
        await pb.admins.authWithPassword('mainak.tln@gmail.com', '1234567890');

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

    } catch (e) {
        console.error('Error:', e);
    }
}

updateTicketSales();
