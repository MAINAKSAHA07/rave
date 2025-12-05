#!/usr/bin/env node

/**
 * Check PocketBase Collections
 * 
 * This script connects to PocketBase and lists all collections
 * Usage: node scripts/check-pocketbase-collections.js [pocketbase-url]
 */

const { config } = require('dotenv');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

// Load .env from root
config({ path: path.resolve(__dirname, '../.env') });

const pbUrl = process.env.POCKETBASE_URL || process.argv[2] || 'http://13.201.90.240:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function checkCollections() {
  try {
    console.log('🔍 Checking PocketBase at:', pbUrl);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check health
    try {
      const health = await fetch(`${pbUrl}/api/health`).then(r => r.json());
      console.log('✅ PocketBase Health:', health.message);
      console.log('   Can Backup:', health.data?.canBackup ? 'Yes' : 'No');
      console.log('');
    } catch (error) {
      console.log('⚠️  Health check failed:', error.message);
      console.log('');
    }

    // Authenticate if credentials are provided
    if (adminEmail && adminPassword) {
      console.log('🔐 Authenticating as admin...');
      try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');
      } catch (error) {
        console.log('❌ Authentication failed:', error.message);
        console.log('   Continuing without authentication (limited info)...\n');
      }
    } else {
      console.log('⚠️  No admin credentials found in .env');
      console.log('   Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD for full access\n');
    }

    // List collections
    console.log('📦 Collections:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const collections = await pb.collections.getFullList();
      
      if (collections.length === 0) {
        console.log('   ⚠️  No collections found');
      } else {
        console.log(`   Found ${collections.length} collection(s):\n`);
        
        for (const collection of collections) {
          console.log(`   📋 ${collection.name}`);
          console.log(`      ID: ${collection.id}`);
          console.log(`      Type: ${collection.type}`);
          console.log(`      System: ${collection.system ? 'Yes' : 'No'}`);
          
          // Get record count if authenticated
          if (pb.authStore.isValid) {
            try {
              const records = await pb.collection(collection.name).getList(1, 1);
              console.log(`      Records: ${records.totalItems || 0}`);
            } catch (error) {
              console.log(`      Records: Unable to count (${error.message})`);
            }
          }
          
          // Show fields count
          if (collection.schema && collection.schema.length > 0) {
            console.log(`      Fields: ${collection.schema.length}`);
            const fieldNames = collection.schema.map(f => f.name).join(', ');
            if (fieldNames.length > 60) {
              console.log(`      Field names: ${fieldNames.substring(0, 60)}...`);
            } else {
              console.log(`      Field names: ${fieldNames}`);
            }
          }
          
          console.log('');
        }
      }
    } catch (error) {
      if (error.status === 401) {
        console.log('   ❌ Authentication required to list collections');
        console.log('   Please set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in .env');
      } else {
        console.log('   ❌ Error fetching collections:', error.message);
      }
    }

    // Expected collections from schema
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Expected Collections (from schema):');
    const expectedCollections = [
      'users', // Built-in
      'organizers',
      'organizer_staff',
      'organizer_applications',
      'venues',
      'seats',
      'events',
      'ticket_types',
      'orders',
      'tickets',
      'refunds',
      'payouts',
      'email_templates',
      'event_reminders'
    ];
    
    if (pb.authStore.isValid) {
      try {
        const existingCollections = await pb.collections.getFullList();
        const existingNames = existingCollections.map(c => c.name);
        
        console.log('');
        for (const expected of expectedCollections) {
          const exists = existingNames.includes(expected);
          const icon = exists ? '✅' : '❌';
          console.log(`   ${icon} ${expected}`);
        }
      } catch (error) {
        console.log('   (Unable to compare with existing collections)');
      }
    } else {
      console.log('   (Authentication required to compare)');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Check complete!');
    console.log(`\n🌐 Admin UI: ${pbUrl}/_/`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

checkCollections();



