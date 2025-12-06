const PocketBase = require('pocketbase/cjs');
const path = require('path');
const fs = require('fs');

// Load .env file from root directory
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        const cleanValue = value.replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = cleanValue;
        }
      }
    }
  });
}

const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error('❌ Admin credentials not found in .env');
  console.error('   Please set AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD');
  process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function createTablesCollection() {
  try {
    console.log(`🔐 Connecting to PocketBase at: ${pbUrl}`);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin\n');

    // Check if tables collection already exists
    try {
      const existingCollection = await pb.collections.getOne('tables');
      console.log('⚠️  Tables collection already exists. Skipping creation.');
      console.log('\nCurrent schema fields:');
      existingCollection.schema.forEach(field => {
        console.log(`  - ${field.name}: ${field.type}${field.required ? ' (required)' : ''}`);
      });
      return;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
      // Collection doesn't exist, proceed with creation
    }

    console.log('📝 Creating tables collection...');

    // Get venues collection ID for relation
    const venuesCollection = await pb.collections.getOne('venues');
    const venuesCollectionId = venuesCollection.id;

    // Create tables collection with initial schema (at least one field required)
    const tablesCollection = await pb.collections.create({
      name: 'tables',
      type: 'base',
      schema: [
        {
          name: 'venue_id',
          type: 'relation',
          required: true,
          options: {
            collectionId: venuesCollectionId,
            cascadeDelete: true,
          },
        },
      ],
    });

    console.log('✅ Collection created. Adding remaining schema fields...');

    // Get the collection to update schema
    let collection = await pb.collections.getOne('tables');

    // Add remaining schema fields
    const schema = [
      {
        name: 'venue_id',
        type: 'relation',
        required: true,
        options: {
          collectionId: venuesCollectionId,
          cascadeDelete: true,
        },
      },
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'capacity',
        type: 'number',
        required: true,
      },
      {
        name: 'section',
        type: 'text',
        required: false,
      },
      {
        name: 'position_x',
        type: 'number',
        required: false,
      },
      {
        name: 'position_y',
        type: 'number',
        required: false,
      },
    ];

    // Update collection with full schema
    await pb.collections.update(collection.id, {
      schema: schema,
    });

    console.log('✅ Schema fields added.');
    console.log('\n📝 Note: Please add indexes manually in PocketBase admin UI:');
    console.log('   - Index on [venue_id]');
    console.log('   - Unique index on [venue_id, name]');

    // Get updated collection
    collection = await pb.collections.getOne('tables');

    console.log('✅ Successfully created tables collection!');
    console.log('\nSchema fields:');
    tablesCollection.schema.forEach(field => {
      console.log(`  - ${field.name}: ${field.type}${field.required ? ' (required)' : ''}`);
    });

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error.response) {
      console.error('Response:', error.response);
    }
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

createTablesCollection();
