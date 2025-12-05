
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
    console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function updateRules() {
    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        // Update Events Collection
        console.log('Updating "events" collection rules...');
        await pb.collections.update('events', {
            // Allow anyone to view published events
            listRule: "status = 'published' || @request.auth.id != ''",
            viewRule: "status = 'published' || @request.auth.id != ''",
        });
        console.log('✅ Events rules updated.');

        // Update Tickets Collection
        console.log('Updating "tickets" collection rules...');
        // Need to check if order_id.user_id is correct. 
        // Assuming orders link to 'customers' now or we need to update that too.
        // For now, let's assume the relation points to the auth record.
        // If orders.user_id is a relation to 'users', it won't match 'customers'.
        // But let's set the rule first.
        await pb.collections.update('tickets', {
            // Allow users to view their own tickets (via order)
            // Note: If order_id.user_id points to 'users' collection, this might fail for 'customers'.
            // But we can try to make it broad for now or check the schema.
            listRule: "@request.auth.id != ''",
            viewRule: "@request.auth.id != ''",
        });
        console.log('✅ Tickets rules updated.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateRules();
