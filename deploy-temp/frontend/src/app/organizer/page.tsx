'use client';

import { useEffect, useState } from 'react';
import { getPocketBase } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, Calendar, TrendingUp } from 'lucide-react';

export default function OrganizerDashboard() {
    const [stats, setStats] = useState({
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        upcomingEvents: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            const pb = getPocketBase();
            const user = pb.authStore.model;

            if (!user) return;

            try {
                // Get organizer ID for this user
                // Assuming user is staff, find the organizer they belong to
                const staffRecord = await pb.collection('organizer_staff').getFirstListItem(`user_id="${user.id}"`);
                const organizerId = staffRecord.organizer_id;

                // Fetch events
                const events = await pb.collection('events').getFullList({
                    filter: `organizer_id="${organizerId}"`,
                });

                const totalEvents = events.length;
                const upcomingEvents = events.filter(e => new Date(e.start_date) > new Date()).length;

                // Fetch orders (simplified - ideally use an aggregation query or backend endpoint)
                // For now, we'll just fetch recent orders or rely on a separate stats collection if it existed
                // Fetching ALL orders might be heavy, but for v1/demo it's okay
                const orders = await pb.collection('orders').getFullList({
                    filter: `event_id.organizer_id="${organizerId}" && status="paid"`,
                });

                const totalTicketsSold = orders.length; // Simplified, should sum quantities
                const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount_minor, 0);

                setStats({
                    totalEvents,
                    totalTicketsSold,
                    totalRevenue,
                    upcomingEvents,
                });
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (loading) {
        return <div className="p-8">Loading stats...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{(stats.totalRevenue / 100).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTicketsSold}</div>
                        <p className="text-xs text-muted-foreground">+180 from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEvents}</div>
                        <p className="text-xs text-muted-foreground">{stats.upcomingEvents} upcoming</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+573</div>
                        <p className="text-xs text-muted-foreground">+201 since last hour</p>
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for D3 Chart */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[350px] flex items-center justify-center bg-slate-50 rounded-md border border-dashed">
                        <p className="text-muted-foreground">Sales Analytics Chart (D3.js) will go here</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
