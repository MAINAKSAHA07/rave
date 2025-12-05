/**
 * Fix Events Access Rules
 * 
 * Ensures super_admin, admin, and organizer staff have proper access to events
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

async function fixEventsAccess() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    // Super Admin and Admin should have full access
    const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

    console.log('📝 Updating events collection access rules...');
    
    // Update events collection
    const eventsCollection = await pb.collections.getOne('events');
    
    // Allow admins to list all events, authenticated users to list events, and public to list published events
    // Note: Organizer staff filtering will be done in application logic
    eventsCollection.listRule = `${adminAccess} || @request.auth.id != "" || status = "published"`;
    eventsCollection.viewRule = `${adminAccess} || @request.auth.id != "" || status = "published"`;
    eventsCollection.createRule = `${adminAccess} || @request.auth.id != ""`;
    eventsCollection.updateRule = `${adminAccess} || @request.auth.id != ""`;
    eventsCollection.deleteRule = adminAccess; // Only admins can delete

    await pb.collections.update(eventsCollection.id, {
      listRule: eventsCollection.listRule,
      viewRule: eventsCollection.viewRule,
      createRule: eventsCollection.createRule,
      updateRule: eventsCollection.updateRule,
      deleteRule: eventsCollection.deleteRule,
    });

    console.log('✅ Updated events access rules:');
    console.log(`   List: ${eventsCollection.listRule}`);
    console.log(`   View: ${eventsCollection.viewRule}`);
    console.log(`   Create: ${eventsCollection.createRule}`);
    console.log(`   Update: ${eventsCollection.updateRule}`);
    console.log(`   Delete: ${eventsCollection.deleteRule}\n`);

    console.log('✅ All access rules updated successfully!');
  } catch (error) {
    console.error('❌ Error updating access rules:', error);
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

fixEventsAccess()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

