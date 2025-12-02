'use client';

import { useEffect, useState, useRef } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OrganizerEventsPage() {
  const [user, setUser] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const loadingRef = useRef(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    setUser(currentUser);
    loadEvents();
  }, []);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function loadEvents() {
    // Prevent duplicate requests
    if (loadingRef.current) {
      return;
    }

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
        const queryOptions: any = {
          sort: '-created',
          expand: 'organizer_id,venue_id',
        };

        if (statusFilter !== 'all') {
          queryOptions.filter = `status="${statusFilter}"`;
        }

        const eventsData = await pb.collection('events').getFullList(queryOptions);
        setEvents(eventsData as any);
        setOrganizer({ 
          name: user.role === 'super_admin' ? 'Super Admin View' : 'Admin View',
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

        const queryOptions: any = {
          filter: `organizer_id="${organizerData.id}"`,
          sort: '-created',
          expand: 'venue_id',
        };

        if (statusFilter !== 'all') {
          queryOptions.filter += ` && status="${statusFilter}"`;
        }

        const eventsData = await pb.collection('events').getFullList(queryOptions);
        setEvents(eventsData as any);
      } catch (staffError: any) {
        // Check if error is due to abort
        if (staffError?.isAbort) {
          return; // Request was cancelled, don't update state
        }
        
        console.error('No organizer staff association found:', staffError);
        setEvents([]);
      }
    } catch (error: any) {
      // Check if error is due to abort
      if (error?.isAbort) {
        return; // Request was cancelled, don't update state
      }
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
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
                Loading events...
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="p-8">
        <p className="text-red-600">You are not associated with an organizer account.</p>
        <Link href="/organizer/dashboard">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Events</h1>
            <p className="text-gray-600 mt-2">Manage your events</p>
          </div>
          <div className="flex gap-2">
            <Link href="/organizer/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            <Link href="/organizer/events/new">
              <Button>Create New Event</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Filter by Status:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadEvents}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>All Events ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No events found.</p>
                <Link href="/organizer/events/new">
                  <Button>Create Your First Event</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/organizer/events/${event.id}`}
                    className="block"
                  >
                    <Card className="hover:bg-gray-50 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold">{event.name}</h3>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[event.status] || 'bg-gray-100 text-gray-800'}`}>
                                {event.status}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>
                                📅 {new Date(event.start_date).toLocaleDateString()}
                                {event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
                              </span>
                              {event.expand?.venue_id && (
                                <span>📍 {event.expand.venue_id.name}</span>
                              )}
                              {event.city && (
                                <span>🏙️ {event.city}</span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

