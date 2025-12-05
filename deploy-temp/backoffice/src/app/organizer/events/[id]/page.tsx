'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { getPocketBaseFileUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();
      const eventData = await pb.collection('events').getOne(eventId, {
        expand: 'organizer_id,venue_id',
      });
      setEvent(eventData);

      // Load ticket types
      try {
        const types = await pb.collection('ticket_types').getFullList({
          filter: `event_id="${eventId}"`,
          sort: 'created',
        });
        setTicketTypes(types as any);
      } catch (error) {
        console.error('Failed to load ticket types:', error);
      }
    } catch (error: any) {
      console.error('Failed to load event:', error);
      alert('Event not found or access denied');
      router.push('/organizer/events');
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  async function handlePublish() {
    if (ticketTypes.length === 0) {
      alert('Please create at least one ticket type before publishing the event.');
      return;
    }

    if (!confirm('Are you sure you want to publish this event? It will be visible to customers on the frontend.')) {
      return;
    }

    setPublishing(true);
    try {
      const pb = getPocketBase();
      await pb.collection('events').update(eventId, {
        status: 'published',
      });

      // Reload event data
      await loadEvent();
      alert('Event published successfully! It is now live on the customer-facing website.');
    } catch (error: any) {
      console.error('Failed to publish event:', error);
      alert(`Error: ${error.message || 'Failed to publish event'}`);
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!confirm('Are you sure you want to unpublish this event? It will no longer be visible to customers.')) {
      return;
    }

    setPublishing(true);
    try {
      const pb = getPocketBase();
      await pb.collection('events').update(eventId, {
        status: 'draft',
      });

      // Reload event data
      await loadEvent();
      alert('Event unpublished successfully.');
    } catch (error: any) {
      console.error('Failed to unpublish event:', error);
      alert(`Error: ${error.message || 'Failed to unpublish event'}`);
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!event) {
    return (
      <div className="p-8">
        <p className="text-red-600">Event not found.</p>
        <Link href="/organizer/events">
          <Button variant="outline" className="mt-4">Back to Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[event.status] || 'bg-gray-100 text-gray-800'}`}>
                {event.status}
              </span>
            </div>
            <p className="text-muted-foreground">Event Details & Management</p>
          </div>
          <div className="flex gap-2">
            <Link href="/organizer/events">
              <Button variant="outline">Back to Events</Button>
            </Link>
            {event.status === 'draft' && (
              <Button
                onClick={handlePublish}
                disabled={publishing || ticketTypes.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishing ? 'Publishing...' : 'Publish Event'}
              </Button>
            )}
            {event.status === 'published' && (
              <Button
                onClick={handleUnpublish}
                disabled={publishing}
                variant="outline"
              >
                {publishing ? 'Unpublishing...' : 'Unpublish Event'}
              </Button>
            )}
          </div>
        </div>

        {/* Publishing Checklist */}
        {event.status === 'draft' && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800 text-lg">Ready to Publish?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 ${event.name ? 'text-green-700' : 'text-gray-500'}`}>
                  <span>{event.name ? '✓' : '○'}</span>
                  <span>Event name is set</span>
                </div>
                <div className={`flex items-center gap-2 ${event.venue_id ? 'text-green-700' : 'text-gray-500'}`}>
                  <span>{event.venue_id ? '✓' : '○'}</span>
                  <span>Venue is selected</span>
                </div>
                <div className={`flex items-center gap-2 ${event.start_date && event.end_date ? 'text-green-700' : 'text-gray-500'}`}>
                  <span>{event.start_date && event.end_date ? '✓' : '○'}</span>
                  <span>Event dates are set</span>
                </div>
                <div className={`flex items-center gap-2 ${ticketTypes.length > 0 ? 'text-green-700' : 'text-red-600 font-semibold'}`}>
                  <span>{ticketTypes.length > 0 ? '✓' : '○'}</span>
                  <span>At least one ticket type is created ({ticketTypes.length})</span>
                </div>
                {ticketTypes.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    ⚠️ You must create at least one ticket type before publishing.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickets">Ticket Types</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Category</span>
                      <p className="capitalize">{event.category}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">City</span>
                      <p>{event.city}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Start Date</span>
                      <p>{new Date(event.start_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">End Date</span>
                      <p>{new Date(event.end_date).toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Venue</span>
                      <p>{event.expand?.venue_id?.name || 'TBD'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Description</span>
                      <p className="text-sm mt-1">{event.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {event.cover_image && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cover Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={getPocketBaseFileUrl(event, event.cover_image)}
                      alt={event.name}
                      className="w-full rounded-lg object-cover aspect-video"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ticket Types ({ticketTypes.length})</CardTitle>
                  <Link href={`/organizer/events/${eventId}/ticket-types/new`}>
                    <Button size="sm">Add Ticket Type</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No ticket types created yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ticketTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">
                            {type.name}
                            {type.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {type.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>₹{(type.final_price_minor / 100).toFixed(2)}</TableCell>
                          <TableCell>
                            {type.remaining_quantity} / {type.initial_quantity}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${type.remaining_quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {type.remaining_quantity > 0 ? 'Available' : 'Sold Out'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/organizer/events/${eventId}/ticket-types/${type.id}`}>
                              <Button variant="outline" size="sm">Edit</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Link href={`/organizer/events/${eventId}/edit`}>
                    <Button>Edit Event Details</Button>
                  </Link>
                  <Link href={`/organizer/events/${eventId}/reminders`}>
                    <Button variant="outline">Manage Reminders</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

