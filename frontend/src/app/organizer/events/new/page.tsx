'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    venue_id: z.string().min(1, 'Venue is required'),
    city: z.string().min(1, 'City is required'),
});

export default function CreateEventPage() {
    const router = useRouter();
    const [venues, setVenues] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [coverImage, setCoverImage] = useState<File | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            category: '',
            start_date: '',
            end_date: '',
            venue_id: '',
            city: '',
        },
    });

    useEffect(() => {
        async function fetchVenues() {
            const pb = getPocketBase();
            const user = pb.authStore.model;

            if (!user) return;

            try {
                const staffRecord = await pb.collection('organizer_staff').getFirstListItem(`user_id="${user.id}"`);
                const organizerId = staffRecord.organizer_id;

                const records = await pb.collection('venues').getFullList({
                    filter: `organizer_id="${organizerId}"`,
                });
                setVenues(records);
            } catch (error) {
                console.error('Failed to fetch venues:', error);
            }
        }

        fetchVenues();
    }, []);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        const pb = getPocketBase();
        const user = pb.authStore.model;

        if (!user) return;

        try {
            const staffRecord = await pb.collection('organizer_staff').getFirstListItem(`user_id="${user.id}"`);
            const organizerId = staffRecord.organizer_id;

            const formData = new FormData();
            formData.append('organizer_id', organizerId);
            formData.append('name', values.name);
            formData.append('description', values.description || '');
            formData.append('category', values.category);
            formData.append('start_date', new Date(values.start_date).toISOString());
            formData.append('end_date', new Date(values.end_date).toISOString());
            formData.append('venue_id', values.venue_id);
            formData.append('city', values.city);
            formData.append('status', 'draft');

            if (coverImage) {
                formData.append('cover_image', coverImage);
            }

            await pb.collection('events').create(formData);
            router.push('/organizer/events');
        } catch (error) {
            console.error('Failed to create event:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Create Event</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Summer Music Festival" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Tell us about your event..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                </FormControl>
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
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Mumbai" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="start_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date</FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="end_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Date</FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="venue_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Venue</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select venue" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {venues.map((venue) => (
                                                    <SelectItem key={venue.id} value={venue.id}>
                                                        {venue.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div>
                                <Label htmlFor="cover_image">Cover Image</Label>
                                <Input
                                    id="cover_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Event'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
