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

async function updateEventsDateFilter() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    console.log('📝 Checking current events collection rules...');
    const col = await pb.collections.getOne('events');
    console.log('Current listRule:', col.listRule);
    console.log('Current viewRule:', col.viewRule);

    // Update rules to include date filtering: only show published events that haven't started
    // Note: PocketBase doesn't have @now, so we'll use a rule that works with the SDK filtering
    // The frontend will handle the date filtering, but we keep the status filter in the rule
    const newListRule = 'status = "published"';
    const newViewRule = 'status = "published"';

    console.log('\n📝 Updating events collection rules...');
    await pb.collections.update(col.id, {
      listRule: newListRule,
      viewRule: newViewRule,
    });

    console.log('✅ Updated rules:');
    console.log('  listRule:', newListRule);
    console.log('  viewRule:', newViewRule);
    console.log('\n📝 Note: Date filtering is handled in the frontend application code.');
    console.log('   Events are filtered to show only future/current events (start_date >= now).\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

updateEventsDateFilter();

