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

async function fixEventsPublicFinal() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    console.log('📝 Checking current events collection...');
    const eventsCollection = await pb.collections.getOne('events');
    console.log(`Current listRule: ${eventsCollection.listRule || '(empty/null)'}`);
    console.log(`Current viewRule: ${eventsCollection.viewRule || '(empty/null)'}\n`);

    // Try multiple approaches:
    // 1. First, try empty string (should be public)
    console.log('📝 Attempt 1: Setting rules to empty string (public access)...');
    await pb.collections.update(eventsCollection.id, {
      listRule: '',
      viewRule: '',
    });
    console.log('✅ Set to empty string\n');

    // Test if it works
    console.log('🧪 Testing public access...');
    try {
      const testPb = new PocketBase(pbUrl);
      const result = await testPb.collection('events').getList(1, 1);
      console.log('✅ Public access works! Found', result.items.length, 'events\n');
    } catch (testError) {
      console.log('❌ Public access failed:', testError.message);
      console.log('📝 Attempt 2: Setting rule to explicitly allow unauthenticated...\n');
      
      // Try with explicit rule for unauthenticated users
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      await pb.collections.update(eventsCollection.id, {
        listRule: '@request.auth.id = "" || status = "published"',
        viewRule: '@request.auth.id = "" || status = "published"',
      });
      console.log('✅ Set rule to: @request.auth.id = "" || status = "published"');
      
      // Test again
      try {
        const testPb2 = new PocketBase(pbUrl);
        const result2 = await testPb2.collection('events').getList(1, 1, { filter: 'status="published"' });
        console.log('✅ Public access works with explicit rule! Found', result2.items.length, 'events\n');
      } catch (testError2) {
        console.log('❌ Still failing:', testError2.message);
        console.log('\n📝 Attempt 3: Using simple status filter...\n');
        
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        await pb.collections.update(eventsCollection.id, {
          listRule: 'status = "published"',
          viewRule: 'status = "published"',
        });
        console.log('✅ Set rule to: status = "published"');
      }
    }

    // Final check
    const finalCollection = await pb.collections.getOne('events');
    console.log('\n📋 Final rules:');
    console.log(`   List Rule: ${finalCollection.listRule || '(empty)'}`);
    console.log(`   View Rule: ${finalCollection.viewRule || '(empty)'}`);

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

fixEventsPublicFinal();

