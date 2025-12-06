'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser, logout } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';

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
      const userData = await pb.collection('customers').getOne(currentUser.id);

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
          await pb.collection('customers').update(user.id, {
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
      await pb.collection('customers').update(user.id, updateData);

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
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="w-full space-y-6">
        <div className="flex flex-col justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Profile
            </h1>
            <p className="text-gray-600 mt-1 text-sm">Manage your account settings</p>
          </div>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
          >
            Sign Out
          </Button>
        </div>

        <div className="grid gap-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
            <CardDescription className="text-gray-600">Update your contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription className="text-gray-600">Change your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-gray-700">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-gray-700">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="bg-white border-gray-300 focus:border-purple-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            size="default"
            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
