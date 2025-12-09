#!/usr/bin/env node

/**
 * Simple script to check customers collection configuration
 * Can be run on AWS server directly
 */

const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

console.log('🔍 Checking customers collection...\n');
console.log(`📍 PocketBase URL: ${pbUrl}\n`);

if (!adminEmail || !adminPassword) {
    console.error('❌ Admin credentials required');
    console.error('   Set AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD');
    process.exit(1);
}

async function checkCollection() {
    try {
        const pb = new PocketBase(pbUrl);
        
        console.log('🔐 Authenticating...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated\n');

        console.log('📋 Getting customers collection...');
        const collection = await pb.collections.getOne('customers');
        
        console.log('\n✅ Collection Found!');
        console.log(`   Name: ${collection.name}`);
        console.log(`   Type: ${collection.type}`);
        console.log(`   ID: ${collection.id}\n`);

        console.log('📝 Schema Fields:');
        const schema = collection.schema || [];
        const fieldNames = schema.map(f => f.name);
        console.log(`   ${fieldNames.join(', ') || 'No custom fields'}\n`);

        // Check required fields
        const hasName = fieldNames.includes('name');
        const hasPhone = fieldNames.includes('phone');
        const hasAvatar = fieldNames.includes('avatar');

        console.log('✅ Required Fields Check:');
        console.log(`   name: ${hasName ? '✅' : '❌'}`);
        console.log(`   phone: ${hasPhone ? '✅' : '❌'}`);
        console.log(`   avatar: ${hasAvatar ? '✅' : '❌'}\n`);

        console.log('🔐 Auth Options:');
        const options = collection.options || {};
        console.log(`   allowEmailAuth: ${options.allowEmailAuth ? '✅' : '❌'}`);
        console.log(`   allowOAuth2Auth: ${options.allowOAuth2Auth ? '✅' : '❌'}`);
        console.log(`   onlyVerified: ${options.onlyVerified ? '⚠️  (may block login)' : '✅'}\n`);

        console.log('📜 Collection Rules:');
        console.log(`   createRule: "${collection.createRule || ''}" ${!collection.createRule ? '✅ (allows public creation)' : '⚠️  (may block Google login)'}`);
        console.log(`   updateRule: ${collection.updateRule || '(empty)'}`);
        console.log(`   listRule: ${collection.listRule || '(empty)'}\n`);

        // Summary
        const issues = [];
        if (!hasName) issues.push('Missing "name" field');
        if (!hasPhone) issues.push('Missing "phone" field');
        if (!options.allowEmailAuth) issues.push('Email auth disabled');
        if (options.onlyVerified) issues.push('Email verification required');
        if (collection.createRule && collection.createRule !== '') issues.push('createRule is set (may block creation)');

        if (issues.length === 0) {
            console.log('✅ Collection is properly configured for Google login!');
        } else {
            console.log('⚠️  Issues found:');
            issues.forEach(issue => console.log(`   - ${issue}`));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.status) {
            console.error(`   Status: ${error.status}`);
        }
        if (error.response?.data) {
            console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

checkCollection();

