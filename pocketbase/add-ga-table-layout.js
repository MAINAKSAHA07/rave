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

async function addGATableLayoutType() {
  try {
    console.log(`🔐 Connecting to PocketBase at: ${pbUrl}`);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin\n');

    // Get venues collection
    const venuesCollection = await pb.collections.getOne('venues');
    console.log('📝 Checking venues collection schema...');
    
    // Find layout_type field
    const layoutTypeField = venuesCollection.schema.find(f => f.name === 'layout_type');
    
    if (!layoutTypeField) {
      console.error('❌ layout_type field not found in venues collection');
      process.exit(1);
    }

    console.log('\nCurrent layout_type values:');
    layoutTypeField.options.values.forEach(val => {
      console.log(`  - ${val}`);
    });

    // Check if GA_TABLE already exists
    if (layoutTypeField.options.values.includes('GA_TABLE')) {
      console.log('\n✅ GA_TABLE already exists in layout_type options. No changes needed.');
      return;
    }

    // Add GA_TABLE to values
    const updatedValues = [...layoutTypeField.options.values, 'GA_TABLE'];
    
    console.log('\n📝 Adding GA_TABLE to layout_type options...');
    
    // Update the field in the schema
    const updatedSchema = venuesCollection.schema.map(field => {
      if (field.name === 'layout_type') {
        return {
          ...field,
          options: {
            ...field.options,
            values: updatedValues,
          },
        };
      }
      return field;
    });

    await pb.collections.update(venuesCollection.id, {
      schema: updatedSchema,
    });

    console.log('✅ Successfully added GA_TABLE to layout_type options!');
    console.log('\nUpdated layout_type values:');
    updatedValues.forEach(val => {
      console.log(`  - ${val}`);
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

addGATableLayoutType();




