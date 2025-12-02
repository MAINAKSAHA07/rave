'use client';

import { useEffect, useState, useRef } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function OrganizerTicketsPage() {
  const [user, setUser] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const loadingRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      const currentUser = getCurrentUser();
      if (!currentUser) {
        window.location.href = '/login';
        return;
      }

      setUser(currentUser);
      const pb = getPocketBase();

      // Super Admin or Admin: Show all tickets
      if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
        const [ticketsData, eventsData] = await Promise.all([
          pb.collection('tickets').getFullList({
            sort: '-created',
            expand: 'order_id,event_id,ticket_type_id,seat_id',
          }),
          pb.collection('events').getFullList(),
        ]);
        setTickets(ticketsData as any);
        setEvents(eventsData as any);
        setOrganizer({ 
          name: currentUser.role === 'super_admin' ? 'Super Admin View' : 'Admin View',
        });
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Try to find organizer staff association
      try {
        const staff = await pb.collection('organizer_staff').getFirstListItem(
          `user_id="${currentUser.id}" && status="active"`
        );

        const organizerData = await pb.collection('organizers').getOne(staff.organizer_id);
        setOrganizer(organizerData);

        // Get events for this organizer
        const eventsData = await pb.collection('events').getFullList({
          filter: `organizer_id="${organizerData.id}"`,
          sort: '-created',
        });
        setEvents(eventsData as any);

        // Get tickets for events belonging to this organizer
        const eventIds = eventsData.map((e: any) => e.id);
        if (eventIds.length > 0) {
          const filter = eventIds.map((id: string) => `event_id="${id}"`).join(' || ');
          const ticketsData = await pb.collection('tickets').getFullList({
            filter,
            sort: '-created',
            expand: 'order_id.user_id,order_id,event_id,ticket_type_id,seat_id',
          });
          setTickets(ticketsData as any);
        } else {
          setTickets([]);
        }
      } catch (staffError: any) {
        if (staffError?.isAbort) {
          return;
        }
        console.error('Failed to load organizer data:', staffError);
        setTickets([]);
        setEvents([]);
      }
    } catch (error: any) {
      if (error?.isAbort) {
        return;
      }
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesEvent = filterEvent === 'all' || ticket.event_id === filterEvent;
    const matchesSearch = 
      ticket.ticket_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.expand?.order_id?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.expand?.event_id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.expand?.order_id?.expand?.user_id?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesEvent && matchesSearch;
  });

  const statusColors: Record<string, string> = {
    issued: 'bg-green-100 text-green-800',
    checked_in: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return <div className="p-8">Loading tickets...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Tickets</h1>
            <p className="text-gray-600 mt-2">
              {organizer ? `Tickets for ${organizer.name}` : 'View all tickets'}
            </p>
          </div>
          <Link href="/organizer/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by ticket code, order number, event, or customer email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-[200px]">
                <Select value={filterEvent} onValueChange={setFilterEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[200px]">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={loadData} variant="outline">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets ({filteredTickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Ticket Code</th>
                    <th className="text-left p-2">Order #</th>
                    <th className="text-left p-2">Customer Name</th>
                    <th className="text-left p-2">Customer Email</th>
                    <th className="text-left p-2">Customer Phone</th>
                    <th className="text-left p-2">Event</th>
                    <th className="text-left p-2">Ticket Type</th>
                    <th className="text-left p-2">Seat</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-4 text-center text-gray-500">
                        No tickets found.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-sm">{ticket.ticket_code}</td>
                        <td className="p-2 font-mono text-sm">
                          {ticket.expand?.order_id?.order_number || ticket.order_id || 'N/A'}
                        </td>
                        <td className="p-2 text-sm">
                          {ticket.expand?.order_id?.attendee_name || 
                           ticket.expand?.order_id?.expand?.user_id?.name || 
                           'N/A'}
                        </td>
                        <td className="p-2 text-sm">
                          {ticket.expand?.order_id?.attendee_email || 
                           ticket.expand?.order_id?.expand?.user_id?.email || 
                           ticket.expand?.order_id?.user_id || 
                           'N/A'}
                        </td>
                        <td className="p-2 text-sm">
                          {ticket.expand?.order_id?.attendee_phone || 
                           ticket.expand?.order_id?.expand?.user_id?.phone || 
                           'N/A'}
                        </td>
                        <td className="p-2">
                          <Link 
                            href={`/organizer/events/${ticket.event_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {ticket.expand?.event_id?.name || ticket.event_id || 'N/A'}
                          </Link>
                        </td>
                        <td className="p-2 text-sm">
                          {ticket.expand?.ticket_type_id?.name || ticket.ticket_type_id || 'N/A'}
                        </td>
                        <td className="p-2 text-sm">
                          {ticket.expand?.seat_id?.label || ticket.seat_id || 'GA'}
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            statusColors[ticket.status] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="p-2 text-sm text-gray-600">
                          {new Date(ticket.created).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2 items-center">
                            <a
                              href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/t/${ticket.ticket_code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View
                            </a>
                            {ticket.status === 'issued' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (confirm('Check in this ticket?')) {
                                    try {
                                      const pb = getPocketBase();
                                      const currentUser = getCurrentUser();
                                      if (!currentUser) return;
                                      
                                      await adminApi.checkinTicket(ticket.id);
                                      alert('Ticket checked in successfully!');
                                      loadData();
                                    } catch (err: any) {
                                      alert(`Error: ${err.response?.data?.error || err.message}`);
                                    }
                                  }
                                }}
                              >
                                Check In
                              </Button>
                            )}
                            {(ticket.status === 'pending' || ticket.status === 'issued') && (user?.role === 'admin' || user?.role === 'super_admin') && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  const reason = prompt('Enter cancellation reason (optional):');
                                  if (confirm('Cancel this ticket? This action cannot be undone.')) {
                                    try {
                                      await adminApi.cancelTicket(ticket.id, reason || undefined);
                                      alert('Ticket cancelled successfully!');
                                      loadData();
                                    } catch (err: any) {
                                      alert(`Error: ${err.response?.data?.error || err.message}`);
                                    }
                                  }
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

