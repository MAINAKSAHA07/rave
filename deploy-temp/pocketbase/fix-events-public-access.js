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

async function fixEventsPublicAccess() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    console.log('📝 Checking current events collection rules...');
    const eventsCollection = await pb.collections.getOne('events');
    console.log(`Current listRule: ${eventsCollection.listRule || '(empty)'}`);
    console.log(`Current viewRule: ${eventsCollection.viewRule || '(empty)'}\n`);

    // Set rules to allow public access to published events
    // Empty string "" means public access in PocketBase
    // But we want to filter by status, so we use: status = "published"
    const publicListRule = 'status = "published"';
    const publicViewRule = 'status = "published"';

    console.log('📝 Updating events collection access rules...');
    await pb.collections.update(eventsCollection.id, {
      listRule: publicListRule,
      viewRule: publicViewRule,
      // Keep create/update/delete rules as they were (or set appropriately)
      createRule: eventsCollection.createRule,
      updateRule: eventsCollection.updateRule,
      deleteRule: eventsCollection.deleteRule,
    });

    console.log('✅ Updated events access rules:');
    console.log(`   List Rule: ${publicListRule}`);
    console.log(`   View Rule: ${publicViewRule}`);
    console.log('\n✅ Events collection now allows public access to published events!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

fixEventsPublicAccess();

