'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getPocketBase } from '@/lib/pocketbase';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Loading from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      const response = await adminApi.getOrganizers(filterStatus === 'all' ? undefined : filterStatus);
      const orgs = Array.isArray(response.data) ? response.data : [];
      setOrganizers(orgs as any);
    } catch (error: any) {
      console.error('Failed to load organizers:', error);
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
    return <Loading />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizers Management</h1>
            <p className="text-muted-foreground mt-2">View and manage all organizers</p>
          </div>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organizer Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No organizers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrganizers.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        <div>
                          {org.name}
                          {org.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {org.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[org.status] || 'bg-gray-100 text-gray-800'}`}>
                          {org.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{org.email}</span>
                          <span className="text-xs text-muted-foreground">{org.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.city ? `${org.city}, ${org.state}` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(org.created).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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

