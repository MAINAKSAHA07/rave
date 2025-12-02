# Backoffice Access Metadata Fields

## Overview

Additional fields have been added to the `users` collection to track backoffice access history and metadata.

## Database Fields

The following fields track backoffice access information:

### Successfully Added Fields

1. **`backoffice_access_granted_at`** (date, optional)
   - Timestamp when backoffice access was granted
   - Automatically set when access is granted via the admin interface

2. **`backoffice_access_revoked_at`** (date, optional)
   - Timestamp when backoffice access was revoked
   - Automatically set when access is removed

3. **`backoffice_access_notes`** (text, optional)
   - Free-form notes about backoffice access
   - Can be added when granting or revoking access
   - Useful for audit trails and documentation

### Manual Addition Required

The following relation fields need to be added manually via PocketBase Admin UI:

1. **`backoffice_access_granted_by`** (relation to users, optional)
   - Reference to the user who granted backoffice access
   - Collection: `users` (or `_pb_users_auth_`)
   - Max select: 1
   - Cascade delete: false

2. **`backoffice_access_revoked_by`** (relation to users, optional)
   - Reference to the user who revoked backoffice access
   - Collection: `users` (or `_pb_users_auth_`)
   - Max select: 1
   - Cascade delete: false

## How to Add Relation Fields Manually

1. Open PocketBase Admin UI: `http://127.0.0.1:8092/_/`
2. Navigate to Collections → `users`
3. Click "Add new field"
4. For each relation field:
   - Name: `backoffice_access_granted_by` or `backoffice_access_revoked_by`
   - Type: Relation
   - Collection: `users` (or select the users collection ID)
   - Max select: 1
   - Cascade delete: false
   - Required: No
5. Save the field

## Usage

### Automatic Tracking

When backoffice access is granted or revoked via the admin interface:
- `backoffice_access_granted_at` is automatically set when access is granted
- `backoffice_access_revoked_at` is automatically set when access is revoked
- `backoffice_access_granted_by` and `backoffice_access_revoked_by` are set to the current super admin's ID (once relation fields are added)

### Manual Notes

When granting or revoking access, you can add notes:
- These are stored in `backoffice_access_notes`
- Useful for documenting reasons, approvals, or special conditions

## Display in UI

The user management page (`/admin/users`) displays:
- When access was granted (if available)
- When access was revoked (if available)
- Access notes (if available)
- All in a dedicated "Backoffice Access Info" column

## API Updates

The backend API automatically:
- Sets timestamps when access changes
- Records who made the change (once relation fields are added)
- Stores notes if provided

## Benefits

1. **Audit Trail**: Track when and by whom access was granted/revoked
2. **Compliance**: Maintain records for security and compliance
3. **Troubleshooting**: Notes help understand access decisions
4. **History**: See access patterns and changes over time

