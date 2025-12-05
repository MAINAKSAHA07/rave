
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function checkOrderCount() {
    try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        const result = await pb.collection('orders').getList(1, 1);
        console.log(`Total orders: ${result.totalItems}`);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkOrderCount();
