
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function checkOrderSchema() {
    try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        const collection = await pb.collections.getOne('orders');

        const userField = collection.schema.find(f => f.name === 'user_id');
        console.log('user_id field:', JSON.stringify(userField, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkOrderSchema();
