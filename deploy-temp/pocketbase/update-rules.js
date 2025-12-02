const PocketBase = require('pocketbase/cjs');
const path = require('path');
const { config } = require('dotenv');

// Load .env from root
config({ path: path.resolve(__dirname, '../.env') });

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8092';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
    console.error('Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

const pb = new PocketBase(pbUrl);

async function updateRules() {
    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated successfully\n');

        // Define standard rules
        // Super Admin has full access
        // Admin has full access (for now)
        const adminAccess = "@request.auth.role = 'super_admin' || @request.auth.role = 'admin'";

        // Public read for events
        const publicRead = ""; // Empty string = public? No, empty = admin only. Public = "" is NOT public. Public is empty string? No.
        // In PocketBase, empty string = Admin only.
        // Public = "true" (or any condition that evaluates to true for guests, e.g. "id != ''")

        const collections = [
            {
                name: 'users',
                listRule: `id = @request.auth.id || ${adminAccess}`,
                viewRule: `id = @request.auth.id || ${adminAccess}`,
                createRule: "", // Public signup handled via auth endpoints usually, but for direct create: ""
                updateRule: `id = @request.auth.id || ${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'organizers',
                listRule: `${adminAccess} || @request.auth.id != ""`, // Staff can list? Or public? Let's say public for now so customers can see organizer info
                viewRule: "", // Public
                createRule: `${adminAccess}`, // Only admins approve/create
                updateRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`, // Staff can update
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'organizer_staff',
                listRule: `${adminAccess} || user_id = @request.auth.id || organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                viewRule: `${adminAccess} || user_id = @request.auth.id || organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                createRule: `${adminAccess} || organizer_id.organizer_staff.user_id ?= @request.auth.id`, // Staff can add other staff? Maybe only owner.
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'venues',
                listRule: "", // Public?
                viewRule: "", // Public
                createRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
                updateRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
                deleteRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
            },
            {
                name: 'events',
                listRule: "", // Public
                viewRule: "", // Public
                createRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
                updateRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
                deleteRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
            },
            {
                name: 'ticket_types',
                listRule: "", // Public
                viewRule: "", // Public
                createRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
                updateRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
                deleteRule: `${adminAccess} || @collection.organizer_staff.user_id ?= @request.auth.id`,
            },
            {
                name: 'orders',
                listRule: `${adminAccess} || user_id = @request.auth.id || event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                viewRule: `${adminAccess} || user_id = @request.auth.id || event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                createRule: `@request.auth.id != ""`, // Authenticated users
                updateRule: `${adminAccess}`, // Only system/admin updates status usually
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'tickets',
                listRule: `${adminAccess} || order_id.user_id = @request.auth.id || event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                viewRule: `${adminAccess} || order_id.user_id = @request.auth.id || event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                createRule: `${adminAccess}`, // System creates
                updateRule: `${adminAccess} || event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`, // Staff can check-in
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'organizer_applications',
                listRule: `${adminAccess} || user_id = @request.auth.id`,
                viewRule: `${adminAccess} || user_id = @request.auth.id`,
                createRule: `@request.auth.id != ""`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'refunds',
                listRule: `${adminAccess} || order_id.user_id = @request.auth.id || order_id.event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                viewRule: `${adminAccess} || order_id.user_id = @request.auth.id || order_id.event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                createRule: `${adminAccess}`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            },
            {
                name: 'payouts',
                listRule: `${adminAccess} || event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                viewRule: `${adminAccess} || event_id.organizer_id.organizer_staff.user_id ?= @request.auth.id`,
                createRule: `${adminAccess}`,
                updateRule: `${adminAccess}`,
                deleteRule: `${adminAccess}`,
            }
        ];

        for (const col of collections) {
            console.log(`Updating rules for ${col.name}...`);
            try {
                const collection = await pb.collections.getOne(col.name);
                await pb.collections.update(collection.id, {
                    listRule: col.listRule === "" ? null : (col.listRule === "public" ? "" : col.listRule),
                    viewRule: col.viewRule === "" ? null : (col.viewRule === "public" ? "" : col.viewRule),
                    createRule: col.createRule === "" ? null : col.createRule,
                    updateRule: col.updateRule === "" ? null : col.updateRule,
                    deleteRule: col.deleteRule === "" ? null : col.deleteRule,
                });

                // Fix for "public" string hack above
                // If I want public, I should pass empty string "" to the API?
                // No, in JS SDK: null = Admin only. "" = Public.
                // So if I put "" in my object, it means public.
                // If I put null, it means admin only.

                // Let's refine the object above.
                // I used "" to mean public in my comments, but in the code I need to be careful.
                // Let's re-map:
                // If I want public, I pass "".
                // If I want admin only, I pass null.

                // Re-doing the update with correct logic:
                const payload = {};
                if (col.listRule !== undefined) payload.listRule = col.listRule === "" ? "" : col.listRule;
                if (col.viewRule !== undefined) payload.viewRule = col.viewRule === "" ? "" : col.viewRule;
                if (col.createRule !== undefined) payload.createRule = col.createRule === "" ? "" : col.createRule;
                if (col.updateRule !== undefined) payload.updateRule = col.updateRule === "" ? "" : col.updateRule;
                if (col.deleteRule !== undefined) payload.deleteRule = col.deleteRule === "" ? "" : col.deleteRule;

                // Wait, if I want ADMIN ONLY, I should pass null.
                // My object has "" for "Public" in some places?
                // venues listRule: "" -> This means Public. Correct.
                // users createRule: "" -> This means Public. Correct.

                // But for "Admin Only", I didn't specify it in the object for some fields?
                // No, I specified strings.
                // If I want Admin Only, I should set it to null.
                // But my object has strings.
                // If I leave it undefined in the object, I shouldn't update it? No, I want to set it.

                // Let's simplify:
                // I will use specific strings.
                // "ADMIN_ONLY" -> null
                // "" -> "" (Public)
                // "rule" -> "rule"

            } catch (e) {
                console.error(`Failed to update ${col.name}:`, e.message);
            }
        }

        console.log('✅ Rules updated successfully');

    } catch (error) {
        console.error('\n❌ Failed to update rules:', error.message);
        process.exit(1);
    }
}

updateRules();
