'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { getPocketBaseFileUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Loading from '@/components/Loading';

export default function VenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;
  const [venue, setVenue] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenue();
  }, [venueId]);

  async function loadVenue() {
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();

      // For admin/super_admin, they can access any venue
      // For organizer staff, they can only access venues for their organizer
      let venueData;
      try {
        venueData = await pb.collection('venues').getOne(venueId, {
          expand: 'organizer_id',
        });
      } catch (error: any) {
        // If direct access fails, check if user is organizer staff
        if (user.role !== 'super_admin' && user.role !== 'admin') {
          // Try to verify organizer staff access
          try {
            const staff = await pb.collection('organizer_staff').getFirstListItem(
              `user_id="${user.id}" && status="active"`
            );
            // Try again with organizer filter
            venueData = await pb.collection('venues').getOne(venueId, {
              expand: 'organizer_id',
              filter: `organizer_id="${staff.organizer_id}"`,
            });
          } catch (staffError) {
            throw new Error('You do not have access to this venue');
          }
        } else {
          throw error;
        }
      }

      setVenue(venueData);

      // Load events using this venue
      try {
        const eventsData = await pb.collection('events').getFullList({
          filter: `venue_id="${venueId}"`,
          sort: '-created',
        });
        setEvents(eventsData as any);
      } catch (error) {
        console.error('Failed to load events:', error);
      }
    } catch (error: any) {
      console.error('Failed to load venue:', error);
      alert(`Venue not found or access denied: ${error.message || 'Unknown error'}`);
      router.push('/organizer/venues');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!venue) {
    return (
      <div className="p-8">
        <p className="text-red-600">Venue not found.</p>
        <Link href="/organizer/venues">
          <Button variant="outline" className="mt-4">Back to Venues</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">{venue.name}</h1>
            <p className="text-gray-600 mt-2">Venue Details</p>
          </div>
          <div className="flex gap-2">
            <Link href="/organizer/venues">
              <Button variant="outline">Back to Venues</Button>
            </Link>
            <Link href={`/organizer/venues/${venueId}/edit`}>
              <Button>Edit Venue</Button>
            </Link>
            {venue.layout_type === 'SEATED' && (
              <>
                <Link href={`/organizer/venues/${venueId}/seats`}>
                  <Button variant="outline">Manage Seats</Button>
                </Link>
                <Link href={`/organizer/venues/${venueId}/seats-map`}>
                  <Button variant="outline">💺 Seat Map Editor</Button>
                </Link>
              </>
            )}
            {venue.layout_type === 'GA_TABLE' && (
              <>
                <Link href={`/organizer/venues/${venueId}/tables`}>
                  <Button variant="outline">Manage Tables</Button>
                </Link>
                <Link href={`/organizer/venues/${venueId}/tables-map`}>
                  <Button variant="outline">🪑 Table Map Editor</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Venue Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Name:</span>
                <span className="ml-2">{venue.name}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Address:</span>
                <p className="mt-1">{venue.address}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Location:</span>
                <p className="mt-1">{venue.city}, {venue.state} {venue.pincode}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Capacity:</span>
                <span className="ml-2">{venue.capacity} people</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Layout Type:</span>
                <span className="ml-2">{venue.layout_type}</span>
              </div>
              {venue.expand?.organizer_id && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Organizer:</span>
                  <span className="ml-2">{venue.expand.organizer_id.name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {venue.layout_image && (
            <Card>
              <CardHeader>
                <CardTitle>Layout Image</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={getPocketBaseFileUrl(venue, Array.isArray(venue.layout_image) ? venue.layout_image[0] : venue.layout_image)}
                  alt={venue.name}
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events at This Venue ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-gray-500">No events have been created at this venue yet.</p>
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
                          <div>
                            <h3 className="font-semibold text-lg">{event.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(event.start_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${event.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'draft'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                            {event.status}
                          </span>
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




