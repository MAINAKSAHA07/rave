'use client';

import { useEffect, useState, useRef } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrganizerVenuesPage() {
  const [user, setUser] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    setUser(currentUser);
    loadVenues();
  }, []);

  async function loadVenues() {
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

      // Super Admin or Admin: Fetch all venues
      if (user.role === 'super_admin' || user.role === 'admin') {
        const venuesData = await pb.collection('venues').getFullList({
          sort: '-created',
          expand: 'organizer_id',
        });
        setVenues(venuesData as any);
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

        const venuesData = await pb.collection('venues').getFullList({
          filter: `organizer_id="${organizerData.id}"`,
          sort: '-created',
        });
        setVenues(venuesData as any);
      } catch (staffError: any) {
        if (staffError?.isAbort) {
          return;
        }
        console.error('No organizer staff association found:', staffError);
        setVenues([]);
      }
    } catch (error: any) {
      if (error?.isAbort) {
        return;
      }
      console.error('Failed to load venues:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

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
                Loading venues...
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
            <h1 className="text-4xl font-bold">Venues</h1>
            <p className="text-gray-600 mt-2">Manage your venues</p>
          </div>
          <div className="flex gap-2">
            <Link href="/organizer/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            <Link href="/organizer/venues/new">
              <Button>Create New Venue</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Venues ({venues.length})</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadVenues}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {venues.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No venues found.</p>
                <Link href="/organizer/venues/new">
                  <Button>Create Your First Venue</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {venues.map((venue) => (
                  <Link
                    key={venue.id}
                    href={`/organizer/venues/${venue.id}`}
                    className="block"
                  >
                    <Card className="hover:bg-gray-50 transition-colors h-full">
                      <CardContent className="pt-6">
                        <h3 className="text-xl font-semibold mb-2">{venue.name}</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{venue.address}</p>
                          <p>{venue.city}, {venue.state} {venue.pincode}</p>
                          <div className="mt-2 pt-2 border-t">
                            <p>
                              <span className="font-medium">Capacity:</span> {venue.capacity}
                            </p>
                            <p>
                              <span className="font-medium">Layout:</span> {venue.layout_type}
                            </p>
                            {venue.expand?.organizer_id && (
                              <p className="text-xs text-gray-500 mt-1">
                                Organizer: {venue.expand.organizer_id.name}
                              </p>
                            )}
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

