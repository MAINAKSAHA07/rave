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
        // Remove quotes if present
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
  console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function addEventDetailFields() {
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

    // Define new fields to add
    const newFields = [
      { name: 'about', type: 'text', required: false, options: {} },
      { name: 'overview', type: 'text', required: false, options: {} },
      { name: 'things_to_carry', type: 'text', required: false, options: {} },
      { name: 'inclusions', type: 'text', required: false, options: {} },
      { name: 'terms_and_conditions', type: 'text', required: false, options: {} },
      { name: 'venue_details', type: 'text', required: false, options: {} },
      { name: 'organizer_info', type: 'text', required: false, options: {} },
    ];

    console.log('\n📋 Checking which fields need to be added...');
    const fieldsToAdd = [];
    
    for (const newField of newFields) {
      const exists = collection.schema.some(field => field.name === newField.name);
      if (exists) {
        console.log(`  ✅ ${newField.name}: Already exists`);
      } else {
        console.log(`  ❌ ${newField.name}: Missing - will be added`);
        fieldsToAdd.push(newField);
      }
    }

    if (fieldsToAdd.length === 0) {
      console.log('\n✅ All fields already exist. No changes needed.');
      return;
    }

    console.log(`\n📝 Adding ${fieldsToAdd.length} new field(s) to events collection...`);
    
    // Add new fields to schema
    const newSchema = [...collection.schema];
    fieldsToAdd.forEach(field => {
      newSchema.push({
        name: field.name,
        type: field.type,
        required: field.required,
        options: field.options
      });
    });

    await pb.collections.update(collection.id, {
      schema: newSchema
    });

    console.log('\n✅ Successfully added the following fields to events collection:');
    fieldsToAdd.forEach(field => {
      console.log(`  - ${field.name} (${field.type})`);
    });

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

addEventDetailFields();

