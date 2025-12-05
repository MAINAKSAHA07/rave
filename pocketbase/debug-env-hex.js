
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

function printHex(label, str) {
    if (!str) {
        console.log(`${label}: <MISSING>`);
        return;
    }
    console.log(`${label}: "${str}"`);
    console.log(`Length: ${str.length}`);
    let hex = '';
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
    }
    console.log(`Hex: ${hex}`);
}

printHex('GOOGLE_OAUTH_CLIENT_ID', envConfig.GOOGLE_OAUTH_CLIENT_ID);
printHex('GOOGLE_OAUTH_CLIENT_SECRET', envConfig.GOOGLE_OAUTH_CLIENT_SECRET);
