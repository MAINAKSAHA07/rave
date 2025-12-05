/**
 * Migration Script: Convert Approved Applications to Organizers
 * 
 * This script finds all approved organizer_applications that don't have
 * a corresponding organizer record and creates organizer records for them.
 * 
 * Run with: node pocketbase/migrate-approved-applications.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

async function migrateApprovedApplications() {
  const pb = new PocketBase(POCKETBASE_URL);

  try {
    console.log('Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Authenticated successfully\n');

    // Get all approved applications
    console.log('Fetching approved applications...');
    const approvedApps = await pb.collection('organizer_applications').getFullList({
      filter: 'status="approved"',
      sort: '-created',
    });
    console.log(`Found ${approvedApps.length} approved application(s)\n`);

    if (approvedApps.length === 0) {
      console.log('No approved applications to migrate.');
      return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const app of approvedApps) {
      try {
        // Check if organizer with same email already exists
        try {
          const existing = await pb.collection('organizers').getFirstListItem(`email="${app.email}"`);
          console.log(`⚠ Skipping "${app.name}" (${app.email}) - organizer already exists (ID: ${existing.id})`);
          skipped++;
          continue;
        } catch (e) {
          if (e.status !== 404) {
            throw e;
          }
          // 404 means organizer doesn't exist, which is what we want
        }

        // Create organizer record
        console.log(`Creating organizer for "${app.name}" (${app.email})...`);
        const organizer = await pb.collection('organizers').create({
          name: app.name,
          email: app.email,
          phone: app.phone,
          gst_number: app.gst_number || undefined,
          status: 'approved',
          approved_by: app.reviewed_by || undefined,
          approved_at: app.reviewed_at || new Date().toISOString(),
        });

        console.log(`✓ Created organizer: ${organizer.id} (${organizer.name})`);
        created++;
      } catch (error) {
        console.error(`✗ Error processing "${app.name}" (${app.email}):`, error.message);
        if (error.data) {
          console.error('  Details:', JSON.stringify(error.data, null, 2));
        }
        errors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total approved applications: ${approvedApps.length}`);
    console.log(`Organizers created: ${created}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Errors: ${errors}`);
  } catch (error) {
    console.error('Migration failed:', error);
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

migrateApprovedApplications()
  .then(() => {
    console.log('\n✓ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  });

