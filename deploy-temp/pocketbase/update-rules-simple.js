const PocketBase = require('pocketbase/cjs');
const path = require('path');
const { config } = require('dotenv');

// Load .env from root
config({ path: path.resolve(__dirname, '../.env') });

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

        // Simplified rules to avoid syntax errors
        // We will use basic role checks first
        const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

        // Note: Relation lookups like event_id.organizer_id... can fail if the relation is not set up correctly or if the depth is too deep?
        // PocketBase supports deep relation lookups.
        // But maybe I made a typo in field names.

        // Let's try to update one by one with simpler rules to identify the issue.

        const collections = [
            {
                name: 'organizer_staff',
                // Simplest rule: Admin or self
                listRule: `${adminAccess} || user_id = @request.auth.id`,
                viewRule: `${adminAccess} || user_id = @request.auth.id`,
                createRule: `${adminAccess}`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'orders',
                // Admin or owner
                listRule: `${adminAccess} || user_id = @request.auth.id`,
                viewRule: `${adminAccess} || user_id = @request.auth.id`,
                createRule: `@request.auth.id != ""`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'tickets',
                // Admin or owner (via order)
                listRule: `${adminAccess} || order_id.user_id = @request.auth.id`,
                viewRule: `${adminAccess} || order_id.user_id = @request.auth.id`,
                createRule: `${adminAccess}`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'organizer_applications',
                listRule: `${adminAccess} || user_id = @request.auth.id`,
                viewRule: `${adminAccess} || user_id = @request.auth.id`,
                createRule: `@request.auth.id != ""`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'refunds',
                listRule: `${adminAccess} || order_id.user_id = @request.auth.id`,
                viewRule: `${adminAccess} || order_id.user_id = @request.auth.id`,
                createRule: `${adminAccess}`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'payouts',
                listRule: `${adminAccess}`,
                viewRule: `${adminAccess}`,
                createRule: `${adminAccess}`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            }
        ];

        for (const col of collections) {
            console.log(`Updating rules for ${col.name}...`);
            try {
                const collection = await pb.collections.getOne(col.name);
                await pb.collections.update(collection.id, {
                    listRule: col.listRule,
                    viewRule: col.viewRule,
                    createRule: col.createRule,
                    updateRule: col.updateRule,
                    deleteRule: col.deleteRule,
                });
                console.log(`✅ Updated ${col.name}`);
            } catch (e) {
                console.error(`❌ Failed to update ${col.name}:`, e.message);
                if (e.response?.data) {
                    console.error('   Details:', JSON.stringify(e.response.data, null, 2));
                }
            }
        }

    } catch (error) {
        console.error('\n❌ Failed to update rules:', error.message);
        process.exit(1);
    }
}

updateRules();
