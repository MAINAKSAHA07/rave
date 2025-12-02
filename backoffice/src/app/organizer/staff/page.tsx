'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function OrganizerStaffPage() {
  const [user, setUser] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'volunteer',
    organizerId: '', // For admin/super_admin to select organizer
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        window.location.href = '/login';
        return;
      }

      setUser(currentUser);
      const pb = getPocketBase();

      // Super Admin or Admin: Allow access to view all staff
      if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
        // Load all staff across all organizers
        const allStaff = await pb.collection('organizer_staff').getFullList({
          expand: 'user_id,organizer_id,invited_by',
          sort: '-created',
        });
        setStaff(allStaff as any);

        // Load all users for invite dropdown
        const allUsers = await pb.collection('users').getFullList();
        setUsers(allUsers as any);

        // Load all organizers for selection
        const allOrganizers = await pb.collection('organizers').getFullList({
          filter: 'status="approved"',
          sort: 'name',
        });
        setOrganizers(allOrganizers as any);

        setOrganizer({
          name: currentUser.role === 'super_admin' ? 'Super Admin View' : 'Admin View',
          description: 'Viewing all staff across all organizers'
        });
        setLoading(false);
        return;
      }

      // Get organizer staff record
      const staffRecords = await pb.collection('organizer_staff').getFullList({
        filter: `user_id="${currentUser.id}" && status="active"`,
        expand: 'organizer_id',
      });

      if (staffRecords.length === 0) {
        setLoading(false);
        return;
      }

      const organizerId = staffRecords[0].organizer_id;
      setOrganizer(organizerId);

      // Get all staff for this organizer
      const allStaff = await pb.collection('organizer_staff').getFullList({
        filter: `organizer_id="${organizerId.id}"`,
        expand: 'user_id,invited_by',
        sort: '-created',
      });

      setStaff(allStaff as any);

      // Get all users for invite dropdown (only if user is owner/organizer)
      const userRole = staffRecords[0].role;
      if (userRole === 'owner' || userRole === 'organizer') {
        // Get users who are not already staff
        const existingUserIds = allStaff.map((s: any) => s.user_id);
        const allUsers = await pb.collection('users').getFullList({
          filter: existingUserIds.length > 0
            ? `id!~"${existingUserIds.join('" && id!~"')}"`
            : undefined,
        });
        setUsers(allUsers as any);
      }
    } catch (error) {
      console.error('Failed to load staff:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteStaff() {
    if (!inviteForm.email || !inviteForm.role) {
      alert('Please fill in all fields');
      return;
    }

    setInviteLoading(true);
    try {
      const pb = getPocketBase();

      // Determine which organizer to use
      let targetOrganizerId: string;

      if (user?.role === 'super_admin' || user?.role === 'admin') {
        // For admin/super_admin, use the selected organizer from the form
        if (!inviteForm.organizerId) {
          alert('Please select an organizer first.');
          setInviteLoading(false);
          return;
        }
        targetOrganizerId = inviteForm.organizerId;
      } else {
        // For regular organizer staff, use their organizer
        if (!organizer?.id) {
          alert('Organizer not found. Please contact an administrator.');
          setInviteLoading(false);
          return;
        }
        targetOrganizerId = organizer.id;
      }

      // Find user by email
      let userToInvite;
      try {
        userToInvite = await pb.collection('users').getFirstListItem(`email="${inviteForm.email}"`);
      } catch (error: any) {
        if (error.status === 404) {
          alert(`User with email "${inviteForm.email}" not found. Please make sure the user has an account first.`);
          setInviteLoading(false);
          return;
        }
        throw error;
      }

      // Check if user is already staff
      const existingStaff = await pb.collection('organizer_staff').getFullList({
        filter: `organizer_id="${targetOrganizerId}" && user_id="${userToInvite.id}"`,
      });

      if (existingStaff.length > 0) {
        const existingRecord = existingStaff[0];
        if (existingRecord.status === 'active') {
          alert('User is already an active staff member');
        } else {
          // Reactivate removed staff
          await pb.collection('organizer_staff').update(existingRecord.id, {
            status: 'active',
            role: inviteForm.role,
            invited_by: user.id,
          });
          alert('Staff member reactivated successfully!');
          setShowInviteDialog(false);
          setInviteForm({ email: '', role: 'volunteer', organizerId: '' });
          await loadData();
          return;
        }
        setInviteLoading(false);
        return;
      }

      // Create staff record
      await pb.collection('organizer_staff').create({
        organizer_id: targetOrganizerId,
        user_id: userToInvite.id,
        role: inviteForm.role,
        status: 'active',
        invited_by: user.id,
      });

      alert('Staff member added successfully!');
      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'volunteer', organizerId: '' });
      await loadData();
    } catch (error: any) {
      console.error('Failed to invite staff:', error);
      if (error.status === 404) {
        alert(`User with email "${inviteForm.email}" not found. Please make sure the user has an account first.`);
      } else {
        alert(`Error: ${error.response?.data?.message || error.message || 'Failed to invite staff'}`);
      }
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleUpdateRole(staffId: string, newRole: string) {
    if (!confirm(`Change staff role to ${newRole}?`)) {
      return;
    }

    try {
      const pb = getPocketBase();
      const staffRecord = await pb.collection('organizer_staff').getOne(staffId);

      // Prevent removing owner role
      if (staffRecord.role === 'owner' && newRole !== 'owner') {
        alert('Cannot change owner role');
        return;
      }

      await pb.collection('organizer_staff').update(staffId, {
        role: newRole,
      });

      alert('Role updated successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Failed to update role:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to update role'}`);
    }
  }

  async function handleRemoveStaff(staffId: string) {
    if (!confirm('Remove this staff member? They will lose access to the organizer dashboard.')) {
      return;
    }

    try {
      const pb = getPocketBase();
      const staffRecord = await pb.collection('organizer_staff').getOne(staffId);

      // Prevent removing owner
      if (staffRecord.role === 'owner') {
        alert('Cannot remove owner');
        return;
      }

      await pb.collection('organizer_staff').update(staffId, {
        status: 'removed',
      });

      alert('Staff member removed successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Failed to remove staff:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to remove staff'}`);
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!organizer) {
    const currentUser = getCurrentUser();
    // Allow admin/super_admin to access even without organizer association
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin') {
      // This shouldn't happen as we set a dummy organizer above, but just in case
      return (
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600">
                Loading staff...
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              You are not associated with an organizer. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStaffRecord = staff.find((s: any) => s.user_id === user.id);
  // Super admin and admin can always manage staff
  const canManageStaff = user?.role === 'super_admin' || user?.role === 'admin' ||
    currentStaffRecord?.role === 'owner' || currentStaffRecord?.role === 'organizer';

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800',
    organizer: 'bg-blue-100 text-blue-800',
    marketer: 'bg-green-100 text-green-800',
    volunteer: 'bg-gray-100 text-gray-800',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    removed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Staff Management</h1>
            <p className="text-gray-600 mt-2">
              {user?.role === 'super_admin' || user?.role === 'admin'
                ? 'Manage staff members across all organizers'
                : `Manage staff members for ${organizer.name}`}
            </p>
          </div>
          {canManageStaff && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>Invite Staff Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Staff Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {(user?.role === 'super_admin' || user?.role === 'admin') && organizers.length > 0 && (
                    <div>
                      <Label htmlFor="organizer">Organizer *</Label>
                      <Select
                        value={inviteForm.organizerId}
                        onValueChange={(value) => setInviteForm({ ...inviteForm, organizerId: value })}
                      >
                        <SelectTrigger id="organizer">
                          <SelectValue placeholder="Select an organizer" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizers.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the organizer to add staff to.
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email">User Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      User must already have an account. They will be added as staff.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="organizer">Organizer - Manage events & venues</SelectItem>
                        <SelectItem value="marketer">Marketer - Marketing & analytics</SelectItem>
                        <SelectItem value="volunteer">Volunteer - Check-in only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Owner role can only be assigned by admins.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleInviteStaff} disabled={inviteLoading}>
                      {inviteLoading ? 'Adding...' : 'Add Staff'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Staff Members ({staff.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="text-gray-500">No staff members yet.</p>
            ) : (
              <div className="space-y-4">
                {staff.map((member: any) => {
                  const memberUser = member.expand?.user_id || {};
                  const inviter = member.expand?.invited_by || {};

                  return (
                    <div
                      key={member.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{memberUser.name || memberUser.email || 'Unknown'}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[member.role] || 'bg-gray-100'}`}>
                            {member.role}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[member.status] || 'bg-gray-100'}`}>
                            {member.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Email: {memberUser.email || 'N/A'}</p>
                          {inviter.email && (
                            <p>Invited by: {inviter.name || inviter.email}</p>
                          )}
                          <p>Added: {new Date(member.created).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {canManageStaff && member.role !== 'owner' && (
                        <div className="flex gap-2">
                          {member.status === 'active' && (
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => handleUpdateRole(member.id, newRole)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="organizer">Organizer</SelectItem>
                                <SelectItem value="marketer">Marketer</SelectItem>
                                <SelectItem value="volunteer">Volunteer</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {member.status === 'active' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveStaff(member.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



