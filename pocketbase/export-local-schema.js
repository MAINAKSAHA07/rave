/**
 * Export Local PocketBase Schema
 * 
 * This script exports the complete schema from local PocketBase database
 * to help sync with AWS
 */

const PocketBase = require('pocketbase/cjs');
const path = require('path');
const { config } = require('dotenv');
const fs = require('fs');

// Load .env from root
config({ path: path.resolve(__dirname, '../.env') });

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
    console.error('❌ Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function exportSchema() {
    try {
        console.log(`🔗 Connecting to PocketBase at: ${pbUrl}`);
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        console.log('📦 Fetching all collections...');
        const collections = await pb.collections.getFullList();

        console.log(`Found ${collections.length} collection(s)\n`);

        const schemaExport = {
            exportedAt: new Date().toISOString(),
            pocketbaseUrl: pbUrl,
            collections: []
        };

        for (const collection of collections) {
            console.log(`📋 Exporting: ${collection.name} (${collection.type})`);
            
            const collectionData = {
                name: collection.name,
                type: collection.type,
                system: collection.system,
                schema: collection.schema.map(field => {
                    const fieldData = {
                        name: field.name,
                        type: field.type,
                        required: field.required || false
                    };

                    // Add options if they exist and are meaningful
                    if (field.options) {
                        if (field.type === 'select') {
                            fieldData.options = {
                                values: field.options.values,
                                maxSelect: field.options.maxSelect
                            };
                        } else if (field.type === 'relation') {
                            // Get collection name from ID
                            const relatedCollection = collections.find(c => c.id === field.options.collectionId);
                            fieldData.options = {
                                collectionId: relatedCollection ? relatedCollection.name : field.options.collectionId,
                                cascadeDelete: field.options.cascadeDelete || false
                            };
                        } else if (field.type === 'file') {
                            fieldData.options = {
                                maxSelect: field.options.maxSelect,
                                maxSize: field.options.maxSize,
                                mimeTypes: field.options.mimeTypes
                            };
                        } else if (field.type === 'number') {
                            fieldData.options = {
                                min: field.options.min,
                                max: field.options.max
                            };
                        } else if (field.type === 'email' && field.options.unique) {
                            fieldData.options = {
                                unique: true
                            };
                        } else if (field.type === 'text' && field.options.unique) {
                            fieldData.options = {
                                unique: true
                            };
                        }
                    }

                    // Add default value if exists
                    if (field.default !== undefined && field.default !== null) {
                        fieldData.defaultValue = field.default;
                    }

                    return fieldData;
                }),
                listRule: collection.listRule || null,
                viewRule: collection.viewRule || null,
                createRule: collection.createRule || null,
                updateRule: collection.updateRule || null,
                deleteRule: collection.deleteRule || null
            };

            // Add auth options for auth collections
            if (collection.type === 'auth' && collection.options) {
                collectionData.authOptions = {
                    allowEmailAuth: collection.options.allowEmailAuth,
                    allowOAuth2Auth: collection.options.allowOAuth2Auth,
                    allowUsernameAuth: collection.options.allowUsernameAuth,
                    minPasswordLength: collection.options.minPasswordLength,
                    onlyVerified: collection.options.onlyVerified,
                    requireEmail: collection.options.requireEmail
                };
            }

            schemaExport.collections.push(collectionData);
        }

        // Save to file
        const outputPath = path.resolve(__dirname, 'local-schema-export.json');
        fs.writeFileSync(outputPath, JSON.stringify(schemaExport, null, 2));
        
        console.log(`\n✅ Schema exported to: ${outputPath}`);
        console.log(`\n📊 Summary:`);
        console.log(`   Total collections: ${collections.length}`);
        console.log(`   Base collections: ${collections.filter(c => c.type === 'base').length}`);
        console.log(`   Auth collections: ${collections.filter(c => c.type === 'auth').length}`);
        console.log(`   System collections: ${collections.filter(c => c.system).length}`);

        // Show collection names
        console.log(`\n📋 Collections:`);
        collections.forEach(c => {
            console.log(`   - ${c.name} (${c.type}) - ${c.schema?.length || 0} fields`);
        });

    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        if (error.response?.data) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

exportSchema();

