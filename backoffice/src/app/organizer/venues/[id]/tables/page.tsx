'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

export default function VenueTablesPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;
  const [venue, setVenue] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    capacity: number;
    section: string;
  }>({
    name: '',
    capacity: 4,
    section: 'Main',
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [venueId]);

  async function loadData() {
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();
      const venueData = await pb.collection('venues').getOne(venueId);
      setVenue(venueData);

      if (venueData.layout_type === 'GA_TABLE') {
        const tablesData = await pb.collection('tables').getFullList({
          filter: `venue_id="${venueId}"`,
          sort: 'section,name',
        });
        setTables(tablesData as any);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTable() {
    if (!createForm.name || !createForm.capacity) {
      alert('Please fill in all required fields');
      return;
    }

    setCreateLoading(true);
    try {
      const pb = getPocketBase();
      await pb.collection('tables').create({
        venue_id: venueId,
        name: createForm.name,
        capacity: createForm.capacity,
        section: createForm.section || 'Main',
      });

      alert('Table created successfully!');
      setShowCreateDialog(false);
      setCreateForm({
        name: '',
        capacity: 4,
        section: 'Main',
      });
      await loadData();
    } catch (error: any) {
      console.error('Failed to create table:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to create table'}`);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeleteTable(tableId: string) {
    if (!confirm('Delete this table? This cannot be undone if tickets have been sold.')) {
      return;
    }

    try {
      const pb = getPocketBase();
      await pb.collection('tables').delete(tableId);
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete table:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to delete table'}`);
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!venue) {
    return <div className="p-8">Venue not found</div>;
  }

  if (venue.layout_type !== 'GA_TABLE') {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              This venue is not configured as General Admission + Tables. Table management is only available for GA_TABLE venues.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push(`/organizer/venues/${venueId}`)}>
              Back to Venue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group tables by section
  const groupedTables: Record<string, any[]> = {};
  tables.forEach((table) => {
    const section = table.section || 'Main';
    if (!groupedTables[section]) {
      groupedTables[section] = [];
    }
    groupedTables[section].push(table);
  });

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Table Management</h1>
            <p className="text-gray-600 mt-2">{venue.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/organizer/venues/${venueId}`)}>
              Back to Venue
            </Button>
            <Link href={`/organizer/venues/${venueId}/tables-map`}>
              <Button>🪑 Open Table Map Editor</Button>
            </Link>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>Create Table</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Table</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Table Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Table 1, T-1, VIP-1"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacity *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      value={createForm.capacity}
                      onChange={(e) => setCreateForm({ ...createForm, capacity: parseInt(e.target.value) || 1 })}
                    />
                    <p className="text-sm text-gray-500 mt-1">Number of people this table can seat</p>
                  </div>
                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      placeholder="e.g., Main, VIP, Outdoor"
                      value={createForm.section}
                      onChange={(e) => setCreateForm({ ...createForm, section: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTable} disabled={createLoading}>
                      {createLoading ? 'Creating...' : 'Create Table'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tables ({tables.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No tables created yet.</p>
                <Button onClick={() => setShowCreateDialog(true)}>Create Table</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedTables).map(([section, sectionTables]) => (
                  <div key={section}>
                    <h3 className="font-semibold text-lg mb-3">Section: {section}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectionTables.map((table) => (
                        <Card key={table.id} className="hover:bg-gray-50 transition-colors">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-lg">{table.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  Capacity: {table.capacity} {table.capacity === 1 ? 'person' : 'people'}
                                </p>
                                {table.position_x !== undefined && table.position_y !== undefined && (
                                  <p className="text-xs text-green-600 mt-1">✓ Positioned on map</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteTable(table.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
