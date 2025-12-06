'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/pocketbase';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Loading from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminTicketsPage() {
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      window.location.href = '/admin';
      return;
    }

    setUser(currentUser);
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      setLoading(true);
      const response = await adminApi.getTickets();
      setTickets(response.data?.items || response.data || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesSearch = 
      ticket.ticket_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.expand?.order_id?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.expand?.event_id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.expand?.order_id?.expand?.user_id?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusColors: Record<string, string> = {
    issued: 'bg-green-100 text-green-800',
    checked_in: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Tickets Management</h1>
          <p className="text-gray-600">View and manage all tickets</p>
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
              <Button onClick={loadTickets} variant="outline">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>All Tickets ({filteredTickets.length})</CardTitle>
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
                            {ticket.status === 'issued' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (confirm('Check in this ticket?')) {
                                    try {
                                      await adminApi.checkinTicket(ticket.id);
                                      alert('Ticket checked in successfully!');
                                      loadTickets();
                                    } catch (err: any) {
                                      alert(`Error: ${err.response?.data?.error || err.message}`);
                                    }
                                  }
                                }}
                              >
                                Check In
                              </Button>
                            )}
                            {(ticket.status === 'pending' || ticket.status === 'issued') && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  const reason = prompt('Enter cancellation reason (optional):');
                                  if (confirm('Cancel this ticket? This action cannot be undone.')) {
                                    try {
                                      await adminApi.cancelTicket(ticket.id, reason || undefined);
                                      alert('Ticket cancelled successfully!');
                                      loadTickets();
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

