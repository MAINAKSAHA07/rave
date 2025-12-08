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

interface Table {
  id: string;
  name: string;
  capacity: number;
  section: string;
  position_x?: number;
  position_y?: number;
}

export default function TableMapEditorPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;
  const [venue, setVenue] = useState<any>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [floorPlanImage, setFloorPlanImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
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
      
      // Ensure collection info is set for file URL generation
      venueData.collectionName = 'venues';
      
      // Try to get the actual collection ID for better file URL generation
      try {
        const collections = await pb.collections.getFullList();
        const venuesCollection = collections.find((c: any) => c.name === 'venues');
        if (venuesCollection) {
          venueData.collectionId = venuesCollection.id;
        }
      } catch (e) {
        console.warn('[TableMap] Could not get collection info:', e);
      }
      
      // Generate file URL using PocketBase SDK directly for better compatibility
      if (venueData.layout_image) {
        try {
          const layoutImageFilename = Array.isArray(venueData.layout_image) 
            ? venueData.layout_image[0] 
            : venueData.layout_image;
          venueData.layout_image_url = pb.files.getUrl(venueData, layoutImageFilename);
        } catch (urlError) {
          console.error('[TableMap] Failed to generate layout image URL:', urlError);
          // Fallback to getPocketBaseFileUrl
          venueData.layout_image_url = getPocketBaseFileUrl(venueData, venueData.layout_image);
        }
      }
      
        id: venueData.id,
        name: venueData.name,
        layout_image: venueData.layout_image,
        layout_image_type: typeof venueData.layout_image,
        layout_image_is_array: Array.isArray(venueData.layout_image),
        layout_image_url: venueData.layout_image_url,
        collectionId: venueData.collectionId,
        collectionName: venueData.collectionName,
      });
      setVenue(venueData);

      if (venueData.layout_type === 'GA_TABLE') {
        // Try multiple filter formats to handle both string and relation venue_id
        let tablesData: any[] = [];
        
        // First try: Direct venue_id match (for string IDs)
        try {
          tablesData = await pb.collection('tables').getFullList({
            filter: `venue_id="${venueId}"`,
            sort: 'section,name',
          });
        } catch (filterError) {
        }
        
        // If no results, try relation filter format
        if (tablesData.length === 0) {
          try {
            tablesData = await pb.collection('tables').getFullList({
              filter: `venue_id.id="${venueId}"`,
              sort: 'section,name',
            });
          } catch (relError) {
          }
        }
        
        // If still no results, get all and filter manually
        if (tablesData.length === 0) {
          const allTables = await pb.collection('tables').getFullList({
            sort: 'section,name',
          });
          
          // Filter manually by comparing venue_id values
          tablesData = allTables.filter((t: any) => {
            const tableVenueId = typeof t.venue_id === 'string' 
              ? t.venue_id 
              : (t.venue_id?.id || t.venue_id || '');
            return tableVenueId === venueId;
          });
        }
        
        setTables(tablesData as any);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleMouseDown(e: React.MouseEvent, tableId: string) {
    e.preventDefault();
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const tableX = table.position_x || 0;
    const tableY = table.position_y || 0;

    setIsDragging(true);
    setActiveTableId(tableId);
    setDragStartPos({ x: mouseX, y: mouseY });
    setDragOffset({
      x: mouseX - tableX,
      y: mouseY - tableY,
    });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !activeTableId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = Math.max(0, Math.min(canvasSize.width - 100, mouseX - dragOffset.x));
    const newY = Math.max(0, Math.min(canvasSize.height - 60, mouseY - dragOffset.y));

    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === activeTableId
          ? { ...table, position_x: newX, position_y: newY }
          : table
      )
    );
  }

  function handleMouseUp() {
    if (isDragging && activeTableId) {
      setIsDragging(false);
      setActiveTableId(null);
    }
  }

  async function handleSavePositions() {
    setSaving(true);
    try {
      const pb = getPocketBase();

      // Update all tables with positions
      await Promise.all(
        tables.map(async (table) => {
          if (table.position_x !== undefined && table.position_y !== undefined) {
            try {
              await pb.collection('tables').update(table.id, {
                position_x: table.position_x,
                position_y: table.position_y,
              });
            } catch (error) {
              console.error(`Error updating table ${table.id}:`, error);
            }
          }
        })
      );

      alert('Table positions saved successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Failed to save positions:', error);
      alert(`Error: ${error.message || 'Failed to save positions'}`);
    } finally {
      setSaving(false);
    }
  }

  function handleResetPositions() {
    if (!confirm('Reset all table positions? This cannot be undone.')) {
      return;
    }

    setTables((prevTables) =>
      prevTables.map((table) => ({
        ...table,
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
      
      await loadData();
      alert('Floor plan image uploaded successfully!');
      setFloorPlanImage(null);
      
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

  if (venue.layout_type !== 'GA_TABLE') {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              This venue is not configured as General Admission + Tables. Table map editor is only available for GA_TABLE venues.
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
  const tablesBySection: Record<string, Table[]> = {};
  tables.forEach((table) => {
    const section = table.section || 'Main';
    if (!tablesBySection[section]) {
      tablesBySection[section] = [];
    }
    tablesBySection[section].push(table);
  });

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">🪑 Table Map Editor</h1>
            <p className="text-gray-600 mt-2">{venue.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop tables to position them on the floor plan
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/organizer/venues/${venueId}/tables`)}>
              Back to Table List
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
                      src={venue.layout_image_url || getPocketBaseFileUrl(venue, venue.layout_image)}
                      alt="Floor Plan"
                      className="max-h-48 object-contain"
                      onError={(e) => {
                        console.error('[TableMap] Failed to load floor plan image:', {
                          layout_image: venue.layout_image,
                          layout_image_url: venue.layout_image_url,
                          venue_id: venue.id,
                          venue_record: venue,
                          error: e,
                        });
                      }}
                      onLoad={() => {
                      }}
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
                  Upload a floor plan image (JPEG, PNG, or WebP). Max size: 10MB. This will be used as the background for positioning tables.
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
                  src={venue.layout_image_url || getPocketBaseFileUrl(venue, venue.layout_image)}
                  alt="Floor Plan Background"
                  className="absolute inset-0 w-full h-full object-contain z-0"
                  style={{ opacity: 0.3 }}
                  onError={(e) => {
                    console.error('[TableMap] Failed to load floor plan background image:', {
                      layout_image: venue.layout_image,
                      layout_image_url: venue.layout_image_url,
                      venue_id: venue.id,
                      venue_record: venue,
                      error: e,
                    });
                  }}
                  onLoad={() => {
                  }}
                />
              )}
              
              {/* Tables overlay */}
              <div className="relative z-10 w-full h-full">
                {tables.map((table) => {
                  const x = table.position_x ?? Math.random() * (canvasSize.width - 100);
                  const y = table.position_y ?? Math.random() * (canvasSize.height - 60);

                  return (
                    <div
                      key={table.id}
                      className={`absolute cursor-grab active:cursor-grabbing bg-purple-500 text-white rounded-lg px-3 py-2 text-sm font-medium shadow-md hover:bg-purple-600 transition-colors ${activeTableId === table.id ? 'ring-2 ring-purple-300 z-50' : 'z-10'
                        }`}
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: activeTableId === table.id ? 'scale(1.1)' : 'scale(1)',
                        minWidth: '80px',
                      }}
                      onMouseDown={(e) => handleMouseDown(e, table.id)}
                      title={`${table.name} - Capacity: ${table.capacity} (${table.section})`}
                    >
                      <div className="text-center">
                        <div className="font-bold">{table.name}</div>
                        <div className="text-xs">👥 {table.capacity}</div>
                      </div>
                    </div>
                  );
                })}

                {tables.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <p className="text-lg mb-2">No tables created yet</p>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/organizer/venues/${venueId}/tables`)}
                      >
                        Create Tables
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-4 bg-purple-50 rounded">
              <p className="text-sm text-purple-800">
                <strong>Instructions:</strong> Click and drag tables to reposition them on the floor plan.
                Click "Save Positions" to save your changes. Tables without positions will be randomly placed.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tables by Section ({tables.length} total)</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(tablesBySection).map(([section, sectionTables]) => (
              <div key={section} className="mb-4">
                <h3 className="font-semibold mb-2">Section: {section} ({sectionTables.length} tables)</h3>
                <div className="flex flex-wrap gap-2">
                  {sectionTables.map((table) => (
                    <div
                      key={table.id}
                      className={`px-2 py-1 border rounded text-xs ${table.position_x !== undefined && table.position_y !== undefined
                          ? 'bg-green-50 border-green-300'
                          : 'bg-gray-50 border-gray-300'
                        }`}
                    >
                      {table.name} ({table.capacity})
                      {table.position_x !== undefined && table.position_y !== undefined && (
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

