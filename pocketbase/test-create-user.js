
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const pb = new PocketBase(pbUrl);

async function testCreateUser() {
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123456';

    console.log(`Attempting to create user with email: ${email}`);

    try {
        const data = {
            email,
            password,
            passwordConfirm: password,
            name: 'Test User',
            phone: '1234567890',
            emailVisibility: true,
        };

        const record = await pb.collection('users').create(data);
        console.log('✅ User created successfully:', record.id);

        console.log('Attempting login...');
        const authData = await pb.collection('users').authWithPassword(email, password);
        console.log('✅ Login successful. Token:', authData.token.substring(0, 20) + '...');

        // Cleanup
        console.log('Cleaning up...');
        await pb.collection('users').delete(record.id);
        console.log('✅ User deleted.');

    } catch (error) {
        console.error('❌ Error:', error);
        if (error.data) {
            console.error('Error data:', JSON.stringify(error.data, null, 2));
        }
    }
}

testCreateUser();
