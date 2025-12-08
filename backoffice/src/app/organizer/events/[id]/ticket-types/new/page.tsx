'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPocketBaseFileUrl } from '@/lib/utils';
import Link from 'next/link';
import Loading from '@/components/Loading';

const formSchema = z.object({
  name: z.string().min(1, 'Ticket type name is required'),
  description: z.string().optional(),
  ticket_type_category: z.string().optional(), // 'GA' or 'TABLE' - will be validated conditionally
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

export default function CreateTicketTypePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [isGATable, setIsGATable] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [venue, setVenue] = useState<any>(null);
  const [ticketCategory, setTicketCategory] = useState<string>('');

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
    async function loadEvent() {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();
      try {
        const eventData = await pb.collection('events').getOne(eventId, {
          expand: 'organizer_id,venue_id',
        });
        setEvent(eventData);

        // Check if venue is GA_TABLE
        const venueData = eventData.expand?.venue_id || eventData.venue_id;
        if (venueData && typeof venueData === 'object' && venueData.layout_type === 'GA_TABLE') {
          setIsGATable(true);
          setVenue(venueData);
          
          // Load tables for the venue - use the same logic as tables page
          try {
            const venueId = typeof venueData.id === 'string' ? venueData.id : venueData;
            let tablesData: any[] = [];
            
            // First try: Direct venue_id match (for string IDs)
            try {
              tablesData = await pb.collection('tables').getFullList({
                filter: `venue_id="${venueId}"`,
                sort: 'section,name',
              });
            } catch (filterError) {
              // If no results or error, try relation filter format
            }
            
            // If no results, try relation filter format (this works based on logs)
            if (tablesData.length === 0) {
              try {
                tablesData = await pb.collection('tables').getFullList({
                  filter: `venue_id.id="${venueId}"`,
                  sort: 'section,name',
                });
              } catch (relError) {
                // Fallback: load all and filter manually
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
            
            setTables(tablesData);
          } catch (error) {
            console.error('[CreateTicketType] Failed to load tables:', error);
          }
        }

        // Set default sales dates based on event dates
        if (eventData.start_date) {
          const startDate = new Date(eventData.start_date);
          startDate.setHours(0, 0, 0, 0);
          form.setValue('sales_start', startDate.toISOString().slice(0, 16));
        }
        if (eventData.end_date) {
          const endDate = new Date(eventData.end_date);
          endDate.setHours(23, 59, 59, 999);
          form.setValue('sales_end', endDate.toISOString().slice(0, 16));
        }
      } catch (error: any) {
        console.error('Failed to load event:', error);
        alert('Event not found or access denied');
        router.push('/organizer/events');
      }
    }

    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, router]);

  // Memoize callbacks to prevent infinite re-renders
  const handleCategoryChange = useCallback((value: string) => {
    setTicketCategory(value);
    form.setValue('ticket_type_category', value, { shouldDirty: true });
    // Clear table selection when switching to GA
    if (value === 'GA') {
      setSelectedTableIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // form.setValue is stable, no need for form in deps


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

    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();

      // Calculate GST and final price
      const basePriceMinor = Math.round(parseFloat(values.base_price_minor) * 100); // Convert to paise
      const gstRate = parseFloat(values.gst_rate);
      const gstAmountMinor = Math.round((basePriceMinor * gstRate) / 100);
      const finalPriceMinor = basePriceMinor + gstAmountMinor;

      const recordData: any = {
        event_id: eventId,
        name: values.name,
        description: values.description || '',
        base_price_minor: basePriceMinor,
        gst_rate: gstRate,
        gst_amount_minor: gstAmountMinor,
        final_price_minor: finalPriceMinor,
        currency: values.currency,
        initial_quantity: parseInt(values.initial_quantity),
        remaining_quantity: parseInt(values.initial_quantity), // Initially same as initial
        sales_start: new Date(values.sales_start).toISOString(),
        sales_end: new Date(values.sales_end).toISOString(),
        max_per_order: values.max_per_order ? parseInt(values.max_per_order) : 10,
        max_per_user_per_event: values.max_per_user_per_event ? parseInt(values.max_per_user_per_event) : null,
      };

      // Add ticket_type_category if this is a GA_TABLE event (required)
      if (isGATable) {
        if (values.ticket_type_category) {
          recordData.ticket_type_category = values.ticket_type_category;
        } else {
          console.warn('[CreateTicketType] WARNING: GA_TABLE event but no ticket_type_category selected!');
        }
      }

      // Add table_ids if this is a GA_TABLE event with Table category and tables are selected
      if (isGATable && values.ticket_type_category === 'TABLE' && selectedTableIds.length > 0) {
        recordData.table_ids = JSON.stringify(selectedTableIds);
      }

      const record = await pb.collection('ticket_types').create(recordData);

      alert('Ticket type created successfully!');
      router.push(`/organizer/events/${eventId}`);
    } catch (error: any) {
      console.error('Failed to create ticket type:', error);
      alert(`Error: ${error.message || 'Failed to create ticket type'}`);
    } finally {
      setLoading(false);
    }
  }

  if (!event) {
    return <Loading />;
  }

  // Use local state for category to prevent infinite re-renders
  // Calculate preview values - getValues doesn't cause re-renders
  const basePriceValue = form.getValues('base_price_minor');
  const gstRateValue = form.getValues('gst_rate');
  
  const basePrice = basePriceValue ? parseFloat(basePriceValue) : 0;
  const gstRate = gstRateValue ? parseFloat(gstRateValue) : 0;
  const gstAmount = (basePrice * gstRate) / 100;
  const finalPrice = basePrice + gstAmount;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Create Ticket Type</h1>
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
                      key="ticket-type-category-select"
                      value={ticketCategory || ''}
                      onValueChange={handleCategoryChange}
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
                      {ticketCategory === 'GA' 
                        ? '✓ This ticket type is for general admission without table assignment. Customers will not select tables.'
                        : ticketCategory === 'TABLE'
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
              {isGATable && ticketCategory === 'TABLE' && (
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
                      <div className="space-y-3">
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
                      </div>
                      
                      {selectedTableIds.length === 0 && (
                        <p className="text-sm text-red-600 mt-3">
                          ⚠️ Please select at least one table for this ticket type.
                        </p>
                      )}
                      <p className="text-xs text-teal-600 mt-2">
                        💡 Tip: Customers can select multiple tables based on ticket quantity. Each ticket requires one table. Click on tables in the map to select them.
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
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Ticket Type'}
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

