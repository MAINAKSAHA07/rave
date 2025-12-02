'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getPocketBase } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminRefundsPage() {
  const [user, setUser] = useState<any>(null);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      window.location.href = '/admin';
      return;
    }

    setUser(currentUser);
    loadRefunds();
  }, []);

  async function loadRefunds() {
    try {
      const pb = getPocketBase();
      let filter = '';
      if (filterStatus !== 'all') {
        filter = `status="${filterStatus}"`;
      }
      const refundsData = await pb.collection('refunds').getFullList({
        filter: filter || undefined,
        sort: '-created',
        expand: 'order_id,requested_by,approved_by',
      });
      setRefunds(refundsData as any);
    } catch (error) {
      console.error('Failed to load refunds:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadRefunds();
    }
  }, [filterStatus]);

  const filteredRefunds = refunds.filter((refund) => {
    const matchesSearch = 
      refund.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.expand?.order_id?.order_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-yellow-100 text-yellow-800',
    requested: 'bg-blue-100 text-blue-800',
    approved: 'bg-purple-100 text-purple-800',
    failed: 'bg-red-100 text-red-800',
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  async function handleApproveRefund(refundId: string) {
    if (!confirm('Approve this refund?')) {
      return;
    }

    try {
      const pb = getPocketBase();
      const refund = await pb.collection('refunds').getOne(refundId);
      const order = await pb.collection('orders').getOne(refund.order_id);

      // Use API endpoint to approve and process refund
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/refunds/${refundId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ approvedBy: user.id }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process refund');
      }

      await loadRefunds();
      alert('Refund approved and processed');
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to process refund'}`);
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Refunds Management</h1>
            <p className="text-gray-600 mt-2">View and manage all refund requests</p>
          </div>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Refunds</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredRefunds.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredRefunds.filter((r) => r.status === 'requested' || r.status === 'approved').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Refunded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  filteredRefunds
                    .filter((r) => r.status === 'completed')
                    .reduce((sum, r) => sum + (r.amount_minor || 0), 0)
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search by refund ID or order number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
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
            </div>
          </CardContent>
        </Card>

        {/* Refunds List */}
        <Card>
          <CardHeader>
            <CardTitle>All Refunds ({filteredRefunds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRefunds.length === 0 ? (
                <p className="text-gray-500">No refunds found.</p>
              ) : (
                filteredRefunds.map((refund) => (
                  <Card key={refund.id} className="bg-white">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">Refund #{refund.id.slice(0, 8)}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[refund.status] || 'bg-gray-100 text-gray-800'}`}>
                              {refund.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                            <div>
                              <span className="font-medium">Order:</span>{' '}
                              {refund.expand?.order_id?.order_number || refund.order_id || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Amount:</span>{' '}
                              {formatCurrency(refund.amount_minor, refund.currency)}
                            </div>
                            <div>
                              <span className="font-medium">Requested by:</span>{' '}
                              {refund.expand?.requested_by?.email || refund.requested_by || 'N/A'}
                            </div>
                            {refund.expand?.approved_by && (
                              <div>
                                <span className="font-medium">Approved by:</span>{' '}
                                {refund.expand.approved_by.email}
                              </div>
                            )}
                          </div>
                          {refund.reason && (
                            <p className="text-sm text-gray-700 mb-2">
                              <span className="font-medium">Reason:</span> {refund.reason}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Created: {new Date(refund.created).toLocaleString()}
                            {refund.processed_at && (
                              <> • Processed: {new Date(refund.processed_at).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                        <div className="ml-4">
                          {(refund.status === 'requested' || refund.status === 'approved') && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveRefund(refund.id)}
                            >
                              Process Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


      </div>
    </div>
  );
}

