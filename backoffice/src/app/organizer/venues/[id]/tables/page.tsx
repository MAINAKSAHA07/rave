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
import Loading from '@/components/Loading';

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
      console.log('[Tables] Loading venue:', venueId);
      const venueData = await pb.collection('venues').getOne(venueId);
      setVenue(venueData);
      console.log('[Tables] Venue loaded:', { id: venueData.id, name: venueData.name, layout_type: venueData.layout_type });

      if (venueData.layout_type === 'GA_TABLE') {
        console.log('[Tables] Loading tables for venue:', venueId);
        try {
          // Try multiple filter formats to handle both string and relation venue_id
          let tablesData: any[] = [];
          
          // First try: Direct venue_id match (for string IDs)
          try {
            tablesData = await pb.collection('tables').getFullList({
              filter: `venue_id="${venueId}"`,
              sort: 'section,name',
            });
            console.log('[Tables] Loaded with venue_id filter:', tablesData.length);
          } catch (filterError) {
            console.log('[Tables] Direct filter failed, trying relation filter');
          }
          
          // If no results, try relation filter format
          if (tablesData.length === 0) {
            try {
              tablesData = await pb.collection('tables').getFullList({
                filter: `venue_id.id="${venueId}"`,
                sort: 'section,name',
              });
              console.log('[Tables] Loaded with venue_id.id filter:', tablesData.length);
            } catch (relError) {
              console.log('[Tables] Relation filter also failed');
            }
          }
          
          // If still no results, get all and filter manually
          if (tablesData.length === 0) {
            console.log('[Tables] No results with filters, fetching all and filtering manually...');
            const allTables = await pb.collection('tables').getFullList({
              sort: 'section,name',
            });
            console.log('[Tables] Total tables in database:', allTables.length);
            
            // Filter manually by comparing venue_id values
            tablesData = allTables.filter((t: any) => {
              const tableVenueId = typeof t.venue_id === 'string' 
                ? t.venue_id 
                : (t.venue_id?.id || t.venue_id || '');
              const matches = tableVenueId === venueId;
              if (!matches && allTables.length <= 5) {
                console.log('[Tables] Table venue_id mismatch:', {
                  tableId: t.id,
                  tableName: t.name,
                  tableVenueId: tableVenueId,
                  expectedVenueId: venueId,
                  venueIdType: typeof t.venue_id,
                });
              }
              return matches;
            });
            console.log('[Tables] Filtered tables manually:', tablesData.length);
          }
          
          console.log('[Tables] Final tables count:', tablesData.length);
          setTables(tablesData as any);
          
          // If no tables found, try without filter to see if there are any tables at all
          if (tablesData.length === 0) {
            console.log('[Tables] No tables found with filter, checking all tables...');
            try {
              const allTables = await pb.collection('tables').getFullList({
                sort: 'section,name',
              });
              console.log('[Tables] Total tables in database:', allTables.length);
              console.log('[Tables] Sample table data:', allTables.slice(0, 2));
              console.log('[Tables] Current venue ID:', venueId);
              console.log('[Tables] Venue IDs in tables:', allTables.map((t: any) => ({ id: t.id, venue_id: t.venue_id, name: t.name })));
              
              // Try alternative filter formats
              console.log('[Tables] Trying alternative filters...');
              try {
                // Try with relation syntax
                const tablesWithRelation = await pb.collection('tables').getFullList({
                  filter: `venue_id.id="${venueId}"`,
                  sort: 'section,name',
                });
                console.log('[Tables] Found with venue_id.id filter:', tablesWithRelation.length);
                if (tablesWithRelation.length > 0) {
                  setTables(tablesWithRelation as any);
                  return;
                }
              } catch (relError) {
                console.log('[Tables] venue_id.id filter failed:', relError);
              }
              
              // Check if any tables match by comparing venue_id values
              const matchingTables = allTables.filter((t: any) => {
                const tableVenueId = typeof t.venue_id === 'string' ? t.venue_id : t.venue_id?.id || t.venue_id;
                return tableVenueId === venueId;
              });
              console.log('[Tables] Matching tables found:', matchingTables.length);
              if (matchingTables.length > 0) {
                setTables(matchingTables as any);
                return;
              }
            } catch (checkError) {
              console.error('[Tables] Failed to check all tables:', checkError);
            }
          }
        } catch (tablesError: any) {
          console.error('[Tables] Failed to load tables:', {
            error: tablesError.message,
            status: tablesError.status || tablesError.response?.status,
            response: tablesError.response?.data,
          });
          setTables([]);
        }
      } else {
        console.log('[Tables] Venue is not GA_TABLE, skipping table load');
        setTables([]);
      }
    } catch (error: any) {
      console.error('[Tables] Failed to load data:', {
        error: error.message,
        status: error.status || error.response?.status,
      });
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
    return <Loading />;
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
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setShowCreateDialog(true)}>Create Table</Button>
                  <Button variant="outline" onClick={loadData}>Refresh</Button>
                </div>
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

