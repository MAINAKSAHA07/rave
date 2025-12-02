'use client';

import { useEffect, useState, useRef } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import Link from 'next/link';

export default function OrganizerDashboard() {
  const [organizer, setOrganizer] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
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
        const eventsData = await pb.collection('events').getFullList({
          sort: '-created',
          expand: 'organizer_id,venue_id',
        });
        setEvents(eventsData as any);
        // Set dummy organizer to bypass check
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
        // Check if error is due to abort
        if (staffError?.isAbort) {
          return; // Request was cancelled, don't update state
        }
        
        // No staff association found - user is not an organizer
        console.log('No organizer staff association found');
        // If user has backoffice access but no organizer association, still allow access
        // They might be a regular backoffice user or admin viewing all events
        if (user.backoffice_access || user.role === 'admin' || user.role === 'super_admin') {
          // Allow access but show message
          setOrganizer({ 
            name: 'No Organizer Association',
            description: 'You have backoffice access but are not linked to an organizer. Contact an administrator to be added as staff.'
          });
          setEvents([]);
        } else {
          setOrganizer(null);
          setEvents([]);
        }
      }
    } catch (error: any) {
      // Check if error is due to abort
      if (error?.isAbort) {
        return; // Request was cancelled, don't update state
      }
      console.error('Failed to load dashboard:', error);
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
    // If super admin or admin, show all events view
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin') {
      return (
        <div className="min-h-screen p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">
              Organizer Dashboard ({currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'} View)
            </h1>
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                You are viewing this as {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}. 
                You can see all events across all organizers.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">All Events ({events.length})</h2>
              {events.length === 0 ? (
                <p className="text-gray-500">No events found.</p>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      href={`/organizer/events/${event.id}`}
                      className="block p-4 border rounded-lg hover:bg-gray-50 bg-white"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{event.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {event.expand?.organizer_id?.name || 'Unknown Organizer'} • {' '}
                            {new Date(event.start_date).toLocaleDateString()}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            event.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'draft'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    const user = getCurrentUser();
    const hasBackofficeAccess = user?.backoffice_access || user?.role === 'admin' || user?.role === 'super_admin';
    
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Organizer Dashboard</h1>
          {hasBackofficeAccess ? (
            <div className="p-8 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium mb-2">
                You have backoffice access but are not linked to an organizer account.
              </p>
              <p className="text-blue-700 text-sm mb-4">
                As a {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'backoffice user'}, 
                you can view all events. To manage a specific organizer's events, you need to be added as staff to an organizer account.
              </p>
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <Link 
                  href="/admin/organizers" 
                  className="text-blue-600 hover:underline font-medium"
                >
                  View all organizers →
                </Link>
              )}
            </div>
          ) : (
            <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-medium mb-2">
                You are not associated with an organizer account.
              </p>
              <p className="text-yellow-700 text-sm">
                To access the organizer dashboard, you need to be added as staff to an organizer account.
                Please contact an administrator or the organizer owner.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Organizer Dashboard</h1>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{organizer.name}</h2>
          <p className="text-gray-600">{organizer.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/organizer/venues"
            className="p-6 border rounded-lg hover:bg-gray-100"
          >
            <h3 className="text-xl font-semibold mb-2">Venues</h3>
            <p>Manage your venues</p>
          </Link>

          <Link
            href="/organizer/events"
            className="p-6 border rounded-lg hover:bg-gray-100"
          >
            <h3 className="text-xl font-semibold mb-2">Events</h3>
            <p>Create and manage events</p>
          </Link>

          <Link
            href="/organizer/tickets"
            className="p-6 border rounded-lg hover:bg-gray-100"
          >
            <h3 className="text-xl font-semibold mb-2">Tickets</h3>
            <p>View and manage tickets</p>
          </Link>

          <Link
            href="/organizer/analytics"
            className="p-6 border rounded-lg hover:bg-gray-100"
          >
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p>View sales and revenue</p>
          </Link>

          <Link
            href="/organizer/staff"
            className="p-6 border rounded-lg hover:bg-gray-100"
          >
            <h3 className="text-xl font-semibold mb-2">Staff</h3>
            <p>Manage staff members</p>
          </Link>

          <Link
            href="/organizer/refunds"
            className="p-6 border rounded-lg hover:bg-gray-100"
          >
            <h3 className="text-xl font-semibold mb-2">Refunds</h3>
            <p>Request and manage refunds</p>
          </Link>

          <Link
            href="/organizer/email-templates"
            className="p-6 border rounded-lg hover:bg-gray-100"
          >
            <h3 className="text-xl font-semibold mb-2">Email Templates</h3>
            <p>Customize email templates</p>
          </Link>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Events</h2>
          <div className="space-y-4">
            {events.slice(0, 5).map((event) => (
              <Link
                key={event.id}
                href={`/organizer/events/${event.id}`}
                className="block p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{event.name}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm ${event.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : event.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {event.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

