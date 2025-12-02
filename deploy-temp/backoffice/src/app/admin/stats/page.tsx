'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/pocketbase';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminStatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      window.location.href = '/login';
      return;
    }

    loadStats();
  }, []);

  async function loadStats() {
    try {
      const response = await adminApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading stats...</div>;
  }

  if (!stats) {
    return <div className="p-8">Failed to load stats</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount / 100);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Platform Statistics</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.events.total}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.events.published} published, {stats.events.cancelled} cancelled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(stats.orders.totalRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.orders.total} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Net Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(stats.orders.netRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">
                After {formatCurrency(stats.orders.totalRefunds)} refunds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Active Organizers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.organizers.total}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.users.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total registered users</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

