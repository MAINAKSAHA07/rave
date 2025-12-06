'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getPocketBase } from '@/lib/pocketbase';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Loading from '@/components/Loading';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

export default function UsersManagementPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'customer',
    backoffice_access: false,
    can_manage_roles: false,
    // Organizer staff fields
    createOrganizerStaff: false,
    organizerId: '',
    organizerStaffRole: 'volunteer',
  });
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState('');

  // Edit user state
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (currentUser.role !== 'super_admin') {
      window.location.href = '/admin';
      return;
    }

    setUser(currentUser);
    loadUsers();
    loadOrganizers();
  }, []);

  async function loadOrganizers() {
    try {
      const pb = getPocketBase();
      const orgs = await pb.collection('organizers').getFullList({
        filter: 'status="approved"',
        sort: 'name',
      });
      console.log('Loaded organizers:', orgs.length);
      setOrganizers(orgs as any);
    } catch (error) {
      console.error('Failed to load organizers:', error);
      setOrganizers([]);
    }
  }

  async function loadUsers() {
    try {
      const response = await adminApi.getUsers();
      const fetchedUsers = response.data.items || response.data || [];
      // Hide customers from the user management table
      const nonCustomerUsers = fetchedUsers.filter((u: any) => u.role !== 'customer');
      setUsers(nonCustomerUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate organizer selection if checkbox is checked
    if (newUser.createOrganizerStaff && !newUser.organizerId) {
      setCreateMessage('Error: Please select an organizer when linking to organizer');
      return;
    }
    
    setCreateLoading(true);
    setCreateMessage('');

    try {
      // Create user first
      const response = await adminApi.createUser({
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: newUser.role,
        backoffice_access: newUser.backoffice_access,
        can_manage_roles: newUser.can_manage_roles,
      });

      const createdUser = response.data.user;

      // If organizer staff should be created, create that association
      if (newUser.createOrganizerStaff && newUser.organizerId) {
        try {
          const pb = getPocketBase();
          await pb.collection('organizer_staff').create({
            organizer_id: newUser.organizerId,
            user_id: createdUser.id,
            role: newUser.organizerStaffRole,
            status: 'active',
            invited_by: user.id,
          });
          setCreateMessage('User created successfully and linked to organizer');
        } catch (staffError: any) {
          console.error('Staff creation error:', staffError);
          setCreateMessage(`User created but failed to link to organizer: ${staffError.response?.data?.message || staffError.message}`);
        }
      } else {
        setCreateMessage('User created successfully');
      }

      // Reset form
      setNewUser({ 
        email: '', 
        password: '', 
        name: '', 
        role: 'customer',
        backoffice_access: false,
        can_manage_roles: false,
        createOrganizerStaff: false,
        organizerId: '',
        organizerStaffRole: 'volunteer',
      });
      setShowCreateForm(false);
      await loadUsers();
    } catch (error: any) {
      setCreateMessage(`Error: ${error.response?.data?.error || error.message || 'Failed to create user'}`);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdateRole(userId: string) {
    if (!editRole) {
      alert('Please select a role');
      return;
    }

    setEditLoading(true);
    try {
      await adminApi.updateUserRole(userId, editRole);
      setEditingUser(null);
      setEditRole('');
      await loadUsers();
      alert('Role updated successfully');
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message || 'Failed to update role'}`);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleBlock(userId: string, currentlyBlocked: boolean) {
    if (!confirm(`Are you sure you want to ${currentlyBlocked ? 'unblock' : 'block'} this user?`)) {
      return;
    }

    try {
      await adminApi.toggleUserBlock(userId, !currentlyBlocked);
      await loadUsers();
      alert(`User ${currentlyBlocked ? 'unblocked' : 'blocked'} successfully`);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message || 'Failed to update user'}`);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  const roleColors: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-800',
    admin: 'bg-purple-100 text-purple-800',
    customer: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">User Management</h1>
            <p className="text-gray-600 mt-2">Manage users and assign roles</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline">Back to Admin</Button>
            </Link>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? 'Cancel' : '+ Add User'}
            </Button>
          </div>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Create New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      required
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                      placeholder="Password"
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="backoffice_access"
                        checked={newUser.backoffice_access}
                        onChange={(e) => setNewUser({ ...newUser, backoffice_access: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="backoffice_access" className="cursor-pointer">
                        Backoffice Access
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500">Allow access to backoffice dashboard</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="can_manage_roles"
                        checked={newUser.can_manage_roles}
                        onChange={(e) => setNewUser({ ...newUser, can_manage_roles: e.target.checked })}
                        className="rounded"
                        disabled={!newUser.backoffice_access}
                      />
                      <Label htmlFor="can_manage_roles" className="cursor-pointer">
                        Can Manage Roles
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500">Allow modifying user roles across the site</p>
                  </div>
                  
                  {/* Organizer Staff Association */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="createOrganizerStaff"
                        checked={newUser.createOrganizerStaff}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNewUser({ 
                            ...newUser, 
                            createOrganizerStaff: checked,
                            // Reset organizer selection if unchecking
                            organizerId: checked ? newUser.organizerId : ''
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="createOrganizerStaff" className="cursor-pointer font-medium">
                        Link to Organizer
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500">Associate this user with an organizer account</p>
                    
                    {newUser.createOrganizerStaff && (
                      <div className="space-y-3 mt-3 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
                        <div className="space-y-2">
                          <Label htmlFor="organizer-select">Organizer *</Label>
                          {organizers.length === 0 ? (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                              No approved organizers found. Please approve an organizer first in the{' '}
                              <Link href="/admin/organizers" className="underline font-semibold">
                                Organizers Management
                              </Link>{' '}
                              page.
                            </div>
                          ) : (
                            <Select
                              value={newUser.organizerId}
                              onValueChange={(value) => {
                                setNewUser({ ...newUser, organizerId: value });
                              }}
                            >
                              <SelectTrigger id="organizer-select" className="w-full">
                                <SelectValue placeholder="Select an organizer" />
                              </SelectTrigger>
                              <SelectContent>
                                {organizers.map((org) => (
                                  <SelectItem key={org.id} value={org.id}>
                                    {org.name} ({org.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {organizers.length > 0 && !newUser.organizerId && (
                            <p className="text-xs text-red-600">Please select an organizer</p>
                          )}
                        </div>
                        {newUser.organizerId && (
                          <div className="space-y-2">
                            <Label htmlFor="staff-role-select">Organizer Staff Role *</Label>
                            <Select
                              value={newUser.organizerStaffRole}
                              onValueChange={(value) => {
                                setNewUser({ ...newUser, organizerStaffRole: value });
                              }}
                            >
                              <SelectTrigger id="staff-role-select" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner - Full control</SelectItem>
                                <SelectItem value="organizer">Organizer - Manage events & venues</SelectItem>
                                <SelectItem value="marketer">Marketer - Marketing & analytics</SelectItem>
                                <SelectItem value="volunteer">Volunteer - Check-in only</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">
                              {newUser.organizerStaffRole === 'owner' && 'Full control of organizer account'}
                              {newUser.organizerStaffRole === 'organizer' && 'Can manage events, venues, and ticket types'}
                              {newUser.organizerStaffRole === 'marketer' && 'Can view analytics and edit marketing content'}
                              {newUser.organizerStaffRole === 'volunteer' && 'Can only access check-in interface'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {createMessage && (
                  <div className={`p-3 rounded ${createMessage.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {createMessage}
                  </div>
                )}
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.length === 0 ? (
                <p className="text-gray-500">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Role & Access</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Backoffice Access Info</th>
                        <th className="text-left p-2">Created</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{u.name || '-'}</td>
                          <td className="p-2">{u.email}</td>
                          <td className="p-2">
                            {editingUser === u.id ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={editRole || u.role}
                                  onValueChange={setEditRole}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="customer">Customer</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateRole(u.id)}
                                  disabled={editLoading}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditRole('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[u.role] || 'bg-gray-100 text-gray-800'}`}>
                                  {u.role}
                                </span>
                                {u.backoffice_access && (
                                  <div className="text-xs text-blue-600">
                                    Backoffice ✓
                                    {u.backoffice_access_granted_at && (
                                      <div className="text-xs text-gray-500">
                                        Granted: {new Date(u.backoffice_access_granted_at).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {u.can_manage_roles && (
                                  <div className="text-xs text-purple-600">Can Manage Roles ✓</div>
                                )}
                                {u.backoffice_access_notes && (
                                  <div className="text-xs text-gray-500 italic" title={u.backoffice_access_notes}>
                                    Note: {u.backoffice_access_notes.length > 30 
                                      ? u.backoffice_access_notes.substring(0, 30) + '...' 
                                      : u.backoffice_access_notes}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            {u.blocked ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Blocked</span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="text-xs space-y-1">
                              {u.backoffice_access_granted_at && (
                                <div className="text-green-600">
                                  ✓ Granted: {new Date(u.backoffice_access_granted_at).toLocaleDateString()}
                                </div>
                              )}
                              {u.backoffice_access_revoked_at && (
                                <div className="text-red-600">
                                  ✗ Revoked: {new Date(u.backoffice_access_revoked_at).toLocaleDateString()}
                                </div>
                              )}
                              {!u.backoffice_access_granted_at && !u.backoffice_access_revoked_at && u.backoffice_access && (
                                <div className="text-gray-400">Access granted (no date recorded)</div>
                              )}
                              {!u.backoffice_access && (
                                <div className="text-gray-400">No backoffice access</div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-sm text-gray-600">
                            {new Date(u.created).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-2">
                              {editingUser !== u.id && (
                                <>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingUser(u.id);
                                        setEditRole(u.role);
                                      }}
                                    >
                                      Edit Role
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={u.blocked ? 'default' : 'destructive'}
                                      onClick={() => handleToggleBlock(u.id, u.blocked)}
                                    >
                                      {u.blocked ? 'Unblock' : 'Block'}
                                    </Button>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant={u.backoffice_access ? 'default' : 'outline'}
                                      onClick={async () => {
                                        const action = u.backoffice_access ? 'remove' : 'grant';
                                        const notes = prompt(`Enter notes for ${action}ing backoffice access (optional):`);
                                        try {
                                          await adminApi.updateBackofficeAccess(u.id, !u.backoffice_access, undefined, notes || undefined);
                                          await loadUsers();
                                        } catch (error: any) {
                                          alert(`Error: ${error.response?.data?.error || error.message}`);
                                        }
                                      }}
                                    >
                                      {u.backoffice_access ? 'Remove Backoffice' : 'Grant Backoffice'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={u.can_manage_roles ? 'default' : 'outline'}
                                      disabled={!u.backoffice_access}
                                      onClick={async () => {
                                        try {
                                          await adminApi.updateBackofficeAccess(u.id, u.backoffice_access, !u.can_manage_roles);
                                          await loadUsers();
                                        } catch (error: any) {
                                          alert(`Error: ${error.response?.data?.error || error.message}`);
                                        }
                                      }}
                                    >
                                      {u.can_manage_roles ? 'Remove Role Mgmt' : 'Grant Role Mgmt'}
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

