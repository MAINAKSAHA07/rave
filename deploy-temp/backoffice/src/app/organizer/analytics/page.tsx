'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrganizerAnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    setUser(currentUser);
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const user = getCurrentUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const pb = getPocketBase();
      let organizerId: string | null = null;

      // Super Admin or Admin: Show all stats
      if (user.role === 'super_admin' || user.role === 'admin') {
        // Load all events and orders for admin view
        const [events, orders] = await Promise.all([
          pb.collection('events').getFullList(),
          pb.collection('orders').getFullList({ filter: 'status="paid"' }),
        ]);

        const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total_amount_minor || 0), 0);
        const totalTickets = orders.reduce((sum: number, order: any) => sum + (order.ticket_count || 0), 0);

        setStats({
          totalEvents: events.length,
          publishedEvents: events.filter((e: any) => e.status === 'published').length,
          totalRevenue,
          totalTickets,
          totalOrders: orders.length,
        });
        setOrganizer({
          name: user.role === 'super_admin' ? 'Super Admin View' : 'Admin View',
        });
        setLoading(false);
        return;
      }

      // Try to find organizer staff association
      try {
        const staff = await pb.collection('organizer_staff').getFirstListItem(
          `user_id="${user.id}" && status="active"`
        );

        const organizerData = await pb.collection('organizers').getOne(staff.organizer_id);
        setOrganizer(organizerData);
        organizerId = organizerData.id;

        // Load events and orders for this organizer
        const [events, orders] = await Promise.all([
          pb.collection('events').getFullList({
            filter: `organizer_id="${organizerId}"`,
          }),
          pb.collection('orders').getFullList({
            filter: `event_id.organizer_id="${organizerId}" && status="paid"`,
            expand: 'event_id',
          }),
        ]);

        const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total_amount_minor || 0), 0);
        const totalTickets = orders.reduce((sum: number, order: any) => sum + (order.ticket_count || 0), 0);

        setStats({
          totalEvents: events.length,
          publishedEvents: events.filter((e: any) => e.status === 'published').length,
          totalRevenue,
          totalTickets,
          totalOrders: orders.length,
        });
      } catch (staffError: any) {
        console.error('No organizer staff association found:', staffError);
        setStats({
          totalEvents: 0,
          publishedEvents: 0,
          totalRevenue: 0,
          totalTickets: 0,
          totalOrders: 0,
        });
      }
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!organizer) {
    const currentUser = getCurrentUser();
    // Allow admin/super_admin to access even without organizer association
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin') {
      return (
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Loading analytics...
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You are not associated with an organizer account. Please contact an administrator.
            </p>
            <Link href="/organizer/dashboard">
              <Button variant="outline" className="w-full">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-2">View sales and revenue insights</p>
          </div>
          <Link href="/organizer/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalEvents || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.publishedEvents || 0} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₹{((stats?.totalRevenue || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground mt-1">From all orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalTickets || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Tickets sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalOrders || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Paid orders</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/50">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground font-medium">
                  Detailed analytics and charts coming soon
                </p>
                <p className="text-sm text-muted-foreground/80">
                  Future enhancements will include revenue trends, event performance, and more.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

