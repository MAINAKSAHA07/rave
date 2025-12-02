const PocketBase = require('pocketbase/cjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8092');

async function addSeatPositionFields() {
  try {
    // Authenticate as admin
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error('❌ Admin credentials not found in .env');
      process.exit(1);
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin\n');

    // Get seats collection
    const seatsCollection = await pb.collections.getOne('seats');
    console.log('📝 Adding position fields to seats collection...');

    // Check if fields already exist
    const existingFields = seatsCollection.schema.map((f) => f.name);
    
    if (!existingFields.includes('position_x')) {
      await pb.collections.update(seatsCollection.id, {
        schema: [
          ...seatsCollection.schema,
          {
            name: 'position_x',
            type: 'number',
            required: false,
            options: {},
          },
          {
            name: 'position_y',
            type: 'number',
            required: false,
            options: {},
          },
        ],
      });
      console.log('✅ Added position_x and position_y fields');
    } else {
      console.log('ℹ️  Position fields already exist');
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

addSeatPositionFields();

