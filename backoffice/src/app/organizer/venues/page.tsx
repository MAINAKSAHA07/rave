'use client';

import { useEffect, useState, useRef } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Loading from '@/components/Loading';

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
    if (loadingRef.current) return;

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
        if (staffError?.isAbort) return;
        console.error('No organizer staff association found:', staffError);
        setVenues([]);
      }
    } catch (error: any) {
      if (error?.isAbort) return;
      console.error('Failed to load venues:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!organizer) {
    const currentUser = getCurrentUser();
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin') {
      return (
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600">Loading venues...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

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
            <Link href="/organizer/dashboard">
              <Button variant="outline" className="w-full">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
            <p className="text-muted-foreground mt-2">Manage your venues</p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <p className="text-muted-foreground mb-4">No venues found.</p>
                      <Link href="/organizer/venues/new">
                        <Button>Create Your First Venue</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  venues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell className="font-medium">
                        {venue.name}
                        {venue.expand?.organizer_id && (
                          <p className="text-xs text-muted-foreground">
                            Organizer: {venue.expand.organizer_id.name}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{venue.address}</span>
                          <span className="text-muted-foreground">
                            {venue.city}, {venue.state} {venue.pincode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{venue.capacity}</TableCell>
                      <TableCell className="capitalize">{venue.layout_type}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/organizer/venues/${venue.id}`}>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



