require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function addEventDateField() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    console.log('📝 Checking current events collection schema...');
    const collection = await pb.collections.getOne('events');
    
    console.log('\nCurrent schema fields:');
    collection.schema.forEach(field => {
      console.log(`  - ${field.name}: ${field.type}${field.required ? ' (required)' : ''}`);
    });

    // Check if event_date field already exists
    const hasEventDate = collection.schema.some(field => field.name === 'event_date');
    const hasStartDate = collection.schema.some(field => field.name === 'start_date');
    const hasEndDate = collection.schema.some(field => field.name === 'end_date');

    console.log('\n📋 Field status:');
    console.log(`  - event_date: ${hasEventDate ? '✅ Exists' : '❌ Missing'}`);
    console.log(`  - start_date: ${hasStartDate ? '✅ Exists' : '❌ Missing'}`);
    console.log(`  - end_date: ${hasEndDate ? '✅ Exists' : '❌ Missing'}`);

    if (hasEventDate) {
      console.log('\n✅ event_date field already exists. No changes needed.');
      return;
    }

    if (!hasStartDate || !hasEndDate) {
      console.log('\n⚠️  Warning: start_date or end_date fields are missing!');
      console.log('   These are required fields. Please check your database schema.');
    }

    // Add event_date field if it doesn't exist
    // Note: This will be a date field that can be used as a primary event date
    // It can be set to the same value as start_date for single-day events
    console.log('\n📝 Adding event_date field to events collection...');
    
    const newSchema = [...collection.schema];
    newSchema.push({
      name: 'event_date',
      type: 'date',
      required: false, // Optional, can be derived from start_date
      options: {}
    });

    await pb.collections.update(collection.id, {
      schema: newSchema
    });

    console.log('✅ Successfully added event_date field to events collection!');
    console.log('\n📝 Note:');
    console.log('   - event_date is optional and can be used as a primary display date');
    console.log('   - For single-day events, you can set event_date = start_date');
    console.log('   - For multi-day events, event_date can represent the main event day');
    console.log('   - start_date and end_date are still required for event scheduling\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

addEventDateField();

