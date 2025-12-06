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

export default function VenueSeatsPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;
  const [venue, setVenue] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkForm, setBulkForm] = useState<{
    section: string;
    startRow: string;
    endRow: string;
    startSeat: number;
    endSeat: number;
    rowType: 'letter' | 'number';
  }>({
    section: 'Main',
    startRow: 'A',
    endRow: 'F',
    startSeat: 1,
    endSeat: 20,
    rowType: 'letter', // 'letter' or 'number'
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

      if (venueData.layout_type === 'SEATED') {
        const seatsData = await pb.collection('seats').getFullList({
          filter: `venue_id="${venueId}"`,
          sort: 'section,row,seat_number',
        });
        setSeats(seatsData as any);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRowSequence(start: string, end: string, type: 'letter' | 'number'): string[] {
    if (type === 'number') {
      const startNum = parseInt(start);
      const endNum = parseInt(end);
      const rows: string[] = [];
      for (let i = startNum; i <= endNum; i++) {
        rows.push(i.toString());
      }
      return rows;
    } else {
      const startChar = start.toUpperCase().charCodeAt(0);
      const endChar = end.toUpperCase().charCodeAt(0);
      const rows: string[] = [];
      for (let i = startChar; i <= endChar; i++) {
        rows.push(String.fromCharCode(i));
      }
      return rows;
    }
  }

  async function handleBulkCreate() {
    if (!bulkForm.section || !bulkForm.startRow || !bulkForm.endRow) {
      alert('Please fill in all required fields');
      return;
    }

    setCreateLoading(true);
    try {
      const pb = getPocketBase();
      const rows = getRowSequence(bulkForm.startRow, bulkForm.endRow, bulkForm.rowType as 'letter' | 'number');
      const seatsToCreate: any[] = [];

      for (const row of rows) {
        for (let seatNum = bulkForm.startSeat; seatNum <= bulkForm.endSeat; seatNum++) {
          const label = `${row}${seatNum}`;
          seatsToCreate.push({
            venue_id: venueId,
            section: bulkForm.section,
            row: row,
            seat_number: seatNum.toString(),
            label: label,
          });
        }
      }

      // Create seats in batches to avoid overwhelming the API
      const batchSize = 50;
      for (let i = 0; i < seatsToCreate.length; i += batchSize) {
        const batch = seatsToCreate.slice(i, i + batchSize);
        await Promise.all(
          batch.map((seat) =>
            pb.collection('seats').create(seat).catch((error: any) => {
              // Ignore duplicate errors (seats already exist)
              if (!error.response?.data?.message?.includes('unique')) {
                console.error('Failed to create seat:', seat, error);
              }
            })
          )
        );
      }

      alert(`Successfully created ${seatsToCreate.length} seats!`);
      setShowBulkDialog(false);
      setBulkForm({
        section: 'Main',
        startRow: 'A',
        endRow: 'F',
        startSeat: 1,
        endSeat: 20,
        rowType: 'letter',
      });
      await loadData();
    } catch (error: any) {
      console.error('Failed to create seats:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to create seats'}`);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeleteSeat(seatId: string) {
    if (!confirm('Delete this seat? This cannot be undone if tickets have been sold.')) {
      return;
    }

    try {
      const pb = getPocketBase();
      await pb.collection('seats').delete(seatId);
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete seat:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to delete seat'}`);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!venue) {
    return <div className="p-8">Venue not found</div>;
  }

  if (venue.layout_type !== 'SEATED') {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              This venue is configured as General Admission (GA). Seats are only available for SEATED venues.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push(`/organizer/venues/${venueId}`)}>
              Back to Venue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group seats by section and row
  const groupedSeats: Record<string, Record<string, any[]>> = {};
  seats.forEach((seat) => {
    if (!groupedSeats[seat.section]) {
      groupedSeats[seat.section] = {};
    }
    if (!groupedSeats[seat.section][seat.row]) {
      groupedSeats[seat.section][seat.row] = [];
    }
    groupedSeats[seat.section][seat.row].push(seat);
  });

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Seat Management</h1>
            <p className="text-gray-600 mt-2">{venue.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/organizer/venues/${venueId}`)}>
              Back to Venue
            </Button>
            <Link href={`/organizer/venues/${venueId}/seats-map`}>
              <Button>💺 Open Seat Map Editor</Button>
            </Link>
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
              <DialogTrigger asChild>
                <Button>Bulk Create Seats</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bulk Create Seats</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="section">Section *</Label>
                    <Input
                      id="section"
                      placeholder="e.g., Main, VIP, Balcony"
                      value={bulkForm.section}
                      onChange={(e) => setBulkForm({ ...bulkForm, section: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rowType">Row Type *</Label>
                    <Select
                      value={bulkForm.rowType}
                      onValueChange={(value: 'letter' | 'number') =>
                        setBulkForm({ ...bulkForm, rowType: value })
                      }
                    >
                      <SelectTrigger id="rowType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">Letters (A, B, C...)</SelectItem>
                        <SelectItem value="number">Numbers (1, 2, 3...)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startRow">Start Row *</Label>
                      <Input
                        id="startRow"
                        placeholder={bulkForm.rowType === 'letter' ? 'A' : '1'}
                        value={bulkForm.startRow}
                        onChange={(e) => setBulkForm({ ...bulkForm, startRow: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endRow">End Row *</Label>
                      <Input
                        id="endRow"
                        placeholder={bulkForm.rowType === 'letter' ? 'F' : '10'}
                        value={bulkForm.endRow}
                        onChange={(e) => setBulkForm({ ...bulkForm, endRow: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startSeat">Start Seat Number *</Label>
                      <Input
                        id="startSeat"
                        type="number"
                        min="1"
                        value={bulkForm.startSeat}
                        onChange={(e) =>
                          setBulkForm({ ...bulkForm, startSeat: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="endSeat">End Seat Number *</Label>
                      <Input
                        id="endSeat"
                        type="number"
                        min="1"
                        value={bulkForm.endSeat}
                        onChange={(e) =>
                          setBulkForm({ ...bulkForm, endSeat: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800">
                      This will create seats for rows {bulkForm.startRow} to {bulkForm.endRow},
                      seats {bulkForm.startSeat} to {bulkForm.endSeat} in section "{bulkForm.section}".
                      <br />
                      Total: {getRowSequence(bulkForm.startRow, bulkForm.endRow, bulkForm.rowType as 'letter' | 'number').length *
                        (bulkForm.endSeat - bulkForm.startSeat + 1)} seats
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkCreate} disabled={createLoading}>
                      {createLoading ? 'Creating...' : 'Create Seats'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seats ({seats.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {seats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No seats created yet.</p>
                <Button onClick={() => setShowBulkDialog(true)}>Create Seats</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSeats).map(([section, rows]) => (
                  <div key={section}>
                    <h3 className="font-semibold text-lg mb-3">Section: {section}</h3>
                    {Object.entries(rows).map(([row, rowSeats]) => (
                      <div key={`${section}-${row}`} className="mb-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Row {row}</h4>
                        <div className="flex flex-wrap gap-2">
                          {rowSeats
                            .sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number))
                            .map((seat) => (
                              <div
                                key={seat.id}
                                className="px-3 py-1 border rounded text-sm flex items-center gap-2"
                              >
                                <span>{seat.label}</span>
                                <button
                                  onClick={() => handleDeleteSeat(seat.id)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
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



