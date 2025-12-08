'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Users, Calendar, Receipt, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Loading from '@/components/Loading';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationFilter, setApplicationFilter] = useState<string>('pending');

  // Super Admin State
  const [eventIdToCancel, setEventIdToCancel] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [orderIdToRefund, setOrderIdToRefund] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      window.location.href = '/';
      return;
    }

    setUser(currentUser);
    loadApplications();
  }, []);

  useEffect(() => {
    if (user) {
      loadApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationFilter]);

  async function loadApplications() {
    try {

      // Use backend API which handles admin auth properly
      const { adminApi } = await import('@/lib/api');

      // Load applications based on filter
      const response = await adminApi.getApplications(applicationFilter);

      // Normalized response from adminApi: { data: [...] } or { data: { items: [...] } }
      let apps: any[] = [];
      if (Array.isArray(response.data)) {
        apps = response.data;
      } else if (Array.isArray(response.data?.items)) {
        apps = response.data.items;
      }

      setApplications(apps);
    } catch (error: any) {
      console.error('Failed to load applications:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);

      // Show error to user
      if (error.response?.status === 403) {
        alert('Access denied. Please ensure you have admin privileges.');
      } else if (error.response?.status === 401) {
        // The interceptor should have handled this automatically
        // If we're here, the refresh failed and we're being redirected
        // Don't show alert or redirect again to prevent loops
      } else {
        // Don't show alert for network errors or autocancelled, just log
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        // Only show alert for unexpected errors
        if (error.message && !error.message.includes('Network Error') && !error.message.includes('autocancelled')) {
          alert(`Error loading applications: ${error.response?.data?.message || error.message}`);
        }
      }
    }
  }

  async function handleForceCancel() {
    if (!eventIdToCancel || !cancelReason) {
      alert('Please provide Event ID and Reason');
      return;
    }
    setActionLoading(true);
    setActionMessage('');
    try {
      const { adminApi } = await import('@/lib/api');
      const response = await adminApi.forceCancelEvent(eventIdToCancel, cancelReason);
      setActionMessage(`Event cancelled successfully. (Refunds must be processed manually)`);
      setEventIdToCancel('');
      setCancelReason('');
    } catch (error: any) {
      setActionMessage(`Error: ${error.message || 'Failed to cancel event'}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleForceRefund() {
    if (!orderIdToRefund || !refundReason) {
      alert('Please provide Order ID and Reason');
      return;
    }
    setActionLoading(true);
    setActionMessage('');
    try {
      const { adminApi } = await import('@/lib/api');
      await adminApi.forceRefundOrder(orderIdToRefund, refundReason);
      setActionMessage('Order refunded successfully');
      setOrderIdToRefund('');
      setRefundReason('');
    } catch (error: any) {
      setActionMessage(`Error: ${error.message || 'Failed to refund order'}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove(applicationId: string) {
    try {
      const { adminApi } = await import('@/lib/api');
      await adminApi.approveApplication(applicationId);
      await loadApplications();
      alert('Application approved successfully');
    } catch (error: any) {
      console.error('Approve error:', error);
      if (error.status === 403) {
        alert('Access denied. Please ensure you have admin privileges.');
      } else {
        alert(`Error: ${error.message || 'Failed to approve application'}`);
      }
    }
  }

  async function handleReject(applicationId: string) {
    const reviewNotes = prompt('Enter rejection reason (optional):');
    if (reviewNotes === null) {
      // User cancelled the prompt
      return;
    }

    try {
      const { adminApi } = await import('@/lib/api');
      await adminApi.rejectApplication(applicationId, reviewNotes || undefined);
      await loadApplications();
      alert('Application rejected');
    } catch (error: any) {
      console.error('Reject error:', error);
      if (error.status === 403) {
        alert('Access denied. Please ensure you have admin privileges.');
      } else {
        alert(`Error: ${error.message || 'Failed to reject application'}`);
      }
    }
  }

  if (!user) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Admin Console</h1>

        {/* Quick Actions (moved above organizer applications) */}
        <div className="mb-8">
          <Tabs defaultValue="management" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Quick Actions</h2>
              <TabsList className="bg-white border">
                <TabsTrigger value="management">Management</TabsTrigger>
                <TabsTrigger value="reports">Reports & Settings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="management">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/admin/events" className="block group">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                        <LayoutDashboard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Events</h3>
                        <p className="text-sm text-gray-500 mt-1">Manage events and listings</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/admin/orders" className="block group">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                        <Receipt className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Orders</h3>
                        <p className="text-sm text-gray-500 mt-1">View and manage orders</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/admin/organizers" className="block group">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-purple-50 rounded-full group-hover:bg-purple-100 transition-colors">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Organizers</h3>
                        <p className="text-sm text-gray-500 mt-1">Manage organizer accounts</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/admin/refunds" className="block group">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-orange-50 rounded-full group-hover:bg-orange-100 transition-colors">
                        <Calendar className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Refunds</h3>
                        <p className="text-sm text-gray-500 mt-1">Process refund requests</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {user.role === 'super_admin' && (
                  <Link href="/admin/users" className="block group">
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-red-500">
                      <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
                          <Users className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Users</h3>
                          <p className="text-sm text-gray-500 mt-1">Manage system users</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/admin/stats" className="block group">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-indigo-500">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                        <BarChart3 className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Statistics</h3>
                        <p className="text-sm text-gray-500 mt-1">View platform analytics</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Organizer Applications</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Select
                value={applicationFilter}
                onValueChange={(value) => {
                  setApplicationFilter(value);
                  loadApplications();
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {

                  loadApplications();
                }}
              >
                Refresh
              </Button>
              <span className="text-sm text-gray-500">
                {applications.length} application{applications.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No pending applications.</p>
                  <Button
                    variant="outline"
                    onClick={loadApplications}
                  >
                    Refresh List
                  </Button>
                </div>
              ) : (
                applications.map((app) => (
                  <Card key={app.id} className="bg-white">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{app.name}</h3>
                          <p className="text-sm text-gray-600">{app.email} • {app.phone}</p>
                          {app.gst_number && (
                            <p className="text-sm text-gray-500">GST: {app.gst_number}</p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${app.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : app.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : app.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {app.status || 'Unknown'}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-700">{app.event_description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Applied: {new Date(app.created).toLocaleDateString()}
                      </p>
                      {app.status === 'pending' && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(app.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(app.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {app.status === 'approved' && (
                        <div className="mt-4">
                          <p className="text-sm text-green-700">
                            ✓ This application was approved on {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : 'previously'}
                          </p>
                        </div>
                      )}
                      {app.status === 'rejected' && (
                        <div className="mt-4">
                          <p className="text-sm text-red-700">
                            ✗ This application was rejected on {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : 'previously'}
                          </p>
                          {app.review_notes && (
                            <p className="text-xs text-gray-600 mt-1">Notes: {app.review_notes}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Super Admin Section (moved to bottom) */}
        {user.role === 'super_admin' && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Super Admin Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Force Cancel Event */}
                <div className="space-y-4 p-4 bg-white rounded border">
                  <h3 className="font-semibold text-lg">Force Cancel Event</h3>
                  <div className="space-y-2">
                    <Label>Event ID</Label>
                    <Input
                      value={eventIdToCancel}
                      onChange={(e) => setEventIdToCancel(e.target.value)}
                      placeholder="RECORD_ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleForceCancel}
                    disabled={actionLoading}
                  >
                    Cancel Event & Refund All
                  </Button>
                </div>

                {/* Force Refund Order */}
                <div className="space-y-4 p-4 bg-white rounded border">
                  <h3 className="font-semibold text-lg">Force Refund Order</h3>
                  <div className="space-y-2">
                    <Label>Order ID</Label>
                    <Input
                      value={orderIdToRefund}
                      onChange={(e) => setOrderIdToRefund(e.target.value)}
                      placeholder="RECORD_ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Reason for refund"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleForceRefund}
                    disabled={actionLoading}
                  >
                    Refund Order
                  </Button>
                </div>
              </div>
              {actionMessage && (
                <div className="p-4 bg-white border rounded text-center font-medium">
                  {actionMessage}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
