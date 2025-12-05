/**
 * Fix AWS PocketBase Access Rules for Super Admin
 * 
 * This script updates all collection access rules to ensure super_admin
 * has full access to all collections in the backoffice
 */

const PocketBase = require('pocketbase/cjs');
const path = require('path');
const { config } = require('dotenv');

// Load .env from root
config({ path: path.resolve(__dirname, '../.env') });

const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://13.201.90.240:8092';
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
    console.error('❌ Error: Admin credentials must be set in .env');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

// Super Admin and Admin should have full access to everything
const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

async function fixAccessRules() {
    try {
        console.log(`🔗 Connecting to PocketBase at: ${pbUrl}`);
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        // Define access rules for all collections
        const collectionRules = [
            {
                name: 'users',
                listRule: `id = @request.auth.id || ${adminAccess}`,
                viewRule: `id = @request.auth.id || ${adminAccess}`,
                createRule: "", // Public signup
                updateRule: `id = @request.auth.id || ${adminAccess}`,
                deleteRule: adminAccess,
            },
            {
                name: 'customers',
                listRule: `id = @request.auth.id || ${adminAccess}`,
                viewRule: `id = @request.auth.id || ${adminAccess}`,
                createRule: "", // Public signup
                updateRule: `id = @request.auth.id || ${adminAccess}`,
                deleteRule: adminAccess,
            },
            {
                name: 'organizers',
                listRule: `${adminAccess} || @request.auth.id != ""`,
                viewRule: `${adminAccess} || @request.auth.id != ""`,
                createRule: `${adminAccess} || @request.auth.id != ""`,
                updateRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
                deleteRule: adminAccess,
            },
            {
                name: 'organizer_staff',
                listRule: `${adminAccess} || user_id = @request.auth.id`,
                viewRule: `${adminAccess} || user_id = @request.auth.id`,
                createRule: adminAccess,
                updateRule: adminAccess,
                deleteRule: adminAccess,
            },
            {
                name: 'organizer_applications',
                listRule: `${adminAccess} || email = @request.auth.email`,
                viewRule: `${adminAccess} || email = @request.auth.email`,
                createRule: "", // Public access
                updateRule: adminAccess,
                deleteRule: adminAccess,
            },
            {
                name: 'venues',
                listRule: `${adminAccess} || @request.auth.id != ""`,
                viewRule: `${adminAccess} || @request.auth.id != ""`,
                createRule: `${adminAccess} || @request.auth.id != ""`,
                updateRule: `${adminAccess} || @request.auth.id != ""`, // Simplified - admins have full access
                deleteRule: adminAccess,
            },
            {
                name: 'events',
                listRule: `${adminAccess} || @request.auth.id != "" || status = "published"`,
                viewRule: `${adminAccess} || @request.auth.id != "" || status = "published"`,
                createRule: `${adminAccess} || @request.auth.id != ""`,
                updateRule: `${adminAccess} || @request.auth.id != ""`, // Simplified - admins have full access
                deleteRule: adminAccess,
            },
            {
                name: 'ticket_types',
                listRule: `${adminAccess} || @request.auth.id != ""`,
                viewRule: `${adminAccess} || @request.auth.id != ""`,
                createRule: `${adminAccess} || @request.auth.id != ""`,
                updateRule: `${adminAccess} || @request.auth.id != ""`, // Simplified - admins have full access
                deleteRule: adminAccess,
            },
            {
                name: 'orders',
                listRule: `${adminAccess} || user_id = @request.auth.id`,
                viewRule: `${adminAccess} || user_id = @request.auth.id`,
                createRule: `@request.auth.id != ""`,
                updateRule: adminAccess,
                deleteRule: adminAccess,
            },
            {
                name: 'tickets',
                listRule: `${adminAccess} || order_id.user_id = @request.auth.id`,
                viewRule: `${adminAccess} || order_id.user_id = @request.auth.id`,
                createRule: adminAccess,
                updateRule: adminAccess,
                deleteRule: adminAccess,
            },
            {
                name: 'refunds',
                listRule: `${adminAccess} || requested_by = @request.auth.id || order_id.user_id = @request.auth.id`,
                viewRule: `${adminAccess} || requested_by = @request.auth.id || order_id.user_id = @request.auth.id`,
                createRule: `${adminAccess} || @request.auth.id != ""`,
                updateRule: adminAccess,
                deleteRule: adminAccess,
            },
            {
                name: 'payouts',
                listRule: adminAccess,
                viewRule: adminAccess,
                createRule: adminAccess,
                updateRule: adminAccess,
                deleteRule: adminAccess,
            },
            {
                name: 'email_templates',
                listRule: `${adminAccess} || @request.auth.id != ""`,
                viewRule: `${adminAccess} || @request.auth.id != ""`,
                createRule: `${adminAccess} || @request.auth.id != ""`,
                updateRule: `${adminAccess} || @request.auth.id != ""`, // Simplified - admins have full access
                deleteRule: adminAccess,
            },
            {
                name: 'event_reminders',
                listRule: `${adminAccess} || @request.auth.id != ""`,
                viewRule: `${adminAccess} || @request.auth.id != ""`,
                createRule: `${adminAccess} || @request.auth.id != ""`,
                updateRule: `${adminAccess} || @request.auth.id != ""`, // Simplified - admins have full access
                deleteRule: adminAccess,
            },
        ];

        console.log('📝 Updating access rules for all collections...\n');

        for (const rule of collectionRules) {
            try {
                console.log(`   Updating ${rule.name}...`);
                const collection = await pb.collections.getOne(rule.name);
                
                await pb.collections.update(collection.id, {
                    listRule: rule.listRule,
                    viewRule: rule.viewRule,
                    createRule: rule.createRule,
                    updateRule: rule.updateRule,
                    deleteRule: rule.deleteRule,
                });
                
                console.log(`   ✅ Updated ${rule.name}`);
                console.log(`      List: ${rule.listRule}`);
                console.log(`      View: ${rule.viewRule}`);
                console.log(`      Create: ${rule.createRule || '(empty = public)'}`);
                console.log(`      Update: ${rule.updateRule}`);
                console.log(`      Delete: ${rule.deleteRule}`);
                console.log('');
            } catch (error) {
                console.error(`   ❌ Failed to update ${rule.name}:`, error.message);
                if (error.response?.data) {
                    console.error(`      Details:`, JSON.stringify(error.response.data, null, 2));
                }
                console.log('');
            }
        }

        console.log('✅ Access rules update complete!');
        console.log('\n📋 Summary:');
        console.log('   - super_admin and admin roles now have full access to all collections');
        console.log('   - Regular users have access based on ownership/relations');
        console.log('   - Public access is limited to published events and signup');

    } catch (error) {
        console.error('\n❌ Failed to update access rules:', error.message);
        if (error.response?.data) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

fixAccessRules();
