/**
 * Add table_id field to tickets collection
 * 
 * Usage:
 *   node add-table-id-to-tickets.js
 *   POCKETBASE_URL=http://localhost:8090 node add-table-id-to-tickets.js
 *   POCKETBASE_URL=http://localhost:8090 POCKETBASE_ADMIN_EMAIL=admin@example.com POCKETBASE_ADMIN_PASSWORD=password node add-table-id-to-tickets.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// Also try loading .env from pocketbase directory
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const PocketBase = require('pocketbase/cjs');

// Use AWS configuration only, port 8092
const pbUrl = process.argv.find(arg => arg.startsWith('POCKETBASE_URL='))?.split('=')[1] 
    || process.env.AWS_POCKETBASE_URL 
    || 'http://13.201.90.240:8092';
    
const adminEmail = process.argv.find(arg => arg.startsWith('POCKETBASE_ADMIN_EMAIL='))?.split('=')[1]
    || process.env.AWS_POCKETBASE_ADMIN_EMAIL;
    
const adminPassword = process.argv.find(arg => arg.startsWith('POCKETBASE_ADMIN_PASSWORD='))?.split('=')[1]
    || process.env.AWS_POCKETBASE_ADMIN_PASSWORD;

console.log('📋 Configuration:');
console.log(`   PocketBase URL: ${pbUrl}`);
console.log(`   Admin Email: ${adminEmail ? adminEmail.substring(0, 3) + '***' : 'NOT SET'}`);
console.log(`   Admin Password: ${adminPassword ? '***' : 'NOT SET'}\n`);

if (!adminEmail || !adminPassword) {
    console.error('❌ Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
    console.error('\nPlease set these in your .env file:');
    console.error('   POCKETBASE_ADMIN_EMAIL=your-email@example.com');
    console.error('   POCKETBASE_ADMIN_PASSWORD=your-password');
    console.error('\nOr for AWS:');
    console.error('   AWS_POCKETBASE_ADMIN_EMAIL=your-email@example.com');
    console.error('   AWS_POCKETBASE_ADMIN_PASSWORD=your-password');
    process.exit(1);
}

async function addTableIdField() {
    let pb = null;
    
    try {
        console.log('🔐 Authenticating with PocketBase (AWS)...');
        console.log(`   Connecting to: ${pbUrl}`);
        
        pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');
    } catch (authError) {
        console.error('\n❌ Authentication failed!');
        console.error(`   Status: ${authError.status || 'Unknown'}`);
        console.error(`   Message: ${authError.message || 'Unknown error'}`);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Verify AWS PocketBase admin credentials in .env file:');
        console.error('      AWS_POCKETBASE_ADMIN_EMAIL=your-email@example.com');
        console.error('      AWS_POCKETBASE_ADMIN_PASSWORD=your-password');
        console.error('   2. Verify admin credentials in PocketBase admin UI:');
        console.error(`      - Open ${pbUrl}/_/`);
        console.error('      - Go to Settings > Admins');
        console.error('      - Check if the admin account exists and password is correct');
        console.error('   3. Create a new admin if needed:');
        console.error('      - In PocketBase admin UI, go to Settings > Admins');
        console.error('      - Click "Create new admin"');
        console.error('   4. Or run with credentials directly:');
        console.error(`      POCKETBASE_URL=${pbUrl} POCKETBASE_ADMIN_EMAIL=email POCKETBASE_ADMIN_PASSWORD=pass node add-table-id-to-tickets.js`);
        throw authError;
    }

    try {
        // Get tickets collection
        console.log('Getting tickets collection...');
        const ticketsCollection = await pb.collections.getOne('tickets');
        console.log('✅ Found tickets collection\n');

        // Check if table_id field already exists
        const hasTableId = ticketsCollection.schema.some(field => field.name === 'table_id');
        if (hasTableId) {
            console.log('✅ table_id field already exists in tickets collection');
            return;
        }

        // Get tables collection ID
        const tablesCollection = await pb.collections.getOne('tables');
        const tablesCollectionId = tablesCollection.id;
        console.log(`Found tables collection ID: ${tablesCollectionId}\n`);

        // Add table_id field
        console.log('Adding table_id field to tickets collection...');
        ticketsCollection.schema.push({
            name: 'table_id',
            type: 'relation',
            required: false,
            presentable: false,
            unique: false,
            options: {
                collectionId: tablesCollectionId,
                cascadeDelete: false,
                minSelect: null,
                maxSelect: 1,
                displayFields: null
            }
        });

        await pb.collections.update('tickets', {
            schema: ticketsCollection.schema
        });

        console.log('✅ table_id field added to tickets collection');

        // Reload collection to get updated schema
        const updatedCollection = await pb.collections.getOne('tickets');
        
        // Add index for table_id (optional - can be added manually in admin UI if needed)
        console.log('Checking for table_id index...');
        const existingIndexes = updatedCollection.indexes || [];
        const hasTableIdIndex = existingIndexes.some(idx => {
            if (!idx.fields || !Array.isArray(idx.fields)) return false;
            return idx.fields.length === 1 && idx.fields[0] === 'table_id';
        });
        
        if (!hasTableIdIndex) {
            try {
                // Try to add index - format may vary by PocketBase version
                const newIndexes = [...existingIndexes];
                newIndexes.push({
                    fields: ['table_id']
                });
                
                await pb.collections.update('tickets', {
                    indexes: newIndexes
                });
                console.log('✅ Index added for table_id');
            } catch (indexError) {
                console.log('⚠️  Could not add index automatically (this is optional)');
                console.log('   You can add the index manually in PocketBase admin UI:');
                console.log('   1. Go to Collections > tickets > Indexes');
                console.log('   2. Click "Create new index"');
                console.log('   3. Select "table_id" field');
                console.log('   (Index is optional but recommended for better query performance)');
            }
        } else {
            console.log('✅ Index for table_id already exists');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        if (error.response && error.response.data) {
            console.error('Error details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

addTableIdField();

