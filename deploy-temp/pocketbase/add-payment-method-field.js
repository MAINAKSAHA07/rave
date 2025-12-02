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

async function addPaymentMethodField() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    console.log('📝 Adding payment_method field to orders collection...');
    
    const ordersCollection = await pb.collections.getOne('orders');
    
    // Check if field already exists
    const existingField = ordersCollection.schema.find((f) => f.name === 'payment_method');
    if (existingField) {
      console.log('ℹ️  payment_method field already exists. Skipping...');
      return;
    }

    // Add payment_method field
    ordersCollection.schema.push({
      name: 'payment_method',
      type: 'select',
      required: false,
      options: {
        values: ['razorpay', 'cash'],
        maxSelect: 1,
      },
    });

    await pb.collections.update(ordersCollection.id, {
      schema: ordersCollection.schema,
    });

    console.log('✅ Added payment_method field to orders collection');
    console.log('   Type: select (razorpay, cash)');
    console.log('   Default: razorpay');

  } catch (error) {
    console.error('❌ Error adding payment_method field:', error);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

addPaymentMethodField();

