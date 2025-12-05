
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function checkUsers() {
    try {
        console.log('🔐 Authenticating as Admin...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        console.log('Fetching users...');
        const users = await pb.collection('users').getFullList();

        if (users.length === 0) {
            console.log('No users found in the "users" collection.');
        } else {
            console.log(`Found ${users.length} users:`);
            users.forEach(u => {
                console.log(`- ID: ${u.id}`);
                console.log(`  Email: ${u.email}`);
                console.log(`  Name: ${u.name}`);
                console.log(`  Role: ${u.role}`);
                console.log('---');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkUsers();
