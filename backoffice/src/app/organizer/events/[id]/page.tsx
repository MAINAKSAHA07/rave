'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

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
    draft: 'bg-gray-100 text-gray-800',
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
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">{event.name}</h1>
            <p className="text-gray-600 mt-2">Event Details</p>
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
            <Link href={`/organizer/events/${eventId}/edit`}>
              <Button>Edit Event</Button>
            </Link>
          </div>
        </div>

        {/* Publishing Checklist */}
        {event.status === 'draft' && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">Ready to Publish?</CardTitle>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${statusColors[event.status] || 'bg-gray-100 text-gray-800'}`}>
                  {event.status}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Category:</span>
                <span className="ml-2 capitalize">{event.category}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Start Date:</span>
                <span className="ml-2">{new Date(event.start_date).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">End Date:</span>
                <span className="ml-2">{new Date(event.end_date).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">City:</span>
                <span className="ml-2">{event.city}</span>
              </div>
              {event.expand?.venue_id && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Venue:</span>
                  <span className="ml-2">{event.expand.venue_id.name}</span>
                </div>
              )}
              {event.description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="mt-1 text-sm">{event.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {event.cover_image && (
            <Card>
              <CardHeader>
                <CardTitle>Cover Image</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={`http://127.0.0.1:8092/api/files/events/${event.id}/${event.cover_image}`}
                  alt={event.name}
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
          )}
        </div>

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
            {ticketTypes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No ticket types created yet.</p>
                <Link href={`/organizer/events/${eventId}/ticket-types/new`}>
                  <Button>Create First Ticket Type</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {ticketTypes.map((type) => (
                  <Card key={type.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{type.name}</h3>
                          {type.description && (
                            <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                          )}
                          <div className="mt-2 text-sm text-gray-500">
                            <span>Price: ₹{(type.final_price_minor / 100).toFixed(2)}</span>
                            <span className="ml-4">Available: {type.remaining_quantity} / {type.initial_quantity}</span>
                          </div>
                        </div>
                        <Link href={`/organizer/events/${eventId}/ticket-types/${type.id}`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

