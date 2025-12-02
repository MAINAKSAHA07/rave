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

async function fixUsersAccess() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    // Super Admin and Admin should have full access
    const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

    console.log('📝 Updating users collection access rules...');
    
    // Update users collection (built-in collection)
    // Note: PocketBase's built-in users collection has special handling
    // For public signup, createRule should be empty string ""
    const usersCollection = await pb.collections.getOne('users');
    
    // Allow public signup, users can view own record, admins have full access
    usersCollection.listRule = `id = @request.auth.id || ${adminAccess}`;
    usersCollection.viewRule = `id = @request.auth.id || ${adminAccess}`;
    usersCollection.createRule = ""; // Empty string = public access (allows signup)
    usersCollection.updateRule = `id = @request.auth.id || ${adminAccess}`;
    usersCollection.deleteRule = adminAccess; // Only admins can delete

    await pb.collections.update(usersCollection.id, {
      listRule: usersCollection.listRule,
      viewRule: usersCollection.viewRule,
      createRule: usersCollection.createRule,
      updateRule: usersCollection.updateRule,
      deleteRule: usersCollection.deleteRule,
    });

    console.log('✅ Updated users access rules:');
    console.log(`   List: ${usersCollection.listRule}`);
    console.log(`   View: ${usersCollection.viewRule}`);
    console.log(`   Create: ${usersCollection.createRule} (empty = public signup)`);
    console.log(`   Update: ${usersCollection.updateRule}`);
    console.log(`   Delete: ${usersCollection.deleteRule}`);
    console.log('\n✅ Users access rules updated successfully!');
    console.log('\n📝 Note: Public signup is now enabled. Users can create accounts.');

  } catch (error) {
    console.error('❌ Error updating users access rules:', error);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

fixUsersAccess();

