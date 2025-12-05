
const pbUrl = 'http://127.0.0.1:8092';

async function testEmptyAuth() {
    console.log('Testing request with Authorization: "" ...');

    const response = await fetch(`${pbUrl}/api/collections/events/records?page=1&perPage=10&filter=status%3D%22published%22`, {
        method: 'GET',
        headers: {
            'Authorization': ''
        }
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
}

testEmptyAuth();
