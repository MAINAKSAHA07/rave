
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function updateSchemaAndRules() {
    try {
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        // 1. Get customers collection ID
        const customers = await pb.collections.getOne('customers');
        const customersId = customers.id;
        console.log(`Found customers collection ID: ${customersId}`);

        // 1.5 Delete existing orders and tickets to avoid validation errors
        console.log('Deleting existing orders, tickets, and refunds (test data)...');
        const ticketsList = await pb.collection('tickets').getFullList();
        for (const t of ticketsList) {
            await pb.collection('tickets').delete(t.id);
        }
        const refundsList = await pb.collection('refunds').getFullList();
        for (const r of refundsList) {
            await pb.collection('refunds').delete(r.id);
        }
        const ordersList = await pb.collection('orders').getFullList();
        for (const o of ordersList) {
            await pb.collection('orders').delete(o.id);
        }
        console.log('✅ Existing data deleted.');

        // 2. Update orders collection schema
        console.log('Updating "orders" schema...');
        const orders = await pb.collections.getOne('orders');

        // Find the user_id field index
        const userFieldIndex = orders.schema.findIndex(f => f.name === 'user_id');

        if (userFieldIndex !== -1) {
            // Remove the old field
            orders.schema.splice(userFieldIndex, 1);

            // Add the new field pointing to customers
            orders.schema.push({
                name: 'user_id',
                type: 'relation',
                required: true,
                presentable: false,
                unique: false,
                options: {
                    collectionId: customersId,
                    cascadeDelete: false,
                    minSelect: 1,
                    maxSelect: 1,
                    displayFields: null
                }
            });

            await pb.collections.update('orders', {
                schema: orders.schema
            });
            console.log('✅ "orders" schema updated: user_id recreated pointing to "customers".');
        } else {
            console.error('❌ Could not find user_id field in orders.');
        }

        // 3. Update tickets rule to be secure again
        console.log('Updating "tickets" rules...');
        await pb.collections.update('tickets', {
            // Allow users to view tickets if they own the order
            listRule: "order_id.user_id = @request.auth.id",
            viewRule: "order_id.user_id = @request.auth.id",
        });
        console.log('✅ "tickets" rules updated to secure version.');

    } catch (error) {
        console.error('❌ Error:', error);
        if (error.response && error.response.data) {
            console.error('Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

updateSchemaAndRules();
