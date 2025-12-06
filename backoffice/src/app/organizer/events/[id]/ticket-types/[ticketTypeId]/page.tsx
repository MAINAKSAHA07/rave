'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPocketBaseFileUrl } from '@/lib/utils';
import Link from 'next/link';
import Loading from '@/components/Loading';

const formSchema = z.object({
  name: z.string().min(1, 'Ticket type name is required'),
  description: z.string().optional(),
  ticket_type_category: z.string().optional(), // 'GA' or 'TABLE' - required for GA_TABLE venues
  base_price_minor: z.string().min(1, 'Base price is required').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Base price must be a positive number'),
  gst_rate: z.string().min(1, 'GST rate is required').refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, 'GST rate must be between 0 and 100'),
  currency: z.string().min(1, 'Currency is required'),
  initial_quantity: z.string().min(1, 'Initial quantity is required').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Initial quantity must be a positive number'),
  sales_start: z.string().min(1, 'Sales start date is required'),
  sales_end: z.string().min(1, 'Sales end date is required'),
  max_per_order: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), 'Max per order must be a positive number'),
  max_per_user_per_event: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), 'Max per user must be a positive number'),
}).refine((data) => {
  const start = new Date(data.sales_start);
  const end = new Date(data.sales_end);
  return end >= start;
}, {
  message: 'Sales end date must be after sales start date',
  path: ['sales_end'],
});

