/**
 * Setup AWS Users Collection with Superadmin Access
 * 
 * This script:
 * 1. Checks the users collection schema on AWS
 * 2. Adds missing fields (role, backoffice_access, can_manage_roles, phone)
 * 3. Optionally creates/updates a superadmin user
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
    console.error('   Set AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function setupUsersCollection() {
    try {
        console.log(`🔗 Connecting to PocketBase at: ${pbUrl}`);
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        // Get users collection
        console.log('📋 Checking users collection...');
        const usersCollection = await pb.collections.getOne('users');
        
        console.log(`   Collection: ${usersCollection.name} (${usersCollection.type})`);
        console.log(`   Current fields: ${usersCollection.schema.map(f => f.name).join(', ') || 'none'}\n`);

        const newSchema = [...usersCollection.schema];
        let updated = false;
        const fieldsToAdd = [];

        // Check and add role field
        if (!newSchema.find(f => f.name === 'role')) {
            console.log('➕ Adding "role" field...');
            fieldsToAdd.push({
                name: 'role',
                type: 'select',
                required: false,
                options: {
                    values: ['customer', 'admin', 'super_admin'],
                    maxSelect: 1,
                },
            });
            updated = true;
        } else {
            console.log('   ✓ "role" field already exists');
        }

        // Check and add backoffice_access field
        if (!newSchema.find(f => f.name === 'backoffice_access')) {
            console.log('➕ Adding "backoffice_access" field...');
            fieldsToAdd.push({
                name: 'backoffice_access',
                type: 'bool',
                required: false,
            });
            updated = true;
        } else {
            console.log('   ✓ "backoffice_access" field already exists');
        }

        // Check and add can_manage_roles field
        if (!newSchema.find(f => f.name === 'can_manage_roles')) {
            console.log('➕ Adding "can_manage_roles" field...');
            fieldsToAdd.push({
                name: 'can_manage_roles',
                type: 'bool',
                required: false,
            });
            updated = true;
        } else {
            console.log('   ✓ "can_manage_roles" field already exists');
        }

        // Check and add phone field
        if (!newSchema.find(f => f.name === 'phone')) {
            console.log('➕ Adding "phone" field...');
            fieldsToAdd.push({
                name: 'phone',
                type: 'text',
                required: false,
            });
            updated = true;
        } else {
            console.log('   ✓ "phone" field already exists');
        }

        if (updated) {
            console.log('\n📝 Updating users collection schema...');
            const updatedSchema = [...newSchema, ...fieldsToAdd];
            await pb.collections.update(usersCollection.id, {
                schema: updatedSchema
            });
            console.log('✅ Users collection schema updated successfully\n');
        } else {
            console.log('\n✨ Users collection schema is already up to date\n');
        }

        // List all users and show their roles
        console.log('👥 Checking existing users...');
        try {
            const users = await pb.collection('users').getFullList();
            console.log(`   Found ${users.length} user(s):\n`);
            
            users.forEach(user => {
                console.log(`   - ${user.email || user.id}`);
                console.log(`     Name: ${user.name || 'N/A'}`);
                console.log(`     Role: ${user.role || 'not set'}`);
                console.log(`     Backoffice Access: ${user.backoffice_access ? 'Yes' : 'No'}`);
                console.log(`     Can Manage Roles: ${user.can_manage_roles ? 'Yes' : 'No'}`);
                console.log('');
            });

            // Check if admin user exists
            const adminUser = users.find(u => u.email === adminEmail);
            if (adminUser) {
                console.log(`\n🔧 Found admin user: ${adminEmail}`);
                console.log(`   Current role: ${adminUser.role || 'not set'}`);
                
                if (adminUser.role !== 'super_admin' || !adminUser.backoffice_access) {
                    console.log('   🔄 Updating to super_admin with backoffice access...');
                    try {
                        await pb.collection('users').update(adminUser.id, {
                            role: 'super_admin',
                            backoffice_access: true,
                            can_manage_roles: true
                        });
                        console.log('   ✅ Admin user updated to super_admin');
                    } catch (updateError) {
                        console.error(`   ⚠️  Could not update user: ${updateError.message}`);
                    }
                } else {
                    console.log('   ✨ User already has super_admin role');
                }
            } else {
                console.log(`\n⚠️  Admin user (${adminEmail}) not found in users collection`);
                console.log('   Note: This is the PocketBase admin account, not a regular user');
            }
        } catch (usersError) {
            console.log(`   ⚠️  Could not list users: ${usersError.message}`);
        }

        // Update access rules for users collection
        console.log('\n📝 Updating users collection access rules...');
        const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";
        
        await pb.collections.update(usersCollection.id, {
            listRule: `id = @request.auth.id || ${adminAccess}`,
            viewRule: `id = @request.auth.id || ${adminAccess}`,
            createRule: "", // Empty string = public access (allows signup)
            updateRule: `id = @request.auth.id || ${adminAccess}`,
            deleteRule: adminAccess, // Only admins can delete
        });
        
        console.log('✅ Updated users collection access rules');
        console.log(`   List: id = @request.auth.id || ${adminAccess}`);
        console.log(`   View: id = @request.auth.id || ${adminAccess}`);
        console.log(`   Create: (empty = public signup)`);
        console.log(`   Update: id = @request.auth.id || ${adminAccess}`);
        console.log(`   Delete: ${adminAccess}`);

        console.log('\n✅ Users collection setup complete!');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        if (error.response?.data) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

setupUsersCollection();


