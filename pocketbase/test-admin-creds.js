
const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://127.0.0.1:8090');

async function testAuth() {
    try {
        console.log('Testing auth with default admin...');
        await pb.admins.authWithPassword('admin@example.com', '1234567890');
        console.log('✅ Success!');
    } catch (e) {
        console.error('❌ Failed:', e.message);
    }
}

testAuth();
