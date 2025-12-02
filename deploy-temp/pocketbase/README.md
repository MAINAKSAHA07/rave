# PocketBase Setup

This directory contains PocketBase schema definitions and migration scripts.

## Setup Instructions

1. **Download PocketBase**:
   - Visit https://pocketbase.io/docs/
   - Download the binary for your OS
   - Place it in this directory or add to PATH

2. **Initialize PocketBase**:
   ```bash
   ./pocketbase serve --http=127.0.0.1:8092
   ```
   This will create the `pb_data` directory on first run.

3. **Create Admin Account**:
   - Open http://127.0.0.1:8092/_/
   - Create your admin account

4. **Create Collections**:
   - Use the admin UI to create collections manually
   - Or use the PocketBase Admin SDK (see `migrations/001_initial_schema.js` for reference)
   - Follow the schema defined in `/docs/pocketbase-schema.md`

5. **Configure Access Rules**:
   - Set up access rules for each collection as documented
   - Test with different user roles

## Collections to Create

See `/docs/pocketbase-schema.md` for complete schema definitions.

Quick list:
- organizers
- organizer_staff
- organizer_applications
- venues
- seats
- events
- ticket_types
- orders
- tickets
- refunds
- payouts
- email_templates
- event_reminders

Note: The `users` collection is built-in to PocketBase. You'll need to extend it with custom fields (role, phone, etc.) via the admin UI.

## Environment Variables

Set these in your backend `.env`:
```
POCKETBASE_URL=http://127.0.0.1:8092
POCKETBASE_ADMIN_EMAIL=your_admin_email
POCKETBASE_ADMIN_PASSWORD=your_admin_password
```

