'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser, logout } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();
      const userData = await pb.collection('users').getOne(currentUser.id);
      
      setUser(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const pb = getPocketBase();
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      // Update password if provided
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          alert('New passwords do not match');
          setSaving(false);
          return;
        }
        if (!formData.currentPassword) {
          alert('Please enter your current password to change it');
          setSaving(false);
          return;
        }
        
        // Update password via PocketBase auth
        try {
          await pb.collection('users').update(user.id, {
            password: formData.newPassword,
            passwordConfirm: formData.newPassword,
            oldPassword: formData.currentPassword,
          });
        } catch (error: any) {
          if (error.response?.data?.message?.includes('oldPassword')) {
            alert('Current password is incorrect');
            setSaving(false);
            return;
          }
          throw error;
        }
      }

      // Update profile
      await pb.collection('users').update(user.id, updateData);
      
      alert('Profile updated successfully!');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      await loadProfile();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to update profile'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    logout();
    router.push('/');
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8">Please log in to view your profile</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">My Profile</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <p className="text-sm text-gray-500">
              Leave password fields blank if you don't want to change your password.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

