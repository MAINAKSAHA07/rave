'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { getPocketBaseFileUrl } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Loading from '@/components/Loading';

interface Seat {
  id: string;
  section: string;
  row: string;
  seat_number: string;
  label: string;
  position_x?: number;
  position_y?: number;
}

export default function SeatMapEditorPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;
  const [venue, setVenue] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [floorPlanImage, setFloorPlanImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    loadData();
  }, [venueId]);

  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    }
  }, []);

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

  function handleMouseDown(e: React.MouseEvent, seatId: string) {
    e.preventDefault();
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const seatX = seat.position_x || 0;
    const seatY = seat.position_y || 0;

    setIsDragging(true);
    setActiveSeatId(seatId);
    setDragStartPos({ x: mouseX, y: mouseY });
    setDragOffset({
      x: mouseX - seatX,
      y: mouseY - seatY,
    });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !activeSeatId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = Math.max(0, Math.min(canvasSize.width - 40, mouseX - dragOffset.x));
    const newY = Math.max(0, Math.min(canvasSize.height - 40, mouseY - dragOffset.y));

    setSeats((prevSeats) =>
      prevSeats.map((seat) =>
        seat.id === activeSeatId
          ? { ...seat, position_x: newX, position_y: newY }
          : seat
      )
    );
  }

  function handleMouseUp() {
    if (isDragging && activeSeatId) {
      setIsDragging(false);
      setActiveSeatId(null);
    }
  }

  async function handleSavePositions() {
    setSaving(true);
    try {
      const pb = getPocketBase();
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

      // Update all seats with positions
      await Promise.all(
        seats.map(async (seat) => {
          if (seat.position_x !== undefined && seat.position_y !== undefined) {
            try {
              const response = await fetch(`${API_URL}/api/seats/${seat.id}/position`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${pb.authStore.token}`,
                },
                body: JSON.stringify({
                  position_x: seat.position_x,
                  position_y: seat.position_y,
                }),
              });

              if (!response.ok) {
                console.error(`Failed to update seat ${seat.id}:`, await response.text());
              }
            } catch (error) {
              console.error(`Error updating seat ${seat.id}:`, error);
            }
          }
        })
      );

      alert('Seat positions saved successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Failed to save positions:', error);
      alert(`Error: ${error.message || 'Failed to save positions'}`);
    } finally {
      setSaving(false);
    }
  }

  function handleResetPositions() {
    if (!confirm('Reset all seat positions? This cannot be undone.')) {
      return;
    }

    setSeats((prevSeats) =>
      prevSeats.map((seat) => ({
        ...seat,
        position_x: undefined,
        position_y: undefined,
      }))
    );
  }

  async function handleUploadFloorPlan() {
    if (!floorPlanImage) {
      alert('Please select an image file');
      return;
    }

    setUploadingImage(true);
    try {
      const pb = getPocketBase();
      const formData = new FormData();
      formData.append('layout_image', floorPlanImage);

      await pb.collection('venues').update(venueId, formData);
      
      // Reload venue data to get updated image
      await loadData();
      
      alert('Floor plan image uploaded successfully!');
      setFloorPlanImage(null);
      
      // Reset file input
      const fileInput = document.getElementById('floor-plan-image') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error: any) {
      console.error('Failed to upload floor plan:', error);
      alert(`Error: ${error.message || 'Failed to upload floor plan image'}`);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRemoveFloorPlan() {
    if (!confirm('Remove the floor plan image? This cannot be undone.')) {
      return;
    }

    try {
      const pb = getPocketBase();
      await pb.collection('venues').update(venueId, {
        layout_image: null,
      });
      
      await loadData();
      alert('Floor plan image removed successfully!');
    } catch (error: any) {
      console.error('Failed to remove floor plan:', error);
      alert(`Error: ${error.message || 'Failed to remove floor plan image'}`);
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
              This venue is configured as General Admission (GA). Seat map editor is only available for SEATED venues.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push(`/organizer/venues/${venueId}`)}>
              Back to Venue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group seats by section for better organization
  const seatsBySection: Record<string, Seat[]> = {};
  seats.forEach((seat) => {
    if (!seatsBySection[seat.section]) {
      seatsBySection[seat.section] = [];
    }
    seatsBySection[seat.section].push(seat);
  });

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">💺 Seat Map Editor</h1>
            <p className="text-gray-600 mt-2">{venue.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop seats to position them on the floor plan
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/organizer/venues/${venueId}/seats`)}>
              Back to Seat List
            </Button>
            <Button variant="outline" onClick={handleResetPositions}>
              Reset Positions
            </Button>
            <Button onClick={handleSavePositions} disabled={saving}>
              {saving ? 'Saving...' : 'Save Positions'}
            </Button>
          </div>
        </div>

        {/* Floor Plan Image Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Floor Plan Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {venue.layout_image && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Current floor plan:</p>
                  <div className="relative inline-block border-2 border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={getPocketBaseFileUrl(venue, venue.layout_image)}
                      alt="Floor Plan"
                      className="max-h-48 object-contain"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFloorPlan}
                    className="mt-2"
                  >
                    Remove Image
                  </Button>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="floor-plan-image">Upload Floor Plan Image</Label>
                <Input
                  id="floor-plan-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFloorPlanImage(file);
                    }
                  }}
                />
                <p className="text-sm text-gray-500">
                  Upload a floor plan image (JPEG, PNG, or WebP). Max size: 10MB. This will be used as the background for positioning seats.
                </p>
                {floorPlanImage && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600">Selected: {floorPlanImage.name}</p>
                    <Button
                      onClick={handleUploadFloorPlan}
                      disabled={uploadingImage}
                      className="mt-2"
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Floor Plan'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Floor Plan Canvas</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasRef}
              className="relative border-2 border-dashed border-gray-300 bg-white rounded-lg overflow-hidden"
              style={{ width: '100%', height: '600px', minHeight: '600px' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Floor Plan Background Image */}
              {venue.layout_image && (
                <img
                  src={getPocketBaseFileUrl(venue, venue.layout_image)}
                  alt="Floor Plan Background"
                  className="absolute inset-0 w-full h-full object-contain z-0"
                  style={{ opacity: 0.3 }}
                />
              )}
              
              {/* Seats overlay */}
              <div className="relative z-10 w-full h-full">
              {seats.map((seat) => {
                const x = seat.position_x ?? Math.random() * (canvasSize.width - 40);
                const y = seat.position_y ?? Math.random() * (canvasSize.height - 40);

                return (
                  <div
                    key={seat.id}
                    className={`absolute cursor-grab active:cursor-grabbing bg-blue-500 text-white rounded px-2 py-1 text-xs font-medium shadow-md hover:bg-blue-600 transition-colors ${activeSeatId === seat.id ? 'ring-2 ring-blue-300 z-50' : 'z-10'
                      }`}
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: activeSeatId === seat.id ? 'scale(1.1)' : 'scale(1)',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, seat.id)}
                    title={`${seat.section} - Row ${seat.row} - ${seat.label}`}
                  >
                    💺 {seat.label}
                  </div>
                );
              })}

                {seats.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <p className="text-lg mb-2">No seats created yet</p>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/organizer/venues/${venueId}/seats`)}
                      >
                        Create Seats
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong> Click and drag seats to reposition them on the floor plan.
                Click "Save Positions" to save your changes. Seats without positions will be randomly placed.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Seats by Section ({seats.length} total)</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(seatsBySection).map(([section, sectionSeats]) => (
              <div key={section} className="mb-4">
                <h3 className="font-semibold mb-2">Section: {section} ({sectionSeats.length} seats)</h3>
                <div className="flex flex-wrap gap-2">
                  {sectionSeats.map((seat) => (
                    <div
                      key={seat.id}
                      className={`px-2 py-1 border rounded text-xs ${seat.position_x !== undefined && seat.position_y !== undefined
                          ? 'bg-green-50 border-green-300'
                          : 'bg-gray-50 border-gray-300'
                        }`}
                    >
                      {seat.label}
                      {seat.position_x !== undefined && seat.position_y !== undefined && (
                        <span className="ml-1 text-green-600">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