export default function EditTicketTypePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const ticketTypeId = params.ticketTypeId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [ticketType, setTicketType] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [isGATable, setIsGATable] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [tableViewMode, setTableViewMode] = useState<'list' | 'map'>('list');
  const [venue, setVenue] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      ticket_type_category: '',
      base_price_minor: '',
      gst_rate: '18',
      currency: 'INR',
      initial_quantity: '',
      sales_start: '',
      sales_end: '',
      max_per_order: '10',
      max_per_user_per_event: '',
    },
  });

  useEffect(() => {
    async function loadData() {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();
      try {
        // Load event
        const eventData = await pb.collection('events').getOne(eventId, {
          expand: 'organizer_id,venue_id',
        });
        setEvent(eventData);

        // Check if venue is GA_TABLE
        const venueData = eventData.expand?.venue_id || eventData.venue_id;
        if (venueData && typeof venueData === 'object' && venueData.layout_type === 'GA_TABLE') {
          setIsGATable(true);
          setVenue(venueData);
          
          // Generate layout image URL if available
          if (venueData.layout_image) {
            try {
              const layoutImageFilename = Array.isArray(venueData.layout_image) 
                ? venueData.layout_image[0] 
                : venueData.layout_image;
              venueData.layout_image_url = pb.files.getUrl(venueData, layoutImageFilename);
            } catch (urlError) {
              console.error('Failed to generate layout image URL:', urlError);
              venueData.layout_image_url = getPocketBaseFileUrl(venueData, venueData.layout_image);
            }
          }
          
          // Load tables for the venue
          try {
            const venueId = typeof venueData.id === 'string' ? venueData.id : venueData;
            let tablesData: any[] = [];
            
            try {
              tablesData = await pb.collection('tables').getFullList({
                filter: `venue_id="${venueId}"`,
                sort: 'section,name',
              });
            } catch {
              try {
                tablesData = await pb.collection('tables').getFullList({
                  filter: `venue_id.id="${venueId}"`,
                  sort: 'section,name',
                });
              } catch {
                const allTables = await pb.collection('tables').getFullList();
                tablesData = allTables.filter((t: any) => {
                  const tableVenueId = typeof t.venue_id === 'string' ? t.venue_id : (t.venue_id?.id || t.venue_id || '');
                  return tableVenueId === venueId;
                });
              }
            }
            
            setTables(tablesData);
          } catch (error) {
            console.error('Failed to load tables:', error);
          }
        }

        // Load ticket type
        const ticketTypeData = await pb.collection('ticket_types').getOne(ticketTypeId);
        setTicketType(ticketTypeData);

        // Load selected table IDs if this is a GA_TABLE event
        if (isGATable && ticketTypeData.table_ids) {
          try {
            const parsedTableIds = typeof ticketTypeData.table_ids === 'string' 
              ? JSON.parse(ticketTypeData.table_ids) 
              : ticketTypeData.table_ids;
            if (Array.isArray(parsedTableIds)) {
              setSelectedTableIds(parsedTableIds);
            }
          } catch (error) {
            console.error('Failed to parse table_ids:', error);
          }
        }

        // Populate form
        form.setValue('name', ticketTypeData.name || '');
        form.setValue('description', ticketTypeData.description || '');
        form.setValue('ticket_type_category', ticketTypeData.ticket_type_category || '');
        form.setValue('base_price_minor', (ticketTypeData.base_price_minor / 100).toFixed(2));
        form.setValue('gst_rate', ticketTypeData.gst_rate?.toString() || '18');
        form.setValue('currency', ticketTypeData.currency || 'INR');
        form.setValue('initial_quantity', ticketTypeData.initial_quantity?.toString() || '');
        form.setValue('sales_start', new Date(ticketTypeData.sales_start).toISOString().slice(0, 16));
        form.setValue('sales_end', new Date(ticketTypeData.sales_end).toISOString().slice(0, 16));
        form.setValue('max_per_order', ticketTypeData.max_per_order?.toString() || '10');
        form.setValue('max_per_user_per_event', ticketTypeData.max_per_user_per_event?.toString() || '');
      } catch (error: any) {
        console.error('Failed to load data:', error);
        alert('Ticket type not found or access denied');
        router.push(`/organizer/events/${eventId}`);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId, ticketTypeId, router, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Validate ticket type category for GA_TABLE events
    if (isGATable && !values.ticket_type_category) {
      alert('Please select a ticket type category (GA or Table).');
      return;
    }

    // Validate table selection for GA_TABLE events when Table category is selected
    if (isGATable && values.ticket_type_category === 'TABLE' && selectedTableIds.length === 0) {
      alert('Please select at least one table for this ticket type.');
      return;
    }

    setSaving(true);
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();

      // Calculate GST and final price
      const basePriceMinor = Math.round(parseFloat(values.base_price_minor) * 100);
      const gstRate = parseFloat(values.gst_rate);
      const gstAmountMinor = Math.round((basePriceMinor * gstRate) / 100);
      const finalPriceMinor = basePriceMinor + gstAmountMinor;

      // Calculate remaining quantity adjustment
      const oldInitialQuantity = ticketType.initial_quantity;
      const newInitialQuantity = parseInt(values.initial_quantity);
      const quantityDifference = newInitialQuantity - oldInitialQuantity;
      const newRemainingQuantity = Math.max(0, ticketType.remaining_quantity + quantityDifference);

      const updateData: any = {
        name: values.name,
        description: values.description || '',
        base_price_minor: basePriceMinor,
        gst_rate: gstRate,
        gst_amount_minor: gstAmountMinor,
        final_price_minor: finalPriceMinor,
        currency: values.currency,
        initial_quantity: newInitialQuantity,
        remaining_quantity: newRemainingQuantity,
        sales_start: new Date(values.sales_start).toISOString(),
        sales_end: new Date(values.sales_end).toISOString(),
        max_per_order: values.max_per_order ? parseInt(values.max_per_order) : 10,
        max_per_user_per_event: values.max_per_user_per_event ? parseInt(values.max_per_user_per_event) : null,
      };

      // Update ticket_type_category if this is a GA_TABLE event
      if (isGATable && values.ticket_type_category) {
        updateData.ticket_type_category = values.ticket_type_category;
      }

      // Update table_ids if this is a GA_TABLE event with Table category
      if (isGATable && values.ticket_type_category === 'TABLE') {
        if (selectedTableIds.length > 0) {
          updateData.table_ids = JSON.stringify(selectedTableIds);
        } else {
          updateData.table_ids = null;
        }
      } else if (isGATable && values.ticket_type_category === 'GA') {
        // Clear table_ids if switching to GA
        updateData.table_ids = null;
      }

      await pb.collection('ticket_types').update(ticketTypeId, updateData);

      alert('Ticket type updated successfully!');
      router.push(`/organizer/events/${eventId}`);
    } catch (error: any) {
      console.error('Failed to update ticket type:', error);
      alert(`Error: ${error.message || 'Failed to update ticket type'}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!event || !ticketType) {
    return null;
  }

  // Calculate preview values
  const basePrice = form.watch('base_price_minor') ? parseFloat(form.watch('base_price_minor')) : 0;
  const gstRate = form.watch('gst_rate') ? parseFloat(form.watch('gst_rate')) : 0;
  const gstAmount = (basePrice * gstRate) / 100;
  const finalPrice = basePrice + gstAmount;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Edit Ticket Type</h1>
            <p className="text-gray-600 mt-2">For event: {event.name}</p>
          </div>
          <Link href={`/organizer/events/${eventId}`}>
            <Button variant="outline">Back to Event</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ticket Type Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Ticket Type Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="e.g., Early Bird, VIP, General Admission"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Optional description for this ticket type"
                  rows={3}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
                )}
              </div>

              {/* Ticket Type Category for GA_TABLE Events */}
              {isGATable && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="ticket_type_category" className="text-base font-semibold text-blue-900">
                      Ticket Type Category * <span className="text-red-500">(Required)</span>
                    </Label>
                    <Select
                      value={form.watch('ticket_type_category') || ''}
                      onValueChange={(value) => {
                        form.setValue('ticket_type_category', value);
                        // Clear table selection when switching to GA
                        if (value === 'GA') {
                          setSelectedTableIds([]);
                        }
                      }}
                    >
                      <SelectTrigger id="ticket_type_category" className="bg-white">
                        <SelectValue placeholder="Select ticket type category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GA">
                          <div className="flex flex-col">
                            <span className="font-semibold">General Admission (GA)</span>
                            <span className="text-xs text-gray-500">No table assignment required</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="TABLE">
                          <div className="flex flex-col">
                            <span className="font-semibold">Table</span>
                            <span className="text-xs text-gray-500">Requires table selection during checkout</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-blue-700">
                      {form.watch('ticket_type_category') === 'GA' 
                        ? '✓ This ticket type is for general admission without table assignment. Customers will not select tables.'
                        : form.watch('ticket_type_category') === 'TABLE'
                        ? '✓ This ticket type requires customers to select a table during checkout. You must select available tables below.'
                        : '⚠️ Please select whether this ticket type requires table selection or is general admission.'}
                    </p>
                    {form.formState.errors.ticket_type_category && (
                      <p className="text-sm text-red-600">{form.formState.errors.ticket_type_category.message}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price_minor">Base Price (₹) *</Label>
                  <Input
                    id="base_price_minor"
                    type="number"
                    step="0.01"
                    {...form.register('base_price_minor')}
                    placeholder="0.00"
                    min="0"
                  />
                  {form.formState.errors.base_price_minor && (
                    <p className="text-sm text-red-600">{form.formState.errors.base_price_minor.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_rate">GST Rate (%) *</Label>
                  <Input
                    id="gst_rate"
                    type="number"
                    step="0.01"
                    {...form.register('gst_rate')}
                    placeholder="18"
                    min="0"
                    max="100"
                  />
                  {form.formState.errors.gst_rate && (
                    <p className="text-sm text-red-600">{form.formState.errors.gst_rate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Input
                    id="currency"
                    {...form.register('currency')}
                    placeholder="INR"
                  />
                  {form.formState.errors.currency && (
                    <p className="text-sm text-red-600">{form.formState.errors.currency.message}</p>
                  )}
                </div>
              </div>

              {/* Price Preview */}
              {basePrice > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Price Breakdown:</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Base Price:</span>
                      <span>₹{basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST ({gstRate}%):</span>
                      <span>₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Final Price:</span>
                      <span>₹{finalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initial_quantity">Initial Quantity *</Label>
                  <Input
                    id="initial_quantity"
                    type="number"
                    {...form.register('initial_quantity')}
                    placeholder="100"
                    min="1"
                  />
                  <p className="text-xs text-gray-500">
                    Current remaining: {ticketType.remaining_quantity} / {ticketType.initial_quantity}
                  </p>
                  {form.formState.errors.initial_quantity && (
                    <p className="text-sm text-red-600">{form.formState.errors.initial_quantity.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_per_order">Max Per Order</Label>
                  <Input
                    id="max_per_order"
                    type="number"
                    {...form.register('max_per_order')}
                    placeholder="10"
                    min="1"
                  />
                  {form.formState.errors.max_per_order && (
                    <p className="text-sm text-red-600">{form.formState.errors.max_per_order.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_per_user_per_event">Max Per User Per Event (Optional)</Label>
                <Input
                  id="max_per_user_per_event"
                  type="number"
                  {...form.register('max_per_user_per_event')}
                  placeholder="Leave empty for no limit"
                  min="1"
                />
                <p className="text-xs text-gray-500">Overall cap per user for this event across all orders</p>
                {form.formState.errors.max_per_user_per_event && (
                  <p className="text-sm text-red-600">{form.formState.errors.max_per_user_per_event.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales_start">Sales Start Date & Time *</Label>
                  <Input
                    id="sales_start"
                    type="datetime-local"
                    {...form.register('sales_start')}
                  />
                  {form.formState.errors.sales_start && (
                    <p className="text-sm text-red-600">{form.formState.errors.sales_start.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales_end">Sales End Date & Time *</Label>
                  <Input
                    id="sales_end"
                    type="datetime-local"
                    {...form.register('sales_end')}
                  />
                  {form.formState.errors.sales_end && (
                    <p className="text-sm text-red-600">{form.formState.errors.sales_end.message}</p>
                  )}
                </div>
              </div>

              {/* Table Selection for GA_TABLE Events with Table Category */}
              {isGATable && form.watch('ticket_type_category') === 'TABLE' && (
                <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-teal-900 mb-1">Select Available Tables *</h3>
                      <p className="text-sm text-teal-700">
                        Choose which tables are available for this ticket type. Customers will be able to select from these tables when purchasing tickets.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedTableIds.length === tables.length) {
                            setSelectedTableIds([]);
                          } else {
                            setSelectedTableIds(tables.map((t) => t.id));
                          }
                        }}
                      >
                        {selectedTableIds.length === tables.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  </div>
                  {tables.length > 0 ? (
                    <div>
                      <Tabs value={tableViewMode} onValueChange={(v) => setTableViewMode(v as 'list' | 'map')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="list">📋 List View</TabsTrigger>
                          <TabsTrigger value="map">🗺️ Map View</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="list" className="space-y-3">
                          <div className="max-h-64 overflow-y-auto border border-teal-200 rounded p-3 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {tables.map((table) => {
                                const isSelected = selectedTableIds.includes(table.id);
                                return (
                                  <div
                                    key={table.id}
                                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-gray-200 bg-white hover:border-teal-300'
                                    }`}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedTableIds(selectedTableIds.filter((id) => id !== table.id));
                                      } else {
                                        setSelectedTableIds([...selectedTableIds, table.id]);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedTableIds([...selectedTableIds, table.id]);
                                          } else {
                                            setSelectedTableIds(selectedTableIds.filter((id) => id !== table.id));
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="flex-1">
                                        <div className="font-semibold text-sm">🪑 {table.name}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                          👥 {table.capacity} {table.capacity === 1 ? 'person' : 'people'}
                                        </div>
                                        {table.section && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            📍 Section: {table.section}
                                          </div>
                                        )}
                                        {table.features && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            ✨ {table.features}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="map" className="space-y-3">
                          <div className="relative border-2 border-teal-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden" style={{ height: '500px', minHeight: '500px' }}>
                            {/* Floor Plan Background */}
                            {venue?.layout_image && (
                              <img
                                src={venue.layout_image_url || getPocketBaseFileUrl(venue, venue.layout_image)}
                                alt="Floor Plan"
                                className="absolute inset-0 w-full h-full object-contain z-0"
                                style={{ opacity: 0.3 }}
                              />
                            )}
                            
                            {/* Tables on Map */}
                            <div className="relative z-10 w-full h-full">
                              {tables.map((table, index) => {
                                const isSelected = selectedTableIds.includes(table.id);
                                // Calculate position - use stored position or generate grid layout
                                const cols = Math.ceil(Math.sqrt(tables.length));
                                const row = Math.floor(index / cols);
                                const col = index % cols;
                                const x = table.position_x ?? (col * 120) + 50;
                                const y = table.position_y ?? (row * 100) + 50;
                                
                                return (
                                  <button
                                    key={table.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedTableIds(selectedTableIds.filter((id) => id !== table.id));
                                      } else {
                                        setSelectedTableIds([...selectedTableIds, table.id]);
                                      }
                                    }}
                                    className={`absolute px-3 py-2 text-xs font-medium rounded-lg border-2 shadow-md transition-all ${
                                      isSelected
                                        ? 'bg-teal-600 text-white border-teal-700 ring-2 ring-teal-400 ring-offset-1 z-20 scale-110'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400 hover:bg-teal-50 z-10'
                                    }`}
                                    style={{
                                      left: `${x}px`,
                                      top: `${y}px`,
                                      minWidth: '80px',
                                    }}
                                    title={`${table.name} - ${table.section || 'Main'} (Capacity: ${table.capacity})`}
                                  >
                                    <div className="flex flex-col items-center">
                                      <span className="font-bold">🪑 {table.name}</span>
                                      <span className="text-[10px] mt-0.5">👥 {table.capacity}</span>
                                      {table.section && (
                                        <span className="text-[9px] opacity-75">{table.section}</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                              
                              {tables.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                  <p>No tables available</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs bg-white p-2 rounded border border-teal-200">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                              <span>Available</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 bg-teal-600 rounded"></div>
                              <span>Selected</span>
                            </div>
                            <p className="text-teal-700 font-medium ml-auto">
                              Selected: {selectedTableIds.length} of {tables.length} tables
                            </p>
                          </div>
                        </TabsContent>
                      </Tabs>
                      
                      {selectedTableIds.length === 0 && (
                        <p className="text-sm text-red-600 mt-3">
                          ⚠️ Please select at least one table for this ticket type.
                        </p>
                      )}
                      <p className="text-xs text-teal-600 mt-2">
                        💡 Tip: Customers can select multiple tables based on ticket quantity. Each ticket requires one table. Use Map View to see table positions on the floor plan.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ No tables found for this venue. Please add tables in the venue management section.
                      </p>
                      <Link href={`/organizer/venues/${venue?.id || event.expand?.venue_id?.id || event.venue_id}/tables`}>
                        <Button variant="outline" size="sm" className="mt-2">
                          Manage Tables
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Ticket Type'}
                </Button>
                <Link href={`/organizer/events/${eventId}`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

