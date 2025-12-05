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

async function fixTicketsAccess() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    console.log('📝 Updating "tickets" collection access rules...');

    const ticketsCollection = await pb.collections.getOne('tickets');

    const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

    ticketsCollection.listRule = `${adminAccess} || order_id.user_id = @request.auth.id`;
    ticketsCollection.viewRule = `${adminAccess} || order_id.user_id = @request.auth.id`;

    await pb.collections.update(ticketsCollection.id, {
      listRule: ticketsCollection.listRule,
      viewRule: ticketsCollection.viewRule,
    });

    console.log('✅ Updated tickets access rules:');
    console.log(`   List: ${ticketsCollection.listRule}`);
    console.log(`   View: ${ticketsCollection.viewRule}`);
    console.log('\nNow admins/super_admins can see all tickets, and customers still see only their own.');
  } catch (error) {
    console.error('❌ Error updating tickets access rules:', error);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

fixTicketsAccess();
