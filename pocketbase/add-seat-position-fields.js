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
  console.error('❌ Admin credentials not found in .env');
  console.error('   Please set AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD');
  process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function addSeatPositionFields() {
  try {
    console.log(`🔐 Connecting to PocketBase at: ${pbUrl}`);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin\n');

    // Get seats collection
    const seatsCollection = await pb.collections.getOne('seats');
    console.log('📝 Checking seats collection schema...');
    
    // Display current schema
    console.log('\nCurrent schema fields:');
    seatsCollection.schema.forEach(field => {
      console.log(`  - ${field.name}: ${field.type}${field.required ? ' (required)' : ''}`);
    });

    // Check if fields already exist
    const existingFields = seatsCollection.schema.map((f) => f.name);
    
    console.log('\n📋 Checking which fields need to be added...');
    const needsPositionX = !existingFields.includes('position_x');
    const needsPositionY = !existingFields.includes('position_y');
    
    if (needsPositionX) {
      console.log('  ❌ position_x: Missing - will be added');
    } else {
      console.log('  ✅ position_x: Already exists');
    }
    
    if (needsPositionY) {
      console.log('  ❌ position_y: Missing - will be added');
    } else {
      console.log('  ✅ position_y: Already exists');
    }
    
    if (needsPositionX || needsPositionY) {
      console.log('\n📝 Adding position fields to seats collection...');
      
      const newSchema = [...seatsCollection.schema];
      
      if (needsPositionX) {
        newSchema.push({
          name: 'position_x',
          type: 'number',
          required: false,
          options: {},
        });
      }
      
      if (needsPositionY) {
        newSchema.push({
          name: 'position_y',
          type: 'number',
          required: false,
          options: {},
        });
      }
      
      await pb.collections.update(seatsCollection.id, {
        schema: newSchema,
      });
      
      console.log('✅ Successfully added position fields to seats collection!');
      if (needsPositionX) console.log('  - position_x (number, optional)');
      if (needsPositionY) console.log('  - position_y (number, optional)');
    } else {
      console.log('\n✅ All position fields already exist. No changes needed.');
    }

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

addSeatPositionFields();
