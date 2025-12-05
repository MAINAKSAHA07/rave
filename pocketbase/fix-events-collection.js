/**
 * Fix Events Collection Schema
 * 
 * This script deletes and recreates the events collection if it has a broken schema
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

async function fixEventsCollection() {
    try {
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated\n');

        // Check if events collection exists
        try {
            const eventsCollection = await pb.collections.getOne('events');
            console.log('⚠️  Events collection exists');
            console.log('   Checking schema...');
            
            // Check if tags field has invalid options
            const tagsField = eventsCollection.schema.find(f => f.name === 'tags');
            if (tagsField && tagsField.type === 'json' && tagsField.options) {
                console.log('   ❌ Found broken schema: tags field has options');
                console.log('   🗑️  Deleting events collection to recreate...');
                
                // Delete the collection
                await pb.collections.delete(eventsCollection.id);
                console.log('   ✅ Collection deleted');
                console.log('\n   Now run ./sync-aws-db.sh again to recreate it');
            } else {
                console.log('   ✅ Schema looks correct');
            }
        } catch (error) {
            if (error.status === 404) {
                console.log('✅ Events collection does not exist (will be created by sync script)');
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response?.data) {
            console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

fixEventsCollection();
