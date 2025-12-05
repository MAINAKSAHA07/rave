
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function findReferences() {
    try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        const collections = await pb.collections.getFullList();

        console.log('Checking for references to "orders" collection...');
        for (const col of collections) {
            for (const field of col.schema) {
                if (field.type === 'relation' && field.options.collectionId === 'orders') { // 'orders' ID needs to be checked?
                    // Actually options.collectionId stores the ID of the target collection.
                    // I need to find the ID of 'orders' collection first.
                }
            }
        }

        const ordersCol = await pb.collections.getOne('orders');
        const ordersId = ordersCol.id;
        console.log(`Orders Collection ID: ${ordersId}`);

        for (const col of collections) {
            for (const field of col.schema) {
                if (field.type === 'relation' && field.options.collectionId === ordersId) {
                    console.log(`Found reference in collection "${col.name}", field "${field.name}"`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

findReferences();
