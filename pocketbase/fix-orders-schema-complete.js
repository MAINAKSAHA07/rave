require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

// Priority: AWS_POCKETBASE_URL > POCKETBASE_URL > localhost
const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
// Priority: AWS-prefixed vars > regular vars
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

console.log('📋 Environment Check:');
console.log(`   PocketBase URL: ${pbUrl}`);
console.log(`   Admin Email: ${adminEmail ? adminEmail.substring(0, Math.min(5, adminEmail.length)) + '***' : '❌ NOT SET'}`);
console.log(`   Admin Password: ${adminPassword ? '***' + (adminPassword.length > 3 ? adminPassword.substring(adminPassword.length - 3) : '***') : '❌ NOT SET'}`);
console.log('');

if (!adminEmail || !adminPassword) {
  console.error('❌ Error: Admin credentials must be set in .env');
  console.error('');
  console.error('Please check your .env file in the project root and ensure one of:');
  console.error('   AWS_POCKETBASE_ADMIN_EMAIL=your_admin_email@example.com');
  console.error('   AWS_POCKETBASE_ADMIN_PASSWORD=your_admin_password');
  console.error('   OR');
  console.error('   POCKETBASE_ADMIN_EMAIL=your_admin_email@example.com');
  console.error('   POCKETBASE_ADMIN_PASSWORD=your_admin_password');
  console.error('');
  console.error('Or set them as environment variables:');
  console.error('   export AWS_POCKETBASE_ADMIN_EMAIL=your_admin_email@example.com');
  console.error('   export AWS_POCKETBASE_ADMIN_PASSWORD=your_admin_password');
  process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function fixOrdersSchema() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    console.log(`   Attempting to connect to: ${pbUrl}`);
    console.log(`   Using email: ${adminEmail}`);
    
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('✅ Authenticated successfully\n');
    } catch (authError) {
      console.error('❌ Authentication failed!');
      console.error(`   Status: ${authError.status}`);
      console.error(`   Message: ${authError.message || authError.response?.message}`);
      console.error(`   URL: ${authError.url || 'N/A'}`);
      console.error('');
      console.error('Possible issues:');
      console.error('   1. ❌ Incorrect email or password');
      console.error('   2. ❌ Admin account does not exist');
      console.error('   3. ❌ Network connectivity issue');
      console.error('   4. ❌ PocketBase server is not accessible');
      console.error('');
      console.error('To fix:');
      console.error('   1. Verify your admin credentials in PocketBase admin UI');
      console.error(`   2. Go to ${pbUrl}/_/ and check your admin account`);
      console.error('   3. Make sure you can log in through the web UI');
      console.error('   4. Update POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in .env');
      console.error('   5. Verify the PocketBase URL is correct and accessible');
      console.error('');
      console.error('Quick test:');
      console.error(`   Try accessing: ${pbUrl}/_/`);
      throw authError;
    }

    console.log('📝 Fixing orders collection schema...');
    
    const ordersCollection = await pb.collections.getOne('orders');
    console.log('Current schema fields:', ordersCollection.schema.map(f => f.name).join(', '));
    
    const requiredFields = {
      'base_amount_minor': {
        name: 'base_amount_minor',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {}
      },
      'gst_amount_minor': {
        name: 'gst_amount_minor',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {}
      },
      'payment_method': {
        name: 'payment_method',
        type: 'select',
        required: false,
        presentable: false,
        unique: false,
        options: {
          values: ['razorpay', 'cash'],
          maxSelect: 1
        }
      }
    };

    let schemaUpdated = false;
    const updatedSchema = [...ordersCollection.schema];

    // Check and add missing fields
    for (const [fieldName, fieldDef] of Object.entries(requiredFields)) {
      const existingField = updatedSchema.find((f) => f.name === fieldName);
      if (!existingField) {
        console.log(`   Adding missing field: ${fieldName}`);
        updatedSchema.push(fieldDef);
        schemaUpdated = true;
      } else {
        console.log(`   Field ${fieldName} already exists`);
      }
    }

    if (schemaUpdated) {
      await pb.collections.update(ordersCollection.id, {
        schema: updatedSchema,
      });
      console.log('✅ Orders collection schema updated successfully');
      console.log('   Added fields:', Object.keys(requiredFields).filter(f => 
        !ordersCollection.schema.find(s => s.name === f)
      ).join(', '));
    } else {
      console.log('✅ All required fields already exist in orders collection');
    }

    // Verify the schema
    const updatedCollection = await pb.collections.getOne('orders');
    console.log('\n📋 Final orders schema:');
    updatedCollection.schema.forEach(field => {
      console.log(`   - ${field.name} (${field.type})${field.required ? ' [required]' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error fixing orders schema:', error);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

fixOrdersSchema();




