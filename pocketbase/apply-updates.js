/**
 * PocketBase Schema Update Script
 * 
 * This script applies updates to existing collections.
 * Run with: node apply-updates.js
 */

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

async function applyUpdates() {
    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        // Import updates
        const { updates } = require('./migrations/002_add_order_gst_fields.js');

        for (const update of updates) {
            console.log(`Processing updates for collection "${update.collection}"...`);

            try {
                const collection = await pb.collections.getOne(update.collection);

                // Check which fields need to be added
                const newFields = [];
                for (const field of update.fields) {
                    const exists = collection.schema.find(f => f.name === field.name);
                    if (!exists) {
                        console.log(`   ➕ Adding field "${field.name}"`);
                        newFields.push({
                            name: field.name,
                            type: field.type,
                            required: field.required || false,
                            options: field.options || {}
                        });
                    } else {
                        console.log(`   ⏭️  Field "${field.name}" already exists`);
                    }
                }

                if (newFields.length > 0) {
                    // Add new fields to schema
                    const updatedSchema = [...collection.schema, ...newFields];

                    await pb.collections.update(collection.id, {
                        schema: updatedSchema
                    });
                    console.log(`   ✅ Updated collection "${update.collection}"`);
                } else {
                    console.log(`   ✨ No changes needed for "${update.collection}"`);
                }

            } catch (error) {
                console.error(`   ❌ Error updating collection "${update.collection}":`, error.message);
            }
        }

        console.log('\n✅ Schema updates completed!');

    } catch (error) {
        console.error('\n❌ Update failed:', error.message);
        process.exit(1);
    }
}

applyUpdates();
