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

async function fixTicketTypesAccess() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated successfully\n');

    // Super Admin and Admin should have full access
    const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

    console.log('📝 Updating ticket_types collection access rules...');

    // Update ticket_types collection
    const ticketTypesCollection = await pb.collections.getOne('ticket_types');

    // Allow admins to list/view all ticket types, authenticated users to list/view ticket types
    // Organizer staff filtering will be done in application logic
    // Allow public access to list/view ticket types (needed for event page)
    ticketTypesCollection.listRule = "";
    ticketTypesCollection.viewRule = "";
    ticketTypesCollection.createRule = `${adminAccess} || @request.auth.id != ""`;
    ticketTypesCollection.updateRule = `${adminAccess} || @request.auth.id != ""`;
    ticketTypesCollection.deleteRule = adminAccess; // Only admins can delete

    await pb.collections.update(ticketTypesCollection.id, {
      listRule: ticketTypesCollection.listRule,
      viewRule: ticketTypesCollection.viewRule,
      createRule: ticketTypesCollection.createRule,
      updateRule: ticketTypesCollection.updateRule,
      deleteRule: ticketTypesCollection.deleteRule,
    });

    console.log('✅ Updated ticket_types access rules:');
    console.log(`   List: ${ticketTypesCollection.listRule}`);
    console.log(`   View: ${ticketTypesCollection.viewRule}`);
    console.log(`   Create: ${ticketTypesCollection.createRule}`);
    console.log(`   Update: ${ticketTypesCollection.updateRule}`);
    console.log(`   Delete: ${ticketTypesCollection.deleteRule}`);
    console.log('\n✅ Ticket types access rules updated successfully!');

  } catch (error) {
    console.error('❌ Error updating ticket_types access rules:', error);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

fixTicketTypesAccess();

