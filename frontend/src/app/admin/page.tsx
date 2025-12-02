'use client';

import { useEffect, useState } from 'react';
import { getPocketBase } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, Calendar, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalOrganizers: 0,
        totalEvents: 0,
        totalRevenue: 0,
        pendingApplications: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            const pb = getPocketBase();

            try {
                // Fetch stats (simplified)
                const organizers = await pb.collection('organizers').getFullList();
                const events = await pb.collection('events').getFullList();
                const orders = await pb.collection('orders').getFullList({
                    filter: 'status="paid"',
                });
                const applications = await pb.collection('organizer_applications').getFullList({
                    filter: 'status="pending"',
                });

                const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount_minor, 0);

                setStats({
                    totalOrganizers: organizers.length,
                    totalEvents: events.length,
                    totalRevenue,
                    pendingApplications: applications.length,
                });
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
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
            <h1 className="text-3xl font-bold">Platform Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{(stats.totalRevenue / 100).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Gross Merchandise Value</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Organizers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrganizers}</div>
                        <p className="text-xs text-muted-foreground">{stats.pendingApplications} pending approval</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEvents}</div>
                        <p className="text-xs text-muted-foreground">Across all categories</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Real-time data unavailable</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
