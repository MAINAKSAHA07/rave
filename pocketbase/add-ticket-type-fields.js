#!/usr/bin/env node

/**
 * Migration script to add ticket_type_category and table_ids fields to ticket_types collection
 * 
 * Usage:
 *   node pocketbase/add-ticket-type-fields.js
 * 
 * Environment variables (optional, will use defaults):
 *   AWS_POCKETBASE_URL - PocketBase URL (default: http://13.201.90.240:8092)
 *   AWS_POCKETBASE_ADMIN_EMAIL - Admin email
 *   AWS_POCKETBASE_ADMIN_PASSWORD - Admin password
 */

const PocketBase = require('pocketbase/cjs');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

// Try to load .env from multiple locations
const rootEnvPath = path.join(__dirname, '..', '.env');
const pocketbaseEnvPath = path.join(__dirname, '.env');

loadEnvFile(rootEnvPath);
loadEnvFile(pocketbaseEnvPath);

// Get configuration from environment variables or command line args
const pbUrl = process.env.AWS_POCKETBASE_URL || process.argv[2] || 'http://13.201.90.240:8092';
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.argv[3] || 'admin@example.com';
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.argv[4] || '';

console.log('='.repeat(60));
console.log('PocketBase Ticket Types Migration Script');
console.log('='.repeat(60));
console.log('PocketBase URL:', pbUrl);
console.log('Admin Email:', adminEmail);
console.log('Admin Password:', adminPassword ? '***' : 'NOT SET');
console.log('='.repeat(60));
console.log('');

if (!adminPassword) {
  console.error('ERROR: Admin password is required!');
  console.error('Set AWS_POCKETBASE_ADMIN_PASSWORD in .env file or pass as argument');
  process.exit(1);
}

async function main() {
  const pb = new PocketBase(pbUrl);
  pb.autoCancellation(false);

  try {
    // Authenticate as admin
    console.log('Authenticating as admin...');
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('✓ Authentication successful');
    } catch (authError) {
      console.error('✗ Authentication failed:', authError.message);
      console.error('Please check your admin credentials');
      process.exit(1);
    }

    // Get the ticket_types collection
    console.log('\nFetching ticket_types collection...');
    const collections = await pb.collections.getFullList();
    const ticketTypesCollection = collections.find(c => c.name === 'ticket_types');
    
    if (!ticketTypesCollection) {
      console.error('✗ ticket_types collection not found!');
      process.exit(1);
    }

    console.log('✓ Found ticket_types collection');
    console.log('  Collection ID:', ticketTypesCollection.id);
    console.log('  Current fields:', ticketTypesCollection.schema.length);

    // Check if fields already exist
    const hasCategoryField = ticketTypesCollection.schema.some(f => f.name === 'ticket_type_category');
    const hasTableIdsField = ticketTypesCollection.schema.some(f => f.name === 'table_ids');

    if (hasCategoryField && hasTableIdsField) {
      console.log('\n✓ Both fields already exist in the collection');
      console.log('  - ticket_type_category: exists');
      console.log('  - table_ids: exists');
      console.log('\nMigration not needed. Exiting.');
      return;
    }

    // Prepare schema updates
    const schema = [...ticketTypesCollection.schema];

    // Add ticket_type_category field if it doesn't exist
    if (!hasCategoryField) {
      console.log('\nAdding ticket_type_category field...');
      schema.push({
        name: 'ticket_type_category',
        type: 'select',
        required: false,
        options: {
          values: ['GA', 'TABLE'],
          maxSelect: 1,
        },
        presentable: false,
      });
      console.log('  ✓ Added ticket_type_category (Select: GA, TABLE)');
    } else {
      console.log('\n  - ticket_type_category already exists, skipping');
    }

    // Add table_ids field if it doesn't exist
    if (!hasTableIdsField) {
      console.log('\nAdding table_ids field...');
      schema.push({
        name: 'table_ids',
        type: 'json',
        required: false,
        options: {
          maxSize: 1000000, // 1MB max size
        },
        presentable: false,
      });
      console.log('  ✓ Added table_ids (JSON)');
    } else {
      console.log('\n  - table_ids already exists, skipping');
    }

    // Update the collection
    console.log('\nUpdating ticket_types collection schema...');
    try {
      await pb.collections.update(ticketTypesCollection.id, {
        schema: schema,
      });
      console.log('✓ Collection schema updated successfully');
    } catch (updateError) {
      console.error('✗ Failed to update collection schema:', updateError.message);
      if (updateError.response?.data) {
        console.error('  Error details:', JSON.stringify(updateError.response.data, null, 2));
      }
      throw updateError;
    }

    // Verify the update
    console.log('\nVerifying update...');
    const updatedCollection = await pb.collections.getOne(ticketTypesCollection.id);
    const updatedHasCategory = updatedCollection.schema.some(f => f.name === 'ticket_type_category');
    const updatedHasTableIds = updatedCollection.schema.some(f => f.name === 'table_ids');

    if (updatedHasCategory && updatedHasTableIds) {
      console.log('✓ Verification successful!');
      console.log('  - ticket_type_category: present');
      console.log('  - table_ids: present');
    } else {
      console.error('✗ Verification failed!');
      console.error('  - ticket_type_category:', updatedHasCategory ? 'present' : 'MISSING');
      console.error('  - table_ids:', updatedHasTableIds ? 'present' : 'MISSING');
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\nYou can now use ticket_type_category and table_ids in your ticket types.');
    console.log('');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();

