
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const PocketBase = require('pocketbase/cjs');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
    console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function createCustomerCollection() {
    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        console.log('Creating "customers" collection...');

        const data = {
            name: 'customers',
            type: 'auth',
            system: false,
            schema: [
                {
                    name: 'name',
                    type: 'text',
                    required: false,
                    presentable: false,
                    unique: false,
                    options: {
                        min: null,
                        max: null,
                        pattern: ""
                    }
                },
                {
                    name: 'avatar',
                    type: 'file',
                    required: false,
                    presentable: false,
                    unique: false,
                    options: {
                        maxSelect: 1,
                        maxSize: 5242880,
                        mimeTypes: [
                            "image/jpeg",
                            "image/png",
                            "image/svg+xml",
                            "image/gif",
                            "image/webp"
                        ],
                        thumbs: null,
                        protected: false
                    }
                },
                {
                    name: 'phone',
                    type: 'text',
                    required: false,
                    presentable: false,
                    unique: false,
                    options: {
                        min: null,
                        max: null,
                        pattern: ""
                    }
                }
            ],
            listRule: "id = @request.auth.id",
            viewRule: "id = @request.auth.id",
            createRule: "",
            updateRule: "id = @request.auth.id",
            deleteRule: "id = @request.auth.id",
            options: {
                allowEmailAuth: true,
                allowOAuth2Auth: true,
                allowUsernameAuth: false,
                exceptEmailDomains: null,
                manageRule: null,
                minPasswordLength: 8,
                onlyEmailDomains: null,
                onlyVerified: false,
                requireEmail: false
            }
        };

        try {
            const collection = await pb.collections.create(data);
            console.log('✅ Collection "customers" created successfully:', collection.id);
        } catch (e) {
            if (e.status === 400 && e.response?.data?.name?.message === "The collection name is invalid or already exists.") {
                console.log('ℹ️ Collection "customers" already exists.');
            } else {
                throw e;
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
        if (error.data) {
            console.error('Error data:', JSON.stringify(error.data, null, 2));
        }
    }
}

createCustomerCollection();
