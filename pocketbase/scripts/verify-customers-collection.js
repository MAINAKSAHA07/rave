#!/usr/bin/env node

/**
 * Script to verify customers collection is properly configured for Google login
 * Checks schema, fields, and permissions
 */

// Try to load dotenv if available
try {
    require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
} catch (e) {
    // dotenv not available, will use process.env directly
}

const PocketBase = require('pocketbase/cjs');

// Get PocketBase URL - ensure port 8092 is always used
function getPocketBaseUrl() {
    // Priority: AWS URL > POCKETBASE_URL > default
    let url = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://13.201.90.240:8092';
    
    // Clean up
    url = url.trim().replace(/\/$/, '');
    
    // Force port to 8092
    try {
        const urlObj = new URL(url);
        urlObj.port = '8092';
        url = urlObj.toString().replace(/\/$/, ''); // Remove trailing slash
    } catch (e) {
        // If URL parsing fails, manually ensure port 8092
        if (url.match(/:\d+/)) {
            url = url.replace(/:\d+/, ':8092');
        } else if (!url.includes(':8092')) {
            url = url + ':8092';
        }
    }
    
    return url;
}

async function verifyCustomersCollection() {
    const pbUrl = getPocketBaseUrl();
    // Try AWS credentials first, then fallback to regular credentials
    const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

    console.log('🔍 Verifying customers collection configuration...\n');
    console.log(`📍 PocketBase URL: ${pbUrl}`);
    console.log(`📧 Admin Email: ${adminEmail || 'NOT SET'}`);
    console.log(`🔑 Admin Password: ${adminPassword ? '***SET***' : 'NOT SET'}\n`);

    // Check if PocketBase is running - use fetch like test-aws-connection.js
    try {
        const response = await fetch(`${pbUrl}/api/health`);
        if (response.ok) {
            console.log('✅ PocketBase server is reachable\n');
        } else {
            console.error('❌ Cannot connect to PocketBase');
            console.error(`   Health check returned status: ${response.status}`);
            console.error(`   URL: ${pbUrl}`);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Cannot connect to PocketBase');
        console.error(`   Error: ${error.message}`);
        console.error(`   URL: ${pbUrl}`);
        console.error('\n   Troubleshooting:');
        console.error('   1. Check if PocketBase is running: ssh -i ravem.pem ec2-user@13.201.90.240 "sudo docker ps | grep rave-pb"');
        console.error('   2. Check if port 8092 is open in AWS Security Group');
        console.error('   3. Verify the server IP is correct');
        process.exit(1);
    }

    if (!adminEmail || !adminPassword) {
        console.error('❌ Admin credentials not configured');
        console.error('   Set AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD');
        console.error('   Or set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD');
        console.error('\n   Current values:');
        console.error(`   - AWS_POCKETBASE_ADMIN_EMAIL: ${adminEmail ? 'SET' : 'NOT SET'}`);
        console.error(`   - AWS_POCKETBASE_ADMIN_PASSWORD: ${adminPassword ? 'SET' : 'NOT SET'}`);
        console.error(`   - POCKETBASE_ADMIN_EMAIL: ${process.env.POCKETBASE_ADMIN_EMAIL ? 'SET' : 'NOT SET'}`);
        console.error(`   - POCKETBASE_ADMIN_PASSWORD: ${process.env.POCKETBASE_ADMIN_PASSWORD ? 'SET' : 'NOT SET'}`);
        process.exit(1);
    }

    try {
        // Create PocketBase instance - match exactly how working scripts do it
        const pb = new PocketBase(pbUrl);
        
        console.log('🔐 Attempting to authenticate...');
        try {
            await pb.admins.authWithPassword(adminEmail, adminPassword);
            console.log('✅ Authenticated with PocketBase\n');
        } catch (authError) {
            console.error('❌ Authentication failed');
            console.error(`   Error: ${authError.message}`);
            if (authError.status) {
                console.error(`   Status: ${authError.status}`);
            }
            if (authError.response) {
                console.error(`   Response: ${JSON.stringify(authError.response, null, 2)}`);
            }
            console.error('\n💡 Check:');
            console.error('   1. Admin email and password are correct');
            console.error('   2. Admin account exists in PocketBase');
            console.error('   3. Credentials match AWS PocketBase admin account');
            console.error(`   4. Verify URL is correct: ${pbUrl}`);
            console.error(`   5. Try accessing admin UI: ${pbUrl}/_/`);
            if (authError.status === 404) {
                console.error('\n⚠️  404 error usually means:');
                console.error('   - The URL endpoint is incorrect');
                console.error('   - PocketBase API is not accessible at this URL');
                console.error('   - Check if PocketBase is running: ssh -i ravem.pem ec2-user@13.201.90.240 "sudo docker ps"');
            }
            throw authError;
        }

        // Get customers collection
        let customersCollection;
        try {
            customersCollection = await pb.collections.getOne('customers');
        } catch (error) {
            console.error('❌ Customers collection not found!');
            console.error('   Run: node pocketbase/create-customer-collection.js');
            process.exit(1);
        }

        console.log('📋 Collection Details:');
        console.log(`   Name: ${customersCollection.name}`);
        console.log(`   Type: ${customersCollection.type}`);
        console.log(`   ID: ${customersCollection.id}\n`);

        // Check required fields for Google login
        console.log('🔍 Checking Schema Fields:');
        const schema = customersCollection.schema || [];
        const requiredFields = {
            'email': false, // Built-in auth field
            'name': false,
            'phone': false,
            'avatar': false,
        };

        schema.forEach((field) => {
            if (requiredFields.hasOwnProperty(field.name)) {
                requiredFields[field.name] = true;
                console.log(`   ✅ ${field.name} (${field.type}) - ${field.required ? 'required' : 'optional'}`);
            }
        });

        // Email is always present in auth collections
        console.log(`   ✅ email (built-in auth field)`);

        // Check for missing fields
        const missingFields = Object.entries(requiredFields)
            .filter(([name, exists]) => name !== 'email' && !exists)
            .map(([name]) => name);

        if (missingFields.length > 0) {
            console.log(`\n⚠️  Missing fields: ${missingFields.join(', ')}`);
            console.log('   These fields are recommended for Google login');
        }

        // Check collection options
        console.log('\n🔐 Checking Auth Options:');
        const options = customersCollection.options || {};
        console.log(`   allowEmailAuth: ${options.allowEmailAuth ? '✅' : '❌'}`);
        console.log(`   allowOAuth2Auth: ${options.allowOAuth2Auth ? '✅' : '❌'}`);
        console.log(`   allowUsernameAuth: ${options.allowUsernameAuth ? '✅' : '❌'}`);
        console.log(`   minPasswordLength: ${options.minPasswordLength || 'not set'}`);
        console.log(`   requireEmail: ${options.requireEmail ? '✅' : '❌'}`);
        console.log(`   onlyVerified: ${options.onlyVerified ? '⚠️  (may block Google login)' : '✅'}`);

        // Check rules
        console.log('\n📜 Checking Collection Rules:');
        console.log(`   createRule: ${customersCollection.createRule || '(empty - allows public creation)'}`);
        console.log(`   updateRule: ${customersCollection.updateRule || '(empty)'}`);
        console.log(`   listRule: ${customersCollection.listRule || '(empty)'}`);
        console.log(`   viewRule: ${customersCollection.viewRule || '(empty)'}`);

        // Summary
        console.log('\n📊 Summary:');
        const issues = [];
        
        if (!options.allowEmailAuth) {
            issues.push('Email auth is disabled');
        }
        if (options.onlyVerified) {
            issues.push('Email verification required (may block Google login)');
        }
        if (customersCollection.createRule && customersCollection.createRule !== '') {
            issues.push('createRule is set (may block Google login creation)');
        }

        if (issues.length === 0) {
            console.log('   ✅ Collection is properly configured for Google login!');
        } else {
            console.log('   ⚠️  Potential issues:');
            issues.forEach(issue => console.log(`      - ${issue}`));
        }

        // Test data structure
        console.log('\n🧪 Expected Data Structure for Google Login:');
        console.log('   {');
        console.log('     email: "user@gmail.com",');
        console.log('     password: "google_<random>",');
        console.log('     passwordConfirm: "google_<random>",');
        console.log('     name: "User Name",');
        console.log('     phone: "" (optional)');
        console.log('   }');

        console.log('\n✅ Verification complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.status) {
            console.error(`   Status Code: ${error.status}`);
        }
        if (error.response) {
            console.error('   Response:', JSON.stringify(error.response.data || error.response, null, 2));
        }
        if (error.message.includes("wasn't found") || error.status === 404) {
            console.error('\n💡 Troubleshooting:');
            console.error('   1. Check if PocketBase is running on AWS');
            console.error('   2. Verify the URL is correct:', pbUrl);
            console.error('   3. Check if the port is correct (8092)');
            console.error('   4. Try: ssh -i ravem.pem ec2-user@13.201.90.240 "sudo docker ps"');
        }
        process.exit(1);
    }
}

verifyCustomersCollection();

