'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OrganizerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizerId = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      window.location.href = '/admin';
      return;
    }

    setUser(currentUser);
    loadOrganizerDetails();
  }, [organizerId]);

  async function loadOrganizerDetails() {
    // Prevent duplicate requests
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      // Use backend API which handles admin auth properly
      const { adminApi } = await import('@/lib/api');
      const response = await adminApi.getOrganizer(organizerId);
      
      const data = response.data;
      setOrganizer(data.organizer);
      setStaff(data.staff || []);
      setEvents(data.events || []);
    } catch (error: any) {
      // Check if error is due to abort
      if (error?.isAbort) {
        return; // Request was cancelled, don't update state
      }
      console.error('Failed to load organizer:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Please ensure you have admin privileges.');
      } else if (error.response?.status === 401) {
        alert('Authentication required. Please log in again.');
        window.location.href = '/login';
      } else {
        alert(`Error: ${error.response?.data?.error || error.message || 'Failed to load organizer details'}`);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    blocked: 'bg-gray-100 text-gray-800',
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!organizer) {
    return (
      <div className="p-8">
        <p className="text-red-600">Organizer not found.</p>
        <Link href="/admin/organizers">
          <Button variant="outline" className="mt-4">Back to Organizers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">{organizer.name}</h1>
            <p className="text-gray-600 mt-2">Organizer Details</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/organizers">
              <Button variant="outline">Back to Organizers</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${statusColors[organizer.status] || 'bg-gray-100 text-gray-800'}`}>
                  {organizer.status}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <span className="ml-2">{organizer.email}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Phone:</span>
                <span className="ml-2">{organizer.phone}</span>
              </div>
              {organizer.gst_number && (
                <div>
                  <span className="text-sm font-medium text-gray-500">GST Number:</span>
                  <span className="ml-2">{organizer.gst_number}</span>
                </div>
              )}
              {organizer.city && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Location:</span>
                  <span className="ml-2">{organizer.city}, {organizer.state} {organizer.pincode}</span>
                </div>
              )}
              {organizer.address && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Address:</span>
                  <p className="ml-2 text-sm">{organizer.address}</p>
                </div>
              )}
              {organizer.description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="ml-2 text-sm">{organizer.description}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-500">Created:</span>
                <span className="ml-2 text-sm">{new Date(organizer.created).toLocaleDateString()}</span>
              </div>
              {organizer.approved_at && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Approved:</span>
                  <span className="ml-2 text-sm">{new Date(organizer.approved_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Information */}
          {(organizer.bank_account_number || organizer.bank_name) && (
            <Card>
              <CardHeader>
                <CardTitle>Bank Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {organizer.bank_name && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Bank Name:</span>
                    <span className="ml-2">{organizer.bank_name}</span>
                  </div>
                )}
                {organizer.bank_account_number && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Account Number:</span>
                    <span className="ml-2 font-mono text-sm">****{organizer.bank_account_number.slice(-4)}</span>
                  </div>
                )}
                {organizer.bank_ifsc && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">IFSC:</span>
                    <span className="ml-2">{organizer.bank_ifsc}</span>
                  </div>
                )}
                {organizer.bank_account_holder_name && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Account Holder:</span>
                    <span className="ml-2">{organizer.bank_account_holder_name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Staff Members */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Staff Members ({staff.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="text-gray-500">No staff members assigned.</p>
            ) : (
              <div className="space-y-2">
                {staff.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{member.expand?.user_id?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{member.expand?.user_id?.email}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle>Events ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-gray-500">No events created yet.</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{event.name}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(event.start_date).toLocaleDateString()}
                          {event.expand?.venue_id && ` • ${event.expand.venue_id.name}`}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

