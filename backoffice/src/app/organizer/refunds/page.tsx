'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { refundsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OrganizerRefundsPage() {
  const [user, setUser] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refundForm, setRefundForm] = useState({
    amount: '',
    reason: '',
  });
  const [requestLoading, setRequestLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [canRequestRefund, setCanRequestRefund] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user && organizer) {
      loadRefunds();
    }
  }, [filterStatus, user, organizer]);

  useEffect(() => {
    async function checkPermissions() {
      if (!user || !organizer) {
        setCanRequestRefund(false);
        return;
      }
      
      // Super admin and admin can always request refunds
      if (user.role === 'super_admin' || user.role === 'admin') {
        setCanRequestRefund(true);
        return;
      }
      
      // For organizer staff, check their role
      try {
        const pb = getPocketBase();
        const staffRecord = await pb.collection('organizer_staff').getFirstListItem(
          `user_id="${user.id}" && organizer_id="${organizer.id}"`
        );
        setCanRequestRefund(staffRecord?.role === 'owner' || staffRecord?.role === 'organizer');
      } catch (error) {
        setCanRequestRefund(false);
      }
    }
    checkPermissions();
  }, [user, organizer]);

  async function loadData() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        window.location.href = '/login';
        return;
      }

      setUser(currentUser);
      const pb = getPocketBase();

      // Super Admin or Admin: Allow access without organizer association
      if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
        // Load all orders and refunds for admin view
        const allOrders = await pb.collection('orders').getFullList({
          filter: 'status="paid"',
          expand: 'user_id,event_id',
          sort: '-created',
        });
        setOrders(allOrders as any);
        
        setOrganizer({ 
          name: currentUser.role === 'super_admin' ? 'Super Admin View' : 'Admin View',
          description: 'Viewing all refunds across all organizers',
          id: null, // Mark as admin view
        });
        setLoading(false);
        // loadRefunds will be called by the useEffect when user and organizer are set
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

      // Get orders for this organizer's events
      const events = await pb.collection('events').getFullList({
        filter: `organizer_id="${organizerId.id}"`,
      });

      const eventIds = events.map((e: any) => e.id);
      if (eventIds.length > 0) {
        const ordersData = await pb.collection('orders').getFullList({
          filter: `event_id~"${eventIds.join('" || event_id~"')}" && status="paid"`,
          expand: 'user_id,event_id',
          sort: '-created',
        });
        setOrders(ordersData as any);
      }

      await loadRefunds();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRefunds() {
    if (!user) return; // Don't load if user is not set yet
    
    try {
      // For admin/super_admin, load all refunds
      // For organizer staff, load only their organizer's refunds
      const organizerId = (user?.role === 'super_admin' || user?.role === 'admin') 
        ? undefined 
        : organizer?.id;
      
      const response = await refundsApi.getRefunds({ 
        organizerId, 
        status: filterStatus !== 'all' ? filterStatus : undefined 
      });
      // Backend returns array directly, not wrapped in data
      const refundsData = Array.isArray(response.data) ? response.data : [];
      setRefunds(refundsData);
    } catch (error) {
      console.error('Failed to load refunds:', error);
      setRefunds([]); // Set empty array on error to prevent UI issues
    }
  }

  function openRequestDialog(order: any) {
    const maxRefund = order.total_amount_minor - (order.refunded_amount_minor || 0);
    setSelectedOrder(order);
    setRefundForm({
      amount: (maxRefund / 100).toFixed(2),
      reason: '',
    });
    setShowRequestDialog(true);
  }

  async function handleRequestRefund() {
    if (!selectedOrder || !refundForm.amount || !refundForm.reason) {
      alert('Please fill in all fields');
      return;
    }

    const amountMinor = Math.round(parseFloat(refundForm.amount) * 100);
    const maxRefund = selectedOrder.total_amount_minor - (selectedOrder.refunded_amount_minor || 0);

    if (amountMinor > maxRefund) {
      alert(`Maximum refund amount is ₹${(maxRefund / 100).toFixed(2)}`);
      return;
    }

    if (amountMinor <= 0) {
      alert('Refund amount must be greater than 0');
      return;
    }

    setRequestLoading(true);
    try {
      await refundsApi.requestRefund(
        selectedOrder.id,
        amountMinor,
        refundForm.reason,
        user.id
      );

      alert('Refund request submitted successfully! It will be reviewed by an admin.');
      setShowRequestDialog(false);
      setSelectedOrder(null);
      setRefundForm({ amount: '', reason: '' });
      await loadRefunds();
      await loadData();
    } catch (error: any) {
      console.error('Failed to request refund:', error);
      alert(`Error: ${error.response?.data?.error || error.message || 'Failed to request refund'}`);
    } finally {
      setRequestLoading(false);
    }
  }

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-yellow-100 text-yellow-800',
    requested: 'bg-blue-100 text-blue-800',
    approved: 'bg-purple-100 text-purple-800',
    failed: 'bg-red-100 text-red-800',
  };

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
                Loading refunds...
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

  const filteredRefunds = refunds.filter((refund) => {
    if (filterStatus === 'all') return true;
    return refund.status === filterStatus;
  });

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Refund Requests</h1>
            <p className="text-gray-600 mt-2">Request refunds for orders from your events</p>
          </div>
        </div>

        {/* Orders Available for Refund */}
        {canRequestRefund && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Orders Available for Refund</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-gray-500">No paid orders found.</p>
              ) : (
                <div className="space-y-4">
                  {orders
                    .filter((order: any) => {
                      const maxRefund = order.total_amount_minor - (order.refunded_amount_minor || 0);
                      return maxRefund > 0;
                    })
                    .map((order: any) => {
                      const maxRefund = order.total_amount_minor - (order.refunded_amount_minor || 0);
                      const event = order.expand?.event_id || {};
                      const customer = order.expand?.user_id || {};

                      return (
                        <div
                          key={order.id}
                          className="border rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">Order #{order.order_number}</h3>
                              <span className="text-sm text-gray-600">
                                {event.name || 'Unknown Event'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Customer: {customer.name || customer.email || 'N/A'}</p>
                              <p>
                                Total: {formatCurrency(order.total_amount_minor, order.currency)} | 
                                Already Refunded: {formatCurrency(order.refunded_amount_minor || 0, order.currency)} | 
                                Available: {formatCurrency(maxRefund, order.currency)}
                              </p>
                              <p>Date: {new Date(order.created).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Button onClick={() => openRequestDialog(order)}>
                            Request Refund
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Refund Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Refund Requests ({filteredRefunds.length})</CardTitle>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRefunds.length === 0 ? (
              <p className="text-gray-500">No refund requests found.</p>
            ) : (
              <div className="space-y-4">
                {filteredRefunds.map((refund: any) => (
                  <div key={refund.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">Refund #{refund.id.slice(0, 8)}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[refund.status] || 'bg-gray-100'}`}>
                          {refund.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(refund.amount_minor, refund.currency)}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Order: {refund.order_id || 'N/A'}</p>
                      {refund.reason && <p>Reason: {refund.reason}</p>}
                      <p>Requested: {new Date(refund.created).toLocaleString()}</p>
                      {refund.processed_at && (
                        <p>Processed: {new Date(refund.processed_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Refund Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Refund</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 mt-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Order: {selectedOrder.order_number}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Total Amount: {formatCurrency(selectedOrder.total_amount_minor, selectedOrder.currency)}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Already Refunded: {formatCurrency(selectedOrder.refunded_amount_minor || 0, selectedOrder.currency)}
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    Maximum Refund: {formatCurrency(
                      selectedOrder.total_amount_minor - (selectedOrder.refunded_amount_minor || 0),
                      selectedOrder.currency
                    )}
                  </p>
                </div>
                <div>
                  <Label htmlFor="amount">Refund Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={(selectedOrder.total_amount_minor - (selectedOrder.refunded_amount_minor || 0)) / 100}
                    value={refundForm.amount}
                    onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please provide a reason for the refund..."
                    value={refundForm.reason}
                    onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowRequestDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleRequestRefund} disabled={requestLoading}>
                    {requestLoading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

