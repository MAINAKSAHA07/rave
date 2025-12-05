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
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(1, 'Ticket type name is required'),
  description: z.string().optional(),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
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
  }, [eventId, router, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
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

      const record = await pb.collection('ticket_types').create({
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
      });

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
    return <div className="p-8">Loading...</div>;
  }

  // Calculate preview values
  const basePrice = form.watch('base_price_minor') ? parseFloat(form.watch('base_price_minor')) : 0;
  const gstRate = form.watch('gst_rate') ? parseFloat(form.watch('gst_rate')) : 0;
  const gstAmount = (basePrice * gstRate) / 100;
  const finalPrice = basePrice + gstAmount;

  return (
    <div className="min-h-screen p-8 bg-gray-50">
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

