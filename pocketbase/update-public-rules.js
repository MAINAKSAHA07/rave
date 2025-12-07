
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function updatePublicRules() {
    try {
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        // Venues - Publicly readable
        console.log('Updating "venues" rules...');
        await pb.collections.update('venues', {
            listRule: "", // Public
            viewRule: "", // Public
        });

        // Organizers - Publicly readable
        console.log('Updating "organizers" rules...');
        await pb.collections.update('organizers', {
            listRule: "", // Public
            viewRule: "", // Public
        });

        // Ticket Types - Publicly readable (so users can see prices)
        console.log('Updating "ticket_types" rules...');
        await pb.collections.update('ticket_types', {
            listRule: "", // Public
            viewRule: "", // Public
        });

        // Tables - Publicly readable (so users can see available tables when booking)
        console.log('Updating "tables" rules...');
        await pb.collections.update('tables', {
            listRule: "", // Public
            viewRule: "", // Public
        });

        console.log('✅ Rules updated to allow public access.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updatePublicRules();
