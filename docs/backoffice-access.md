# Backoffice Access Management

## Overview

The Rave platform includes a backoffice access control system that allows administrators to grant specific users access to the backoffice dashboard and the ability to manage user roles across the entire site.

## Database Fields

Two new fields have been added to the `users` collection:

1. **`backoffice_access`** (boolean, default: false)
   - Grants access to the backoffice dashboard
   - Required for accessing organizer, admin, and check-in interfaces
   - Can be granted independently of user role

2. **`can_manage_roles`** (boolean, default: false)
   - Allows users to modify roles for other users across the site
   - Requires `backoffice_access` to be true
   - Can only be granted to users who already have backoffice access

## Access Control Logic

### Backoffice Access
- Users with `backoffice_access = true` can access:
  - Organizer dashboard
  - Admin console (if role is admin/super_admin)
  - Check-in interface
- Users without backoffice access are redirected to login
- Admin and Super Admin roles automatically have backoffice access (checked via role)

### Role Management
- Users with `can_manage_roles = true` can:
  - Modify user roles (customer, admin, super_admin)
  - Grant/revoke backoffice access
  - Grant/revoke role management permissions
- This permission is independent of the user's own role
- Super admins always have this permission

## User Management Interface

### Location
- **URL**: `/admin/users` (Super Admin only)
- **Access**: Requires `super_admin` role

### Features
1. **Create Users**
   - Set email, password, name, role
   - Grant backoffice access
   - Grant role management permission (requires backoffice access)

2. **Manage Existing Users**
   - Edit user roles
   - Grant/revoke backoffice access
   - Grant/revoke role management permission
   - Block/unblock users

3. **View User Status**
   - See all users with their roles
   - View backoffice access status
   - View role management permission status

## API Endpoints

### Create User
```
POST /api/admin/users
Body: {
  email: string,
  password: string,
  name: string,
  role: 'customer' | 'admin' | 'super_admin',
  backoffice_access?: boolean,
  can_manage_roles?: boolean
}
```

### Update Backoffice Access
```
PATCH /api/admin/users/:userId/backoffice
Body: {
  backoffice_access: boolean,
  can_manage_roles?: boolean
}
```

### Update User Role
```
PATCH /api/admin/users/:userId/role
Body: {
  role: 'customer' | 'admin' | 'super_admin'
}
```

### Block/Unblock User
```
PATCH /api/admin/users/:userId/block
Body: {
  blocked: boolean
}
```

## Usage Examples

### Grant Backoffice Access to a Customer
1. Navigate to `/admin/users`
2. Find the user
3. Click "Grant Backoffice" button
4. User can now access backoffice dashboard

### Grant Role Management Permission
1. Ensure user has backoffice access first
2. Click "Grant Role Mgmt" button
3. User can now modify roles for other users

### Create a Backoffice User
1. Click "+ Add User"
2. Fill in user details
3. Check "Backoffice Access"
4. Optionally check "Can Manage Roles"
5. Click "Create User"

## Security Notes

- Only Super Admins can manage backoffice access
- Role management permission requires backoffice access
- Users cannot grant themselves role management
- Blocked users cannot access backoffice even with permissions
- All changes are logged and require authentication

## Migration

The fields were added to the database via:
```bash
node add-backoffice-field.js
node add-can-manage-roles-field.js
```

Both fields are now available in the `users` collection and can be managed through the admin interface.

