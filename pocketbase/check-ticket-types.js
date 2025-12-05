
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function checkTicketTypes() {
    try {
        // No auth needed if rules are public
        // await pb.admins.authWithPassword('mainak.tln@gmail.com', '1234567890');

        const event = await pb.collection('events').getFirstListItem('name="Test"');
        console.log(`Event: ${event.name} (${event.id})`);

        const ticketTypes = await pb.collection('ticket_types').getFullList({
            filter: `event_id="${event.id}"`,
        });

        console.log(`Found ${ticketTypes.length} ticket types:`);
        ticketTypes.forEach(tt => {
            console.log(`- ${tt.name} (${tt.id})`);
            console.log(`  Price: ${tt.final_price_minor}`);
            console.log(`  Remaining: ${tt.remaining_quantity}`);
            console.log(`  Sales Start: ${tt.sales_start}`);
            console.log(`  Sales End: ${tt.sales_end}`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

checkTicketTypes();
