'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPocketBase } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function EventsPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchEvents() {
            const pb = getPocketBase();
            const user = pb.authStore.model;

            if (!user) return;

            try {
                const staffRecord = await pb.collection('organizer_staff').getFirstListItem(`user_id="${user.id}"`);
                const organizerId = staffRecord.organizer_id;

                const records = await pb.collection('events').getFullList({
                    filter: `organizer_id="${organizerId}"`,
                    sort: '-created',
                    expand: 'venue_id',
                });
                setEvents(records);
            } catch (error) {
                console.error('Failed to fetch events:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchEvents();
    }, []);

    if (loading) {
        return <div className="p-8">Loading events...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Events</h1>
                <Link href="/organizer/events/new">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Event
                    </Button>
                </Link>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-white/5 border-b border-white/10">
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-gray-300">Name</TableHead>
                            <TableHead className="text-gray-300">Date</TableHead>
                            <TableHead className="text-gray-300">Venue</TableHead>
                            <TableHead className="text-gray-300">Status</TableHead>
                            <TableHead className="text-gray-300">Category</TableHead>
                            <TableHead className="text-right text-gray-300">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.length === 0 ? (
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                    No events found. Create your first event!
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((event) => (
                                <TableRow key={event.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-medium text-white">{event.name}</TableCell>
                                    <TableCell className="text-gray-300">{format(new Date(event.start_date), 'PPP p')}</TableCell>
                                    <TableCell className="text-gray-300">{event.expand?.venue_id?.name || 'Unknown Venue'}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs border ${event.status === 'published'
                                                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                                : event.status === 'draft'
                                                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                                            }`}>
                                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="capitalize text-gray-300">{event.category}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/organizer/events/${event.id}`}>
                                                <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-white/10">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
