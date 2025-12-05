/**
 * PocketBase Schema Migration Script
 * 
 * This script creates all collections for the Rave ticketing platform.
 * Run with: node run-migration.js
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

async function createCollection(collectionDef) {
  try {
    // Check if collection already exists
    try {
      await pb.collections.getOne(collectionDef.name);
      console.log(`⏭️  Collection "${collectionDef.name}" already exists, skipping...`);
      return;
    } catch (error) {
      // Collection doesn't exist, proceed to create
    }

    // Convert schema format to PocketBase API format
    const schema = collectionDef.schema.map(field => {
      const pbField = {
        name: field.name,
        type: field.type,
        required: field.required || false,
      };

      // Handle different field types
      if (field.type === 'select') {
        pbField.options = {
          values: field.options.values,
          maxSelect: field.options.maxSelect || 1,
        };
        if (field.defaultValue !== undefined) {
          pbField.options.values = field.options.values;
        }
      }

      if (field.type === 'relation') {
        // For relation fields, PocketBase expects the collection name
        let collectionName = field.options.collectionId;
        
        // Handle special case for users collection (built-in)
        if (collectionName === '_pb_users_auth_') {
          collectionName = 'users';
        }
        
        // Get the actual collection ID by name (for existing collections)
        // For new collections, we'll need to create them in order
        pbField.options = {
          collectionId: collectionName, // PocketBase will resolve this
          cascadeDelete: field.options.cascadeDelete || false,
          minSelect: field.required ? 1 : null,
          maxSelect: 1,
        };
      }

      if (field.type === 'file') {
        // Ensure maxSize is always a valid number
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
        } else if (field.type === 'select') {
          // Default value for select is handled in options
        } else if (field.type === 'text' || field.type === 'number') {
          pbField.default = field.defaultValue;
        }
      }

      return pbField;
    });

    // Create collection
    const collection = await pb.collections.create({
      name: collectionDef.name,
      type: collectionDef.type || 'base',
      schema: schema,
    });

    console.log(`✅ Created collection "${collectionDef.name}"`);

    // Add indexes (PocketBase indexes are created via the schema, but we can add them separately)
    // Note: PocketBase Admin SDK doesn't have a direct index creation method
    // Indexes need to be added via the admin UI or by updating the collection
    // For now, we'll note which indexes should be created
    if (collectionDef.indexes && collectionDef.indexes.length > 0) {
      console.log(`   📝 Note: Add indexes manually in admin UI:`);
      for (const index of collectionDef.indexes) {
        console.log(`      - [${index.fields.join(', ')}]${index.unique ? ' (unique)' : ''}`);
      }
    }

    return collection;
  } catch (error) {
    console.error(`❌ Error creating collection "${collectionDef.name}":`, error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    throw error;
  }
}

async function resolveCollectionId(collectionName) {
  // Handle built-in users collection - PocketBase uses a special ID
  if (collectionName === '_pb_users_auth_' || collectionName === 'users') {
    try {
      // Try to get users collection - it might be named differently in API
      const allCollections = await pb.collections.getFullList();
      const usersCollection = allCollections.find(c => c.name === 'users' || c.id === '_pb_users_auth_');
      if (usersCollection) {
        return usersCollection.id;
      }
      // Fallback: use the system collection ID
      return '_pb_users_auth_';
    } catch (error) {
      // Users collection should always exist - use system ID
      return '_pb_users_auth_';
    }
  }
  
  // Get collection by name
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
      console.log(`⏭️  Collection "${collectionDef.name}" already exists, skipping...`);
      collectionIdMap[collectionDef.name] = collection.id;
      return collection;
    } catch (error) {
      // Collection doesn't exist, proceed to create
    }

    // Convert schema format to PocketBase API format
    const schema = await Promise.all(collectionDef.schema.map(async (field, index) => {
      // Create a fresh object for each field to avoid any contamination
      const pbField = {
        name: String(field.name),
        type: String(field.type),
        required: Boolean(field.required || false),
      };

      // Handle different field types
      if (field.type === 'select') {
        pbField.options = {
          values: field.options.values,
          maxSelect: field.options.maxSelect || 1,
        };
      }

      if (field.type === 'relation') {
        // Resolve collection ID
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
        // Ensure maxSize is always a valid number
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

      // For simple field types that don't need options, ensure options is not set
      const simpleTypes = ['json', 'bool', 'date'];
      if (simpleTypes.includes(field.type)) {
        // Explicitly don't set options for these types
        return pbField;
      }

      // For text fields without unique, also don't set options
      if (field.type === 'text' && !field.unique && !pbField.options) {
        return pbField;
      }

      return pbField;
    }));

    // Note: JSON fields may need to be added manually after collection creation

    // Create collection
    try {
      collection = await pb.collections.create({
        name: collectionDef.name,
        type: collectionDef.type || 'base',
        schema: schema,
      });
    } catch (createError) {
      if (collectionDef.name === 'events') {
        console.log('   Error details:', JSON.stringify(createError.response?.data, null, 2));
      }
      throw createError;
    }

    collectionIdMap[collectionDef.name] = collection.id;
    console.log(`✅ Created collection "${collectionDef.name}"`);

    // Add indexes (PocketBase indexes are created via the schema, but we can add them separately)
    // Note: PocketBase Admin SDK doesn't have a direct index creation method
    // Indexes need to be added via the admin UI or by updating the collection
    // For now, we'll note which indexes should be created
    if (collectionDef.indexes && collectionDef.indexes.length > 0) {
      console.log(`   📝 Note: Add indexes manually in admin UI:`);
      for (const index of collectionDef.indexes) {
        console.log(`      - [${index.fields.join(', ')}]${index.unique ? ' (unique)' : ''}`);
      }
    }

    return collection;
  } catch (error) {
    console.error(`❌ Error creating collection "${collectionDef.name}":`, error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function runMigration() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    // Import collections from migration file
    const { collections } = require('./migrations/001_initial_schema.js');

    console.log(`📦 Creating ${collections.length} collections...\n`);

    const collectionIdMap = {};

    // Create collections in order (respecting dependencies)
    for (const collectionDef of collections) {
      await createCollection(collectionDef, collectionIdMap);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Set up access rules in PocketBase admin UI');
    console.log('   2. Add custom fields to users collection (role, phone)');
    console.log('   3. Create default email templates');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
runMigration();

