'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser, logout } from '@/lib/pocketbase';
import { useNotificationHelpers } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Loading from '@/components/Loading';
import BottomNavigation from '@/components/BottomNavigation';

export default function ProfilePage() {
  const router = useRouter();
  const { notifySuccess, notifyError } = useNotificationHelpers();
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

      notifySuccess('Profile Updated', 'Your profile has been updated successfully!');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      await loadProfile();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      notifyError(
        'Update Failed',
        error.response?.data?.message || error.message || 'Failed to update profile. Please try again.'
      );
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
    <div className="min-h-screen pb-20 bg-gray-50">
      <div className="max-w-[428px] mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-red-600 border-red-200 hover:bg-red-50 text-sm"
            >
              Sign Out
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Profile Header */}
          <div className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl p-6 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-teal-600">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{user?.name || 'User'}</h2>
            <p className="text-teal-100 text-sm">{user?.email}</p>
          </div>

          {/* Personal Information Card */}
          <Card className="bg-white rounded-2xl border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white border-2 border-gray-300 focus:border-teal-500 rounded-xl"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white border-2 border-gray-300 focus:border-teal-500 rounded-xl"
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-white border-2 border-gray-300 focus:border-teal-500 rounded-xl"
                  placeholder="Enter your phone number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="bg-white rounded-2xl border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Security</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Change your password</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-gray-700">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="bg-white border-2 border-gray-300 focus:border-teal-500 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-gray-700">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  className="bg-white border-2 border-gray-300 focus:border-teal-500 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="bg-white border-2 border-gray-300 focus:border-teal-500 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="pb-4">
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
