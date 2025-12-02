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

async function fixVenuesAccess() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    // Super Admin and Admin should have full access
    const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

    console.log('📝 Updating venues collection access rules...');
    
    // Update venues collection
    const venuesCollection = await pb.collections.getOne('venues');
    
    // Allow admins to list/view all venues, authenticated users to list/view venues
    // Organizer staff filtering will be done in application logic
    venuesCollection.listRule = `${adminAccess} || @request.auth.id != ""`;
    venuesCollection.viewRule = `${adminAccess} || @request.auth.id != ""`;
    venuesCollection.createRule = `${adminAccess} || @request.auth.id != ""`;
    venuesCollection.updateRule = `${adminAccess} || @request.auth.id != ""`;
    venuesCollection.deleteRule = adminAccess; // Only admins can delete

    await pb.collections.update(venuesCollection.id, {
      listRule: venuesCollection.listRule,
      viewRule: venuesCollection.viewRule,
      createRule: venuesCollection.createRule,
      updateRule: venuesCollection.updateRule,
      deleteRule: venuesCollection.deleteRule,
    });

    console.log('✅ Updated venues access rules:');
    console.log(`   List: ${venuesCollection.listRule}`);
    console.log(`   View: ${venuesCollection.viewRule}`);
    console.log(`   Create: ${venuesCollection.createRule}`);
    console.log(`   Update: ${venuesCollection.updateRule}`);
    console.log(`   Delete: ${venuesCollection.deleteRule}`);
    console.log('\n✅ Venues access rules updated successfully!');

  } catch (error) {
    console.error('❌ Error updating venues access rules:', error);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

fixVenuesAccess();

