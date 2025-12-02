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

async function createSuperAdmin() {
    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        const email = 'mainak.tln@gmail.com';
        const password = 'Raveparty@08';
        const name = 'Super Admin';

        // Check if user exists
        let user;
        try {
            user = await pb.collection('users').getFirstListItem(`email="${email}"`);
            console.log(`ℹ️  User ${email} already exists.`);
        } catch (e) {
            // User not found
        }

        if (user) {
            // Update existing user
            console.log(`🔄 Updating user role to super_admin...`);
            await pb.collection('users').update(user.id, {
                role: 'super_admin',
                backoffice_access: true,
                can_manage_roles: true,
                // Update password if needed, but usually we don't force reset unless asked. 
                // The user explicitly gave a password, so let's set it to ensure they can login.
                password: password,
                passwordConfirm: password,
            });
            console.log('✅ User updated successfully');
        } else {
            // Create new user
            console.log(`🆕 Creating new super_admin user...`);
            await pb.collection('users').create({
                email,
                emailVisibility: true,
                password,
                passwordConfirm: password,
                name,
                role: 'super_admin',
            });
            console.log('✅ User created successfully');
        }

    } catch (error) {
        console.error('\n❌ Failed to create/update super admin:', error.message);
        if (error.response?.data) {
            console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

createSuperAdmin();
