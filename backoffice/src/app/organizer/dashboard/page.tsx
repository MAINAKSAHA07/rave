'use client';

import { useEffect, useState, useRef } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Loading from '@/components/Loading';

export default function OrganizerDashboard() {
  const [organizer, setOrganizer] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      const user = getCurrentUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const pb = getPocketBase();

      // Super Admin or Admin: Fetch all events
      if (user.role === 'super_admin' || user.role === 'admin') {
        const eventsData = await pb.collection('events').getFullList({
          sort: '-created',
          expand: 'organizer_id,venue_id',
        });
        setEvents(eventsData as any);
        setOrganizer({
          name: user.role === 'super_admin' ? 'Super Admin View' : 'Admin View',
          description: 'Viewing all events across all organizers'
        });
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Try to find organizer staff association
      try {
        const staff = await pb.collection('organizer_staff').getFirstListItem(
          `user_id="${user.id}" && status="active"`
        );

        const organizerData = await pb.collection('organizers').getOne(staff.organizer_id);
        setOrganizer(organizerData);

        const eventsData = await pb.collection('events').getFullList({
          filter: `organizer_id="${organizerData.id}"`,
          sort: '-created',
          expand: 'venue_id',
        });
        setEvents(eventsData as any);
      } catch (staffError: any) {
        if (staffError?.isAbort) return;

        if (user.backoffice_access || user.role === 'admin' || user.role === 'super_admin') {
          setOrganizer({
            name: 'No Organizer Association',
            description: 'You have backoffice access but are not linked to an organizer.'
          });
          setEvents([]);
        } else {
          setOrganizer(null);
          setEvents([]);
        }
      }
    } catch (error: any) {
      if (error?.isAbort) return;
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!organizer) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              You are not associated with an organizer account. Please contact an administrator.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">Back to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const publishedEvents = events.filter(e => e.status === 'published').length;
  const draftEvents = events.filter(e => e.status === 'draft').length;

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizer Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            {organizer.name} - {organizer.description}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Published Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{publishedEvents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Draft Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{draftEvents}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Events Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Events</CardTitle>
                <Link href="/organizer/events">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No events found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.slice(0, 5).map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {event.name}
                          {event.expand?.venue_id && (
                            <div className="text-xs text-muted-foreground">
                              📍 {event.expand.venue_id.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(event.start_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${event.status === 'published' ? 'bg-green-100 text-green-800' :
                            event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {event.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/organizer/events/${event.id}`}>
                            <Button size="sm" variant="ghost">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Link href="/organizer/events/new">
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">➕</span> Create New Event
                </Button>
              </Link>
              <Link href="/organizer/venues">
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">🏢</span> Manage Venues
                </Button>
              </Link>
              <Link href="/organizer/tickets">
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">🎟️</span> Manage Tickets
                </Button>
              </Link>
              <Link href="/organizer/analytics">
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">📊</span> View Analytics
                </Button>
              </Link>
              <Link href="/organizer/staff">
                <Button className="w-full justify-start" variant="outline">
                  <span className="mr-2">👥</span> Manage Staff
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

