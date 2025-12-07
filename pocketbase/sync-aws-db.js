/**
 * Sync AWS PocketBase Database with Local Schema
 * 
 * This script applies all migrations to the AWS PocketBase instance
 * to match the local database schema.
 * 
 * Usage: 
 *   POCKETBASE_URL=http://13.201.90.240:8092 node sync-aws-db.js
 */

const PocketBase = require('pocketbase/cjs');
const path = require('path');
const { config } = require('dotenv');

// Load .env from root
config({ path: path.resolve(__dirname, '../.env') });

// Use AWS URL if provided, otherwise default to local
const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://13.201.90.240:8092';
// Support AWS-specific credentials, fallback to general credentials
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

console.log('📋 Configuration:');
console.log(`   PocketBase URL: ${pbUrl}`);
console.log(`   Admin Email: ${adminEmail ? adminEmail.substring(0, 3) + '***' : 'NOT SET'}`);
console.log(`   Admin Password: ${adminPassword ? '***' : 'NOT SET'}`);
console.log('');

if (!adminEmail || !adminPassword) {
    console.error('❌ Error: Admin credentials must be set in .env');
    console.error('   Required (one of these):');
    console.error('   - AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD (for AWS)');
    console.error('   - POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (for local/AWS)');
    console.error('   Make sure .env file is in the project root directory');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function resolveCollectionId(collectionName) {
    // Handle built-in users collection
    if (collectionName === '_pb_users_auth_' || collectionName === 'users') {
        try {
            const allCollections = await pb.collections.getFullList();
            const usersCollection = allCollections.find(c => c.name === 'users' || c.id === '_pb_users_auth_');
            if (usersCollection) {
                return usersCollection.id;
            }
            return '_pb_users_auth_';
        } catch (error) {
            return '_pb_users_auth_';
        }
    }
    
    try {
        const collection = await pb.collections.getOne(collectionName);
        return collection.id;
    } catch (error) {
        throw new Error(`Collection "${collectionName}" not found. Make sure collections are created in order.`);
    }
}

async function createCollection(collectionDef, collectionIdMap = {}) {
    try {
        // Check if collection already exists
        let collection;
        try {
            collection = await pb.collections.getOne(collectionDef.name);
            console.log(`⏭️  Collection "${collectionDef.name}" already exists, checking schema...`);
            
            // Special handling for events collection - try to update schema instead of deleting
            // (deletion fails if there are dependencies like ticket_types, orders, etc.)
            if (collectionDef.name === 'events') {
                console.log(`   ⚠️  Events collection exists - updating schema (cannot delete due to dependencies)...`);
                collectionIdMap[collectionDef.name] = collection.id;
                await updateCollectionSchema(collection, collectionDef);
                return collection;
            } else {
                collectionIdMap[collectionDef.name] = collection.id;
                await updateCollectionSchema(collection, collectionDef);
                return collection;
            }
        } catch (error) {
            // Collection doesn't exist only if it's a 404 error
            if (error.status === 404) {
                // Collection doesn't exist, proceed to create below
            } else {
                // Some other error - log it but try to continue
                console.log(`   ⚠️  Error checking collection "${collectionDef.name}": ${error.message}`);
                // If it's not a 404, the collection might exist but we can't access it
                // In this case, skip creation to avoid "already exists" error
                console.log(`   ⏭️  Skipping "${collectionDef.name}" due to access error`);
                return null;
            }
        }

        // Convert schema format to PocketBase API format
        const schema = await Promise.all(collectionDef.schema.map(async (field, index) => {
            const pbField = {
                name: String(field.name),
                type: String(field.type),
                required: Boolean(field.required || false),
            };

            // Handle simple field types that don't need options (do this first!)
            const simpleTypes = ['json', 'bool', 'date'];
            if (simpleTypes.includes(field.type)) {
                // Set default value if needed
                if (field.defaultValue !== undefined && field.type === 'bool') {
                    pbField.default = field.defaultValue;
                }
                // Explicitly ensure no options property exists
                // This is critical - JSON fields must not have options property at all
                const cleanField = {
                    name: pbField.name,
                    type: pbField.type,
                    required: pbField.required
                };
                if (pbField.default !== undefined) {
                    cleanField.default = pbField.default;
                }
                return cleanField;
            }

            // Handle different field types
            if (field.type === 'select') {
                pbField.options = {
                    values: field.options.values,
                    maxSelect: field.options.maxSelect || 1,
                };
            }

            if (field.type === 'relation') {
                let targetCollectionName = field.options.collectionId;
                
                // Special handling: orders.user_id should point to 'customers', not '_pb_users_auth_'
                if (targetCollectionName === '_pb_users_auth_' && collectionDef.name === 'orders' && field.name === 'user_id') {
                    targetCollectionName = 'customers';
                } else if (targetCollectionName === '_pb_users_auth_') {
                    targetCollectionName = 'users';
                }
                
                const targetCollectionId = await resolveCollectionId(targetCollectionName);
                
                pbField.options = {
                    collectionId: targetCollectionId,
                    cascadeDelete: field.options.cascadeDelete || false,
                    minSelect: field.required ? 1 : null,
                    maxSelect: 1,
                };
            }

            if (field.type === 'file') {
                let maxSize = 5242880; // Default 5MB
                if (field.options?.maxSize) {
                    maxSize = parseInt(field.options.maxSize);
                    if (isNaN(maxSize)) {
                        maxSize = 5242880;
                    }
                }
                
                pbField.options = {
                    maxSelect: field.options?.maxSelect || 1,
                    maxSize: maxSize,
                    mimeTypes: field.options?.mimeTypes && field.options.mimeTypes.length > 0 
                        ? field.options.mimeTypes 
                        : ['image/jpeg', 'image/png', 'image/webp'],
                    protected: false,
                };
            }

            if (field.type === 'number') {
                pbField.options = {
                    min: field.options?.min || null,
                    max: field.options?.max || null,
                };
            }

            if (field.type === 'email' && field.unique) {
                pbField.options = {
                    unique: true,
                };
            }

            if (field.type === 'text' && field.unique) {
                pbField.options = {
                    unique: true,
                };
            }

            if (field.defaultValue !== undefined && field.type !== 'relation') {
                if (field.type === 'bool') {
                    pbField.default = field.defaultValue;
                } else if (field.type === 'text' || field.type === 'number') {
                    pbField.default = field.defaultValue;
                }
            }

            // For text fields without unique, also don't set options if not needed
            if (field.type === 'text' && !field.unique && !pbField.options) {
                return pbField;
            }

            return pbField;
        }));

        // Final validation: Remove any options from JSON, bool, and date fields
        // This is critical - these field types must not have options property at all
        const cleanedSchema = schema.map(field => {
            if (['json', 'bool', 'date'].includes(field.type)) {
                // Create a completely new object with ONLY the properties we want
                // Use Object.fromEntries to ensure no extra properties
                const allowedProps = {
                    name: field.name,
                    type: field.type,
                    required: field.required
                };
                // Only add default if it exists (for bool fields)
                if (field.default !== undefined) {
                    allowedProps.default = field.default;
                }
                // Create a brand new object - this ensures no options property exists
                return Object.assign({}, allowedProps);
            }
            return field;
        });

        // Debug: Log schema for events collection
        if (collectionDef.name === 'events') {
            console.log(`   🔍 Debug: Processing ${cleanedSchema.length} fields for events collection`);
            cleanedSchema.forEach((field, idx) => {
                if (field.type === 'json') {
                    const hasOptions = 'options' in field;
                    console.log(`   Field ${idx} (${field.name}): type=${field.type}, hasOptions=${hasOptions}, keys=${Object.keys(field).join(',')}`);
                }
            });
        }

        // Final check: Verify no JSON fields have options and serialize/deserialize to ensure clean objects
        const finalSchema = JSON.parse(JSON.stringify(cleanedSchema.map(field => {
            if (field.type === 'json') {
                // For JSON fields, create a minimal object with only required properties
                const minimal = {
                    name: field.name,
                    type: field.type,
                    required: field.required
                };
                // Verify no options property
                if ('options' in minimal) {
                    delete minimal.options;
                }
                return minimal;
            }
            return field;
        })));

        // Final validation
        for (const field of finalSchema) {
            if (field.type === 'json' && ('options' in field)) {
                console.error(`   ❌ ERROR: Field "${field.name}" still has options property after cleaning!`);
                console.error(`   Field object:`, JSON.stringify(field, null, 2));
                throw new Error(`JSON field "${field.name}" has options property which is not allowed`);
            }
        }

        // Double-check collection doesn't exist before creating
        try {
            const existingCheck = await pb.collections.getOne(collectionDef.name);
            console.log(`   ⚠️  Collection "${collectionDef.name}" exists, updating instead of creating...`);
            collectionIdMap[collectionDef.name] = existingCheck.id;
            await updateCollectionSchema(existingCheck, collectionDef);
            return existingCheck;
        } catch (checkError) {
            if (checkError.status !== 404) {
                throw checkError;
            }
            // Collection doesn't exist, proceed with creation
        }

        // Create collection
        collection = await pb.collections.create({
            name: collectionDef.name,
            type: collectionDef.type || 'base',
            schema: finalSchema,
        });

        collectionIdMap[collectionDef.name] = collection.id;
        console.log(`✅ Created collection "${collectionDef.name}"`);

        return collection;
    } catch (error) {
        console.error(`❌ Error with collection "${collectionDef.name}":`, error.message);
        if (error.response?.data) {
            console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

async function updateCollectionSchema(existingCollection, collectionDef) {
    const existingFields = existingCollection.schema.map(f => f.name);
    const requiredFields = collectionDef.schema.map(f => f.name);
    
    const missingFields = requiredFields.filter(name => !existingFields.includes(name));
    
    if (missingFields.length === 0) {
        // Check if any existing fields have wrong types or options (especially JSON fields)
        if (collectionDef.name === 'events') {
            const tagsField = existingCollection.schema.find(f => f.name === 'tags');
            if (tagsField && tagsField.type === 'json' && tagsField.options) {
                console.log(`   ⚠️  Found tags field with invalid options, fixing...`);
                // Remove options from tags field
                const fixedSchema = existingCollection.schema.map(f => {
                    if (f.name === 'tags' && f.type === 'json') {
                        const { options, ...cleanField } = f;
                        return cleanField;
                    }
                    return f;
                });
                await pb.collections.update(existingCollection.id, {
                    schema: fixedSchema
                });
                console.log(`   ✅ Fixed tags field`);
                return;
            }
        }
        console.log(`   ✨ Schema is up to date for "${collectionDef.name}"`);
        return;
    }
    
    console.log(`   📝 Adding ${missingFields.length} missing field(s) to "${collectionDef.name}"...`);
    
    // Get field definitions for missing fields
    const fieldsToAdd = collectionDef.schema.filter(f => missingFields.includes(f.name));
    
    const newSchemaFields = await Promise.all(fieldsToAdd.map(async (field) => {
        const pbField = {
            name: String(field.name),
            type: String(field.type),
            required: Boolean(field.required || false),
        };

        // Handle simple field types that don't need options (do this first!)
        const simpleTypes = ['json', 'bool', 'date'];
        if (simpleTypes.includes(field.type)) {
            // Set default value if needed
            if (field.defaultValue !== undefined && field.type === 'bool') {
                pbField.default = field.defaultValue;
            }
            // Explicitly ensure no options property exists
            const cleanField = {
                name: pbField.name,
                type: pbField.type,
                required: pbField.required
            };
            if (pbField.default !== undefined) {
                cleanField.default = pbField.default;
            }
            return cleanField;
        }

        if (field.type === 'select') {
            pbField.options = {
                values: field.options.values,
                maxSelect: field.options.maxSelect || 1,
            };
        }

        if (field.type === 'relation') {
            let targetCollectionName = field.options.collectionId;
            if (targetCollectionName === '_pb_users_auth_') {
                targetCollectionName = 'users';
            }
            
            const targetCollectionId = await resolveCollectionId(targetCollectionName);
            
            pbField.options = {
                collectionId: targetCollectionId,
                cascadeDelete: field.options.cascadeDelete || false,
                minSelect: field.required ? 1 : null,
                maxSelect: 1,
            };
        }

        if (field.type === 'file') {
            let maxSize = 5242880;
            if (field.options?.maxSize) {
                maxSize = parseInt(field.options.maxSize);
                if (isNaN(maxSize)) {
                    maxSize = 5242880;
                }
            }
            
            pbField.options = {
                maxSelect: field.options?.maxSelect || 1,
                maxSize: maxSize,
                mimeTypes: field.options?.mimeTypes && field.options.mimeTypes.length > 0 
                    ? field.options.mimeTypes 
                    : ['image/jpeg', 'image/png', 'image/webp'],
                protected: false,
            };
        }

        if (field.type === 'number') {
            pbField.options = {
                min: field.options?.min || null,
                max: field.options?.max || null,
            };
        }

        if (field.type === 'email' && field.unique) {
            pbField.options = {
                unique: true,
            };
        }

        if (field.type === 'text' && field.unique) {
            pbField.options = {
                unique: true,
            };
        }

        if (field.defaultValue !== undefined && field.type !== 'relation') {
            if (field.type === 'bool') {
                pbField.default = field.defaultValue;
            } else if (field.type === 'text' || field.type === 'number') {
                pbField.default = field.defaultValue;
            }
        }

        // For text fields without unique, also don't set options if not needed
        if (field.type === 'text' && !field.unique && !pbField.options) {
            return pbField;
        }

        return pbField;
    }));
    
    // Merge with existing schema
    const updatedSchema = [...existingCollection.schema, ...newSchemaFields];
    
    await pb.collections.update(existingCollection.id, {
        schema: updatedSchema
    });
    
    console.log(`   ✅ Updated schema for "${collectionDef.name}"`);
}

async function applyMigration002() {
    console.log('\n📦 Applying Migration 002: Add order GST fields...');
    
    const { updates } = require('./migrations/002_add_order_gst_fields.js');
    
    for (const update of updates) {
        console.log(`   Processing "${update.collection}"...`);
        
        try {
            const collection = await pb.collections.getOne(update.collection);
            
            const newFields = [];
            for (const field of update.fields) {
                const exists = collection.schema.find(f => f.name === field.name);
                if (!exists) {
                    console.log(`      ➕ Adding field "${field.name}"`);
                    newFields.push({
                        name: field.name,
                        type: field.type,
                        required: field.required || false,
                        options: field.options || {}
                    });
                } else {
                    console.log(`      ⏭️  Field "${field.name}" already exists`);
                }
            }
            
            if (newFields.length > 0) {
                const updatedSchema = [...collection.schema, ...newFields];
                await pb.collections.update(collection.id, {
                    schema: updatedSchema
                });
                console.log(`      ✅ Updated "${update.collection}"`);
            } else {
                console.log(`      ✨ No changes needed for "${update.collection}"`);
            }
        } catch (error) {
            console.error(`      ❌ Error updating "${update.collection}":`, error.message);
        }
    }
}

async function applyMigration003() {
    console.log('\n📦 Applying Migration 003: Add event_date field...');
    
    const migration = require('./migrations/003_add_event_date_field.js');
    
    try {
        await migration.up(pb);
    } catch (error) {
        console.error('   ❌ Error applying migration 003:', error.message);
    }
}

async function fixOrdersUserRelation() {
    console.log('\n📦 Fixing orders.user_id relation to point to customers...');
    
    try {
        const ordersCollection = await pb.collections.getOne('orders');
        const customersCollection = await pb.collections.getOne('customers');
        
        const userField = ordersCollection.schema.find(f => f.name === 'user_id');
        
        if (!userField) {
            console.log('   ⚠️  user_id field not found in orders collection');
            return;
        }
        
        // Check if it already points to customers
        const currentCollectionId = userField.options?.collectionId;
        if (currentCollectionId === customersCollection.id) {
            console.log('   ✨ orders.user_id already points to customers');
            return;
        }
        
        console.log(`   🔄 Updating user_id field (currently: ${currentCollectionId}, target: ${customersCollection.id})...`);
        
        // Check if there are existing orders that might prevent the update
        try {
            const existingOrders = await pb.collection('orders').getList(1, 1);
            if (existingOrders.totalItems > 0) {
                console.log(`   ⚠️  Found ${existingOrders.totalItems} existing order(s)`);
                console.log(`   ⚠️  Note: Changing relation target may cause issues if orders reference different collection`);
                console.log(`   ⚠️  Consider migrating data first or this may fail`);
            }
        } catch (checkError) {
            // Ignore errors checking orders
        }
        
        // Find and update the user_id field
        // Note: PocketBase may require removing and re-adding the field if it has existing data
        const userFieldIndex = ordersCollection.schema.findIndex(f => f.name === 'user_id');
        
        if (userFieldIndex === -1) {
            console.log('   ⚠️  user_id field not found in schema');
            return;
        }
        
        // Create updated schema - replace the user_id field
        const updatedSchema = [...ordersCollection.schema];
        updatedSchema[userFieldIndex] = {
            name: 'user_id',
            type: 'relation',
            required: true,
            options: {
                collectionId: customersCollection.id,
                cascadeDelete: false,
                minSelect: 1,
                maxSelect: 1
            }
        };
        
        try {
            await pb.collections.update(ordersCollection.id, {
                schema: updatedSchema
            });
            console.log('   ✅ Updated orders.user_id to point to customers');
        } catch (updateError) {
            // If update fails, it might be because:
            // 1. There are existing records with data in the old relation
            // 2. The field can't be changed while data exists
            if (updateError.response?.data) {
                const errorData = updateError.response.data;
                console.error(`   ❌ Update failed:`, JSON.stringify(errorData, null, 2));
                
                // Check if it's a data conflict issue
                if (errorData.schema && errorData.schema[userFieldIndex]) {
                    console.error(`   ❌ Schema validation error at field ${userFieldIndex}:`, JSON.stringify(errorData.schema[userFieldIndex], null, 2));
                }
                
                console.log('\n   💡 Possible solutions:');
                console.log('      1. Delete all existing orders first (if test data)');
                console.log('      2. Manually update via PocketBase admin UI');
                console.log('      3. The relation might already be correct - check in admin UI');
            } else {
                console.error(`   ❌ Update error:`, updateError.message);
            }
            // Don't throw - this is not critical for the sync
        }
    } catch (error) {
        console.error('   ⚠️  Could not fix orders relation:', error.message);
        if (error.response?.data) {
            console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
        // Don't fail the whole sync if this fails
    }
}

async function createOrUpdateCustomersCollection() {
    console.log('\n📦 Creating/updating customers collection...');
    
    try {
        // Check if customers collection exists
        let customersCollection;
        try {
            customersCollection = await pb.collections.getOne('customers');
            console.log('   ⏭️  Customers collection already exists, checking schema...');
        } catch (error) {
            if (error.status === 404) {
                // Collection doesn't exist, create it
                console.log('   📝 Creating customers collection...');
            } else {
                throw error;
            }
        }
        
        const customersData = {
            name: 'customers',
            type: 'auth',
            system: false,
            schema: [
                {
                    name: 'name',
                    type: 'text',
                    required: false,
                    options: {
                        min: null,
                        max: null,
                        pattern: ""
                    }
                },
                {
                    name: 'avatar',
                    type: 'file',
                    required: false,
                    options: {
                        maxSelect: 1,
                        maxSize: 5242880,
                        mimeTypes: [
                            "image/jpeg",
                            "image/png",
                            "image/svg+xml",
                            "image/gif",
                            "image/webp"
                        ],
                        protected: false
                    }
                },
                {
                    name: 'phone',
                    type: 'text',
                    required: false,
                    options: {
                        min: null,
                        max: null,
                        pattern: ""
                    }
                }
            ],
            listRule: "id = @request.auth.id",
            viewRule: "id = @request.auth.id",
            createRule: "",
            updateRule: "id = @request.auth.id",
            deleteRule: "id = @request.auth.id",
            options: {
                allowEmailAuth: true,
                allowOAuth2Auth: true,
                allowUsernameAuth: false,
                exceptEmailDomains: null,
                manageRule: null,
                minPasswordLength: 8,
                onlyEmailDomains: null,
                onlyVerified: false,
                requireEmail: false
            }
        };
        
        if (customersCollection) {
            // Update existing collection
            console.log('   🔄 Updating customers collection schema...');
            
            // Check which fields need to be added
            const existingFields = customersCollection.schema.map(f => f.name);
            const requiredFields = ['name', 'avatar', 'phone'];
            const missingFields = requiredFields.filter(name => !existingFields.includes(name));
            
            if (missingFields.length > 0) {
                console.log(`   ➕ Adding ${missingFields.length} missing field(s)...`);
                const fieldsToAdd = customersData.schema.filter(f => missingFields.includes(f.name));
                const updatedSchema = [...customersCollection.schema, ...fieldsToAdd];
                
                await pb.collections.update(customersCollection.id, {
                    schema: updatedSchema,
                    listRule: customersData.listRule,
                    viewRule: customersData.viewRule,
                    createRule: customersData.createRule,
                    updateRule: customersData.updateRule,
                    deleteRule: customersData.deleteRule,
                    options: customersData.options
                });
                console.log('   ✅ Updated customers collection');
            } else {
                // Update rules and options even if schema is up to date
                await pb.collections.update(customersCollection.id, {
                    listRule: customersData.listRule,
                    viewRule: customersData.viewRule,
                    createRule: customersData.createRule,
                    updateRule: customersData.updateRule,
                    deleteRule: customersData.deleteRule,
                    options: customersData.options
                });
                console.log('   ✨ Schema is up to date, updated rules and options');
            }
        } else {
            // Create new collection
            await pb.collections.create(customersData);
            console.log('   ✅ Created customers collection');
        }
        
    } catch (error) {
        console.error('   ❌ Error with customers collection:', error.message);
        if (error.response?.data) {
            console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

async function syncDatabase() {
    try {
        console.log(`🔗 Connecting to PocketBase at: ${pbUrl}`);
        console.log('🔐 Authenticating...');
        try {
            await pb.admins.authWithPassword(adminEmail, adminPassword);
            console.log('✅ Authenticated successfully\n');
        } catch (authError) {
            console.error('❌ Authentication failed!');
            console.error('');
            console.error('Error details:', authError.message);
            if (authError.response) {
                console.error('Response status:', authError.response.status);
                console.error('Response data:', JSON.stringify(authError.response.data || {}, null, 2));
            }
            console.error('');
            console.error('Troubleshooting:');
            console.error('   1. Verify admin account exists on AWS:');
            console.error('      Open http://13.201.90.240:8092/_/ in your browser');
            console.error('      Try logging in with the same credentials');
            console.error('');
            console.error('   2. Check credentials in .env file:');
            console.error(`      POCKETBASE_ADMIN_EMAIL=${adminEmail}`);
            console.error(`      POCKETBASE_ADMIN_PASSWORD=${adminPassword ? '***' : 'NOT SET'}`);
            console.error('');
            console.error('   3. Verify PocketBase is accessible:');
            console.error('      Test: curl http://13.201.90.240:8092/api/health');
            console.error('');
            console.error('   4. Check if .env file is being loaded:');
            console.error('      Make sure .env is in project root, not in pocketbase/ directory');
            console.error('');
            process.exit(1);
        }
        
        // Step 1: Create/update customers collection FIRST (auth type, needed for orders relation)
        await createOrUpdateCustomersCollection();
        
        // Step 2: Create/update all collections from initial schema
        console.log('\n📦 Step 2: Creating/updating collections from initial schema...\n');
        const { collections } = require('./migrations/001_initial_schema.js');
        
        // Filter out seats collection (temporarily skipped)
        const collectionsToSync = collections.filter(col => col.name !== 'seats');
        if (collections.length !== collectionsToSync.length) {
            console.log('⏭️  Skipping "seats" collection (commented out for now)\n');
        }
        
        const collectionIdMap = {};
        
        for (const collectionDef of collectionsToSync) {
            await createCollection(collectionDef, collectionIdMap);
        }
        
        // Step 3: Apply migration 002 (order GST fields)
        await applyMigration002();
        
        // Step 4: Apply migration 003 (event_date field)
        await applyMigration003();
        
        // Step 5: Fix orders.user_id to point to customers collection
        await fixOrdersUserRelation();
        
        console.log('\n✅ Database sync completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Verify collections in PocketBase admin UI');
        console.log('   2. Set up access rules if needed');
        console.log('   3. Verify data integrity');
        
    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        if (error.response?.data) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Run sync
syncDatabase();

