'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { getPocketBaseFileUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  category: z.enum(['concert', 'comedy', 'nightlife', 'workshop', 'sports', 'theatre', 'festival', 'other']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  venue_id: z.string().min(1, 'Venue is required'),
  city: z.string().min(1, 'City is required'),
  status: z.enum(['draft', 'published', 'cancelled']),
  about: z.string().optional(),
  overview: z.string().optional(),
  things_to_carry: z.string().optional(),
  inclusions: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  venue_details: z.string().optional(),
  organizer_info: z.string().optional(),
  tags: z.string().optional(),
});

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'concert',
      start_date: '',
      end_date: '',
      venue_id: '',
      city: '',
      status: 'draft',
      about: '',
      overview: '',
      things_to_carry: '',
      inclusions: '',
      terms_and_conditions: '',
      venue_details: '',
      organizer_info: '',
      tags: '',
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

      // Check if admin
      if (user.role === 'super_admin' || user.role === 'admin') {
        setIsAdmin(true);
        // Load all venues for admin
        try {
          const allVenues = await pb.collection('venues').getFullList({
            expand: 'organizer_id',
          });
          setVenues(allVenues as any);
        } catch (error) {
          console.error('Failed to fetch venues:', error);
        }
      } else {
        // Try to find organizer staff association
        try {
          const staff = await pb.collection('organizer_staff').getFirstListItem(
            `user_id="${user.id}" && status="active"`
          );

          const organizerData = await pb.collection('organizers').getOne(staff.organizer_id);

          const records = await pb.collection('venues').getFullList({
            filter: `organizer_id="${organizerData.id}"`,
          });
          setVenues(records as any);
        } catch (error) {
          console.error('Failed to fetch venues:', error);
        }
      }

      // Load event data
      try {
        const eventData = await pb.collection('events').getOne(eventId, {
          expand: 'organizer_id,venue_id',
        });
        setEvent(eventData);

        // Pre-populate form
        const startDate = new Date(eventData.start_date);
        const endDate = new Date(eventData.end_date);
        
        form.setValue('name', eventData.name);
        form.setValue('description', eventData.description || '');
        form.setValue('category', eventData.category);
        form.setValue('venue_id', eventData.venue_id);
        form.setValue('city', eventData.city);
        form.setValue('status', eventData.status);
        form.setValue('start_date', startDate.toISOString().slice(0, 16));
        form.setValue('end_date', endDate.toISOString().slice(0, 16));
        form.setValue('about', eventData.about || '');
        form.setValue('overview', eventData.overview || '');
        form.setValue('things_to_carry', eventData.things_to_carry || '');
        form.setValue('inclusions', eventData.inclusions || '');
        form.setValue('terms_and_conditions', eventData.terms_and_conditions || '');
        form.setValue('venue_details', eventData.venue_details || '');
        form.setValue('organizer_info', eventData.organizer_info || '');
        // Handle tags - convert JSON array to comma-separated string
        if (eventData.tags && Array.isArray(eventData.tags)) {
          form.setValue('tags', eventData.tags.join(', '));
        } else if (typeof eventData.tags === 'string') {
          try {
            const tagsArray = JSON.parse(eventData.tags);
            form.setValue('tags', Array.isArray(tagsArray) ? tagsArray.join(', ') : '');
          } catch {
            form.setValue('tags', '');
          }
        } else {
          form.setValue('tags', '');
        }

        // Load existing images
        if (eventData.images && Array.isArray(eventData.images)) {
          setExistingImages(eventData.images);
        }
      } catch (error: any) {
        console.error('Failed to load event:', error);
        alert('Event not found or access denied');
        router.push('/organizer/events');
      }
    }

    loadData();
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

      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('description', values.description || '');
      formData.append('category', values.category);
      formData.append('venue_id', values.venue_id);
      formData.append('start_date', new Date(values.start_date).toISOString());
      formData.append('end_date', new Date(values.end_date).toISOString());
      formData.append('city', values.city);
      formData.append('status', values.status);
      formData.append('about', values.about || '');
      formData.append('overview', values.overview || '');
      formData.append('things_to_carry', values.things_to_carry || '');
      formData.append('inclusions', values.inclusions || '');
      formData.append('terms_and_conditions', values.terms_and_conditions || '');
      formData.append('venue_details', values.venue_details || '');
      formData.append('organizer_info', values.organizer_info || '');
      
      // Handle tags - convert comma-separated string to JSON array
      if (values.tags) {
        const tagsArray = values.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        formData.append('tags', JSON.stringify(tagsArray));
      } else {
        formData.append('tags', JSON.stringify([]));
      }

      // Only update cover image if a new one is selected
      if (coverImage) {
        formData.append('cover_image', coverImage);
      }

      // Handle images: PocketBase requires sending all files that should remain
      // If we're removing images or adding new ones, we need to send the complete list
      if (imagesToRemove.length > 0 || images.length > 0) {
        // Keep existing images that aren't being removed
        const remainingImages = existingImages.filter(img => !imagesToRemove.includes(img));
        
        // Append remaining existing images (as file references)
        // Note: PocketBase may require a different approach - we'll try sending the filenames
        // For now, we'll append new images and let PocketBase handle the merge
        images.forEach((image) => {
          formData.append('images', image);
        });
        
        // If we're only removing (no new images), we need to send an empty array or handle differently
        // PocketBase might require us to delete and re-upload, but let's try this approach first
      } else {
        // No changes to images, don't include the field
      }

      await pb.collection('events').update(eventId, formData);

      alert('Event updated successfully!');
      router.push(`/organizer/events/${eventId}`);
    } catch (error: any) {
      console.error('Failed to update event:', error);
      alert(`Error: ${error.message || 'Failed to update event'}`);
    } finally {
      setLoading(false);
    }
  }

  if (!event) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Edit Event</h1>
            <p className="text-gray-600 mt-2">{event.name}</p>
          </div>
          <Link href={`/organizer/events/${eventId}`}>
            <Button variant="outline">Back to Event</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter event name"
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
                  placeholder="Enter event description"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">About the Event</Label>
                <Textarea
                  id="about"
                  {...form.register('about')}
                  placeholder="Provide detailed information about the event"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overview">Overview</Label>
                <Textarea
                  id="overview"
                  {...form.register('overview')}
                  placeholder="Provide an overview of what attendees can expect"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="things_to_carry">Things to Carry</Label>
                <Textarea
                  id="things_to_carry"
                  {...form.register('things_to_carry')}
                  placeholder="List items attendees should bring (one per line or comma-separated)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inclusions">Inclusions</Label>
                <Textarea
                  id="inclusions"
                  {...form.register('inclusions')}
                  placeholder="List what's included in the ticket (one per line or comma-separated)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms_and_conditions">Terms & Conditions</Label>
                <Textarea
                  id="terms_and_conditions"
                  {...form.register('terms_and_conditions')}
                  placeholder="Enter terms and conditions for the event"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue_details">Venue Details</Label>
                <Textarea
                  id="venue_details"
                  {...form.register('venue_details')}
                  placeholder="Additional venue information (parking, accessibility, etc.)"
                  rows={3}
                />
                <p className="text-sm text-gray-500">This supplements the venue information from the selected venue.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizer_info">Organizer Information</Label>
                <Textarea
                  id="organizer_info"
                  {...form.register('organizer_info')}
                  placeholder="Additional organizer information and contact details"
                  rows={3}
                />
                <p className="text-sm text-gray-500">This supplements the organizer information from your account.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  {...form.register('tags')}
                  placeholder="Enter tags separated by commas (e.g., music, live, outdoor)"
                />
                <p className="text-sm text-gray-500">Comma-separated tags to help users find your event</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={form.watch('category')}
                    onValueChange={(value) => form.setValue('category', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concert">Concert</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="nightlife">Nightlife</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="theatre">Theatre</SelectItem>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-red-600">{form.formState.errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value) => form.setValue('status', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.status && (
                    <p className="text-sm text-red-600">{form.formState.errors.status.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue_id">Venue *</Label>
                <Select
                  value={form.watch('venue_id')}
                  onValueChange={(value) => form.setValue('venue_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name} - {venue.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.venue_id && (
                  <p className="text-sm text-red-600">{form.formState.errors.venue_id.message}</p>
                )}
                {venues.length === 0 && (
                  <p className="text-sm text-yellow-600">
                    No venues found. <Link href="/organizer/venues/new" className="underline">Create a venue first</Link>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date & Time *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    {...form.register('start_date')}
                  />
                  {form.formState.errors.start_date && (
                    <p className="text-sm text-red-600">{form.formState.errors.start_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date & Time *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    {...form.register('end_date')}
                  />
                  {form.formState.errors.end_date && (
                    <p className="text-sm text-red-600">{form.formState.errors.end_date.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  placeholder="Enter city"
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-600">{form.formState.errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_image">Cover Image</Label>
                {event.cover_image && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-2">Current cover image:</p>
                    <img
                      src={getPocketBaseFileUrl(event, event.cover_image)}
                      alt={event.name}
                      className="w-48 h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
                <Input
                  id="cover_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverImage(file);
                    }
                  }}
                />
                <p className="text-sm text-gray-500">
                  {coverImage ? `New image selected: ${coverImage.name}` : 'Leave empty to keep current image. Max size: 5MB. Formats: JPEG, PNG, WebP'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">Additional Images</Label>
                
                {/* Show existing images */}
                {existingImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Current images ({existingImages.length}):</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={getPocketBaseFileUrl(event, img)}
                            alt={`Event image ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          {!imagesToRemove.includes(img) && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1"
                              onClick={() => setImagesToRemove([...imagesToRemove, img])}
                            >
                              ×
                            </Button>
                          )}
                          {imagesToRemove.includes(img) && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                              <span className="text-white text-sm">Removed</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {imagesToRemove.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setImagesToRemove([])}
                        className="mt-2"
                      >
                        Cancel Remove ({imagesToRemove.length})
                      </Button>
                    )}
                  </div>
                )}

                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setImages(files);
                  }}
                />
                <p className="text-sm text-gray-500">
                  You can select multiple images to add. Max size per image: 5MB. Formats: JPEG, PNG, WebP
                </p>
                {images.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium">New images to add ({images.length}):</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {images.map((img, idx) => (
                        <li key={idx}>{img.name}</li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setImages([])}
                      className="mt-2"
                    >
                      Clear New Images
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Event'}
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

