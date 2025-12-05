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

        const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

        // organizer_applications doesn't have user_id, it has email.
        // So users can only see applications matching their email?
        // Or just admin access.
        // Let's allow users to see applications where email = their email.

        const collections = [
            {
                name: 'organizer_applications',
                listRule: `${adminAccess} || email = @request.auth.email`,
                viewRule: `${adminAccess} || email = @request.auth.email`,
                createRule: ``, // Empty string = public access (anyone can create)
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
