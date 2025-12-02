'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getPocketBase } from '@/lib/pocketbase';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminOrganizersPage() {
  const [user, setUser] = useState<any>(null);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    loadOrganizers();
  }, []);

  async function loadOrganizers() {
    try {
      setLoading(true);
      console.log('Loading organizers with filter:', filterStatus);
      // Use backend API which handles admin auth properly
      const response = await adminApi.getOrganizers(filterStatus === 'all' ? undefined : filterStatus);
      
      console.log('Organizers API response:', response);
      console.log('Response data:', response.data);
      console.log('Is array?', Array.isArray(response.data));
      
      const orgs = Array.isArray(response.data) ? response.data : [];
      console.log(`Loaded ${orgs.length} organizers`);
      if (orgs.length > 0) {
        console.log('Organizers:', orgs.map((org: any) => ({ id: org.id, name: org.name, status: org.status })));
      } else {
        console.log('No organizers found. Check backend logs for details.');
      }
      setOrganizers(orgs as any);
    } catch (error: any) {
      console.error('Failed to load organizers:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      if (error.response?.status === 403) {
        alert('Access denied. Please ensure you have admin privileges.');
      } else if (error.response?.status === 401) {
        alert('Authentication required. Please log in again.');
        window.location.href = '/login';
      } else {
        alert(`Error loading organizers: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadOrganizers();
    }
  }, [filterStatus]);

  const filteredOrganizers = organizers.filter((org) => {
    const matchesSearch = 
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    blocked: 'bg-gray-100 text-gray-800',
  };

  async function handleToggleBlock(organizerId: string, currentlyBlocked: boolean) {
    if (!confirm(`Are you sure you want to ${currentlyBlocked ? 'unblock' : 'block'} this organizer?`)) {
      return;
    }

    try {
      const pb = getPocketBase();
      await pb.collection('organizers').update(organizerId, {
        status: currentlyBlocked ? 'approved' : 'blocked',
      });
      await loadOrganizers();
      alert(`Organizer ${currentlyBlocked ? 'unblocked' : 'blocked'} successfully`);
    } catch (error: any) {
      console.error('Error toggling block:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to update organizer'}`);
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Organizers Management</h1>
            <p className="text-gray-600 mt-2">View and manage all organizers</p>
          </div>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search by name, email, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizers List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Organizers ({filteredOrganizers.length})</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadOrganizers}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading organizers...</p>
                </div>
              ) : filteredOrganizers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No organizers found.</p>
                  <Button 
                    variant="outline" 
                    onClick={loadOrganizers}
                  >
                    Refresh List
                  </Button>
                </div>
              ) : (
                filteredOrganizers.map((org) => (
                  <Card key={org.id} className="bg-white">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold">{org.name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[org.status] || 'bg-gray-100 text-gray-800'}`}>
                              {org.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                            <div>
                              <span className="font-medium">Email:</span> {org.email}
                            </div>
                            <div>
                              <span className="font-medium">Phone:</span> {org.phone}
                            </div>
                            {org.gst_number && (
                              <div>
                                <span className="font-medium">GST:</span> {org.gst_number}
                              </div>
                            )}
                            {org.city && (
                              <div>
                                <span className="font-medium">Location:</span> {org.city}, {org.state}
                              </div>
                            )}
                          </div>
                          {org.description && (
                            <p className="text-sm text-gray-700 mb-2">{org.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Created: {new Date(org.created).toLocaleDateString()}
                            {org.approved_at && (
                              <> • Approved: {new Date(org.approved_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          {org.status === 'blocked' ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleToggleBlock(org.id, true)}
                            >
                              Unblock
                            </Button>
                          ) : org.status === 'approved' ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleToggleBlock(org.id, false)}
                            >
                              Block
                            </Button>
                          ) : null}
                          <Link href={`/admin/organizers/${org.id}`}>
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

