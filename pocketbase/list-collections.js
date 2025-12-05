
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function listCollections() {
    try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        const collections = await pb.collections.getFullList();
        console.log('Collections:');
        collections.forEach(c => console.log(`- ${c.name} (Type: ${c.type})`));
    } catch (error) {
        console.error('Error:', error);
    }
}

listCollections();
