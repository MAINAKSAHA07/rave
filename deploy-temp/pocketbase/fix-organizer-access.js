/**
 * Fix Organizer Access Rules
 * 
 * Ensures super_admin and admin have full access to organizers collection
 */

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

async function fixOrganizerAccess() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    // Super Admin and Admin should have full access
    const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

    console.log('📝 Updating organizers collection access rules...');
    
    // Update organizers collection
    const organizersCollection = await pb.collections.getOne('organizers');
    
    // Update rules to ensure super_admin and admin have full access
    organizersCollection.listRule = `${adminAccess} || @request.auth.id != ""`;
    organizersCollection.viewRule = `${adminAccess} || @request.auth.id != ""`; // Allow authenticated users to view, but admins have full access
    organizersCollection.createRule = adminAccess; // Only admins can create
    organizersCollection.updateRule = `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`; // Admins or staff can update
    organizersCollection.deleteRule = adminAccess; // Only admins can delete

    await pb.collections.update(organizersCollection.id, {
      listRule: organizersCollection.listRule,
      viewRule: organizersCollection.viewRule,
      createRule: organizersCollection.createRule,
      updateRule: organizersCollection.updateRule,
      deleteRule: organizersCollection.deleteRule,
    });

    console.log('✅ Updated organizers access rules:');
    console.log(`   List: ${organizersCollection.listRule}`);
    console.log(`   View: ${organizersCollection.viewRule}`);
    console.log(`   Create: ${organizersCollection.createRule}`);
    console.log(`   Update: ${organizersCollection.updateRule}`);
    console.log(`   Delete: ${organizersCollection.deleteRule}\n`);

    // Also update organizer_staff collection
    console.log('📝 Updating organizer_staff collection access rules...');
    const staffCollection = await pb.collections.getOne('organizer_staff');
    
    // For organizer_staff, we can check if user is staff of the organizer
    // But the relation syntax is tricky - we'll keep it simple: admins have full access, users can view their own
    staffCollection.listRule = `${adminAccess} || user_id = @request.auth.id`;
    staffCollection.viewRule = `${adminAccess} || user_id = @request.auth.id`;
    staffCollection.createRule = adminAccess; // Only admins can create staff (for now)
    staffCollection.updateRule = adminAccess;
    staffCollection.deleteRule = adminAccess;

    await pb.collections.update(staffCollection.id, {
      listRule: staffCollection.listRule,
      viewRule: staffCollection.viewRule,
      createRule: staffCollection.createRule,
      updateRule: staffCollection.updateRule,
      deleteRule: staffCollection.deleteRule,
    });

    console.log('✅ Updated organizer_staff access rules\n');

    console.log('✅ All access rules updated successfully!');
  } catch (error) {
    console.error('❌ Error updating access rules:', error);
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

fixOrganizerAccess()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

