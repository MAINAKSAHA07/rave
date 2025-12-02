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

async function addFields() {
    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        const collection = await pb.collections.getOne('users');
        console.log('Current schema fields:', collection.schema.map(f => f.name).join(', '));

        const newSchema = [...collection.schema];
        let updated = false;

        // Add role field if missing
        if (!newSchema.find(f => f.name === 'role')) {
            console.log('➕ Adding "role" field...');
            newSchema.push({
                name: 'role',
                type: 'select',
                options: {
                    values: ['customer', 'admin', 'super_admin'],
                    maxSelect: 1,
                },
            });
            updated = true;
        }

        // Add backoffice_access field if missing
        if (!newSchema.find(f => f.name === 'backoffice_access')) {
            console.log('➕ Adding "backoffice_access" field...');
            newSchema.push({
                name: 'backoffice_access',
                type: 'bool',
            });
            updated = true;
        }

        // Add can_manage_roles field if missing
        if (!newSchema.find(f => f.name === 'can_manage_roles')) {
            console.log('➕ Adding "can_manage_roles" field...');
            newSchema.push({
                name: 'can_manage_roles',
                type: 'bool',
            });
            updated = true;
        }

        // Add phone field if missing
        if (!newSchema.find(f => f.name === 'phone')) {
            console.log('➕ Adding "phone" field...');
            newSchema.push({
                name: 'phone',
                type: 'text',
            });
            updated = true;
        }

        if (updated) {
            await pb.collections.update(collection.id, { schema: newSchema });
            console.log('✅ Users collection schema updated successfully');
        } else {
            console.log('✅ Users collection schema already up to date');
        }

    } catch (error) {
        console.error('\n❌ Failed to update users schema:', error.message);
        process.exit(1);
    }
}

addFields();
