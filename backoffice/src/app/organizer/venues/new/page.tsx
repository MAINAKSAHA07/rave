'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import Loading from '@/components/Loading';

const venueFormSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  capacity: z.string().min(1, 'Capacity is required').refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Capacity must be a positive number'),
  layout_type: z.enum(['GA', 'SEATED', 'GA_TABLE']),
  organizer_id: z.string().optional(), // Optional for admin users
});

export default function CreateVenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizer, setOrganizer] = useState<any>(null);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [layoutImage, setLayoutImage] = useState<File | null>(null);

  const form = useForm<z.infer<typeof venueFormSchema>>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      capacity: '',
      layout_type: 'GA',
      organizer_id: '',
    },
  });

  useEffect(() => {
    async function loadOrganizer() {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();

      // Super Admin or Admin: Can create venues for any organizer
      if (user.role === 'super_admin' || user.role === 'admin') {
        setIsAdmin(true);
        // Load all approved organizers for selection
        try {
          const allOrganizers = await pb.collection('organizers').getFullList({
            filter: 'status="approved"',
            sort: 'name',
          });
          setOrganizers(allOrganizers as any);
        } catch (error) {
          console.error('Failed to fetch organizers:', error);
        }
        return;
      }

      // Try to find organizer staff association
      try {
        const staff = await pb.collection('organizer_staff').getFirstListItem(
          `user_id="${user.id}" && status="active"`
        );

        const organizerData = await pb.collection('organizers').getOne(staff.organizer_id);
        setOrganizer(organizerData);
      } catch (error) {
        console.error('Failed to fetch organizer:', error);
        alert('You are not associated with an organizer account.');
        router.push('/organizer/dashboard');
      }
    }

    loadOrganizer();
  }, [router]);

  async function onSubmit(values: z.infer<typeof venueFormSchema>) {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();
      let organizerId: string;

      // Super Admin or Admin: Use selected organizer
      if (user.role === 'super_admin' || user.role === 'admin') {
        if (!values.organizer_id) {
          alert('Please select an organizer');
          setLoading(false);
          return;
        }
        organizerId = values.organizer_id;
      } else {
        // Get organizer from staff association
        const staff = await pb.collection('organizer_staff').getFirstListItem(
          `user_id="${user.id}" && status="active"`
        );
        organizerId = staff.organizer_id;
      }

      // Create FormData if we have a layout image, otherwise use regular object
      if (layoutImage) {
        const formData = new FormData();
        formData.append('organizer_id', organizerId);
        formData.append('name', values.name);
        formData.append('address', values.address);
        formData.append('city', values.city);
        formData.append('state', values.state);
        formData.append('pincode', values.pincode);
        formData.append('capacity', values.capacity);
        formData.append('layout_type', values.layout_type);
        formData.append('layout_image', layoutImage);
        
        const record = await pb.collection('venues').create(formData);
        alert('Venue created successfully!');
        router.push(`/organizer/venues/${record.id}`);
      } else {
        const record = await pb.collection('venues').create({
          organizer_id: organizerId,
          name: values.name,
          address: values.address,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          capacity: parseInt(values.capacity),
          layout_type: values.layout_type,
        });
        alert('Venue created successfully!');
        router.push(`/organizer/venues/${record.id}`);
      }

    } catch (error: any) {
      console.error('Failed to create venue:', error);
      alert(`Error: ${error.message || 'Failed to create venue'}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin && !organizer) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold">Create New Venue</h1>
          <Link href="/organizer/venues">
            <Button variant="outline">Back to Venues</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Venue Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="organizer_id">Organizer *</Label>
                  <Select
                    value={form.watch('organizer_id') || ''}
                    onValueChange={(value) => form.setValue('organizer_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an organizer" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizers.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.organizer_id && (
                    <p className="text-sm text-red-600">{form.formState.errors.organizer_id.message}</p>
                  )}
                  {organizers.length === 0 && (
                    <p className="text-sm text-yellow-600">
                      No approved organizers found. Please approve an organizer first.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Venue Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter venue name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  {...form.register('address')}
                  placeholder="Enter full address"
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    {...form.register('state')}
                    placeholder="Enter state"
                  />
                  {form.formState.errors.state && (
                    <p className="text-sm text-red-600">{form.formState.errors.state.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    {...form.register('pincode')}
                    placeholder="Enter pincode"
                  />
                  {form.formState.errors.pincode && (
                    <p className="text-sm text-red-600">{form.formState.errors.pincode.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    {...form.register('capacity')}
                    placeholder="Enter capacity"
                    min="1"
                  />
                  {form.formState.errors.capacity && (
                    <p className="text-sm text-red-600">{form.formState.errors.capacity.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="layout_type">Layout Type *</Label>
                  <Select
                    value={form.watch('layout_type')}
                    onValueChange={(value) => form.setValue('layout_type', value as 'GA' | 'SEATED' | 'GA_TABLE')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select layout type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GA">General Admission (GA)</SelectItem>
                      <SelectItem value="SEATED">Seated</SelectItem>
                      <SelectItem value="GA_TABLE">General Admission + Tables</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.layout_type && (
                    <p className="text-sm text-red-600">{form.formState.errors.layout_type.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="layout_image">Layout Image (Optional)</Label>
                <Input
                  id="layout_image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLayoutImage(file);
                  }}
                />
                <p className="text-sm text-gray-500">
                  Upload a floor plan or layout image for this venue (max 10MB, JPEG/PNG/WebP)
                </p>
                {layoutImage && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600">Selected: {layoutImage.name}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Venue'}
                </Button>
                <Link href="/organizer/venues">
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

