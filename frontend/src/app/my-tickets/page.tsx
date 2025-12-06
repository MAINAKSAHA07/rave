'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Loading from '@/components/Loading';
import BottomNavigation from '@/components/BottomNavigation';

interface Ticket {
  id: string;
  ticket_code: string;
  status: string;
  event_id: string;
  ticket_type_id: string;
  order_id: string;
  seat_id?: string;
  table_id?: string;
  expand?: {
    seat_id?: {
      id: string;
      section: string;
      row: string;
      seat_number: string;
      label: string;
    };
    table_id?: {
      id: string;
      name: string;
      capacity: number;
      section?: string;
    };
    event_id?: any;
    ticket_type_id?: {
      id: string;
      name: string;
      ticket_type_category?: 'GA' | 'TABLE';
    };
  };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount_minor: number;
  currency: string;
  event_id: string;
  payment_method?: string;
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [events, setEvents] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const pb = getPocketBase();
      const ticketsData = await pb.collection('tickets').getFullList({
        filter: `order_id.user_id="${user.id}"`,
        expand: 'order_id,event_id,ticket_type_id,seat_id,table_id',
      });

      setTickets(ticketsData as any);

      // Load orders and events
      const orderIds = [...new Set(ticketsData.map((t: any) => t.order_id))];
      const eventIds = [...new Set(ticketsData.map((t: any) => t.event_id))];

      const ordersMap: Record<string, Order> = {};
      for (const orderId of orderIds) {
        const order = await pb.collection('orders').getOne(String(orderId));
        ordersMap[String(orderId)] = order as any;
      }
      setOrders(ordersMap);

      const eventsMap: Record<string, any> = {};
      for (const eventId of eventIds) {
        const event = await pb.collection('events').getOne(String(eventId));
        eventsMap[String(eventId)] = event;
      }
      setEvents(eventsMap);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  function downloadTicket(ticket: Ticket) {
    // Only allow download for issued or checked_in tickets
    if (ticket.status !== 'issued' && ticket.status !== 'checked_in') {
      alert('Ticket can only be downloaded after payment is confirmed and ticket is issued.');
      return;
    }

    // Create a printable/downloadable version of the ticket
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const event = events[ticket.event_id];
    const order = orders[ticket.order_id];
    const frontendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000';
    const qrUrl = `${frontendUrl}/t/${ticket.ticket_code}`;
    
    // Note: At this point, ticket.status is guaranteed to be 'issued' or 'checked_in' due to early return above

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${event?.name || 'Event'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .ticket { border: 2px solid #14b8a6; border-radius: 16px; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .qr-code { text-align: center; margin: 20px 0; }
            .details { margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .pending-notice { background: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .pending-notice p { margin: 5px 0; }
            .pending-title { color: #92400e; font-weight: bold; font-size: 16px; }
            .pending-text { color: #78350f; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h1>${event?.name || 'Event Ticket'}</h1>
            </div>
            <div class="details">
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">${getCurrentUser()?.name || getCurrentUser()?.email || 'Guest'}</span>
              </div>
              ${ticket.expand?.ticket_type_id?.ticket_type_category ? `
              <div class="detail-row">
                <span class="label">Type:</span>
                <span class="value">${ticket.expand.ticket_type_id.ticket_type_category}${ticket.expand?.table_id ? ` - Table ${ticket.expand.table_id.name}${ticket.expand.table_id.section ? ` (${ticket.expand.table_id.section})` : ''}` : ''}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${event?.start_date ? new Date(event.start_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'TBD'} - ${event?.end_date ? new Date(event.end_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${event?.event_date || event?.start_date ? new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Place:</span>
                <span class="value">${event?.venue_id?.name || 'Venue TBD'}, ${event?.city || ''}</span>
              </div>
              ${ticket.expand?.seat_id ? `
              <div class="detail-row">
                <span class="label">Seat:</span>
                <span class="value">${ticket.expand.seat_id.section} - Row ${ticket.expand.seat_id.row} - ${ticket.expand.seat_id.label}</span>
              </div>
              ` : ''}
              ${ticket.expand?.table_id ? `
              <div class="detail-row">
                <span class="label">Table:</span>
                <span class="value">${ticket.expand.table_id.name}${ticket.expand.table_id.section ? ` (${ticket.expand.table_id.section})` : ''}${ticket.expand.table_id.capacity ? ` - Capacity: ${ticket.expand.table_id.capacity}` : ''}</span>
              </div>
              ` : ''}
            </div>
            <div class="qr-code">
              <p>Scan this QR code or show this ticket at the event</p>
              <div id="qr"></div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <p><strong>Ticket ID: ${ticket.ticket_code}</strong></p>
              <p>Order #${order?.order_number || 'N/A'}</p>
            </div>
          </div>
          <script>
            // Generate QR code for issued tickets
            // Note: QR code generation would need to be handled by a library
            // For now, we'll show a placeholder or use the URL
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) {
    return <Loading />;
  }

  const frontendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000';

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <div className="max-w-[428px] mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-700 text-xl">
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Ticket</h1>
        </div>

        {tickets.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-3xl mx-auto mb-4">
              🎟️
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets yet</h3>
            <p className="text-gray-600 max-w-sm text-sm mb-6">
              You haven't purchased any tickets yet. Browse our events to find your next experience.
            </p>
            <Link href="/events">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                Browse Events
              </Button>
            </Link>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {tickets.map((ticket) => {
              const order = orders[ticket.order_id];
              const event = events[ticket.event_id];
              const qrUrl = `${frontendUrl}/t/${ticket.ticket_code}`;
              const isSelected = selectedTicket === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="bg-white border-2 border-teal-500 rounded-3xl overflow-hidden shadow-lg"
                >
                  {/* Event Banner */}
                  <div className="relative bg-gradient-to-br from-teal-500 to-emerald-500 p-6">
                    {event?.cover_image ? (
                      <img
                        src={getPocketBase().files.getUrl(event, event.cover_image)}
                        alt={event.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                      />
                    ) : null}
                    <div className="relative z-10">
                      <h2 className="text-xl font-bold text-white mb-2">{event?.name || 'Event'}</h2>
                      <p className="text-teal-100 text-sm">
                        {event?.event_date || event?.start_date
                          ? new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }).toUpperCase()
                          : 'DATE TBD'}
                      </p>
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Name</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {getCurrentUser()?.name || getCurrentUser()?.email?.split('@')[0] || 'Guest'}
                        </p>
                      </div>
                      {ticket.expand?.ticket_type_id?.ticket_type_category && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Type</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {ticket.expand.ticket_type_id.ticket_type_category}
                            {ticket.expand?.table_id && (
                              <span className="ml-1 text-xs font-normal text-gray-600">
                                - Table {ticket.expand.table_id.name}
                                {ticket.expand.table_id.section && ` (${ticket.expand.table_id.section})`}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Time</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {event?.start_date
                            ? new Date(event.start_date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'TBD'}{' '}
                          -{' '}
                          {event?.end_date
                            ? new Date(event.end_date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'TBD'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Date</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {event?.event_date || event?.start_date
                            ? new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : 'TBD'}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Place</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {event?.venue_id?.name || 'Venue TBD'}, {event?.city || ''}
                      </p>
                    </div>

                    {/* Seat/Table Information */}
                    {ticket.expand?.seat_id && (
                      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-xs text-blue-600 mb-1 font-semibold">💺 Seat Assignment</p>
                        <p className="text-sm font-semibold text-blue-900">
                          {ticket.expand.seat_id.section} - Row {ticket.expand.seat_id.row} - {ticket.expand.seat_id.label}
                        </p>
                      </div>
                    )}
                    {ticket.expand?.table_id && (
                      <div className="mb-4 bg-teal-50 border border-teal-200 rounded-xl p-3">
                        <p className="text-xs text-teal-600 mb-1 font-semibold">🪑 Table Assignment</p>
                        <p className="text-sm font-semibold text-teal-900">
                          Table: {ticket.expand.table_id.name}
                          {ticket.expand.table_id.section && ` (${ticket.expand.table_id.section})`}
                          {ticket.expand.table_id.capacity && ` - Capacity: ${ticket.expand.table_id.capacity}`}
                        </p>
                      </div>
                    )}

                    {/* QR Code Section - Only show for issued or checked_in tickets */}
                    {ticket.status === 'issued' || ticket.status === 'checked_in' ? (
                      <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-center">
                        <p className="text-xs text-gray-600 mb-3">
                          Scan this QR code or show this ticket at the event
                        </p>
                        <div className="flex justify-center mb-3">
                          <div className="bg-white p-3 rounded-xl">
                            <QRCodeSVG value={qrUrl} size={120} />
                          </div>
                        </div>
                        <p className="text-xs font-mono text-gray-700">
                          <strong>Ticket ID: {ticket.ticket_code}</strong>
                        </p>
                      </div>
                    ) : ticket.status === 'pending' ? (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 mb-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-2xl mr-2">⏳</span>
                          <p className="text-sm font-semibold text-yellow-800">Payment Pending</p>
                        </div>
                        <p className="text-xs text-yellow-700 mb-2">
                          Your ticket will be issued once payment is confirmed.
                        </p>
                        <p className="text-xs font-mono text-gray-700">
                          <strong>Ticket ID: {ticket.ticket_code}</strong>
                        </p>
                        {order?.status === 'pending' && order?.payment_method === 'cash' && (
                          <p className="text-xs text-yellow-600 mt-2">
                            Waiting for cash payment confirmation at venue
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 mb-4 text-center">
                        <p className="text-xs text-gray-600 mb-2">
                          Ticket Status: <span className="font-semibold uppercase">{ticket.status.replace('_', ' ')}</span>
                        </p>
                        <p className="text-xs font-mono text-gray-700">
                          <strong>Ticket ID: {ticket.ticket_code}</strong>
                        </p>
                      </div>
                    )}

                    {/* Download Button - Only show for issued or checked_in tickets */}
                    {(ticket.status === 'issued' || ticket.status === 'checked_in') && (
                      <Button
                        onClick={() => downloadTicket(ticket)}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      >
                        <span>📥</span>
                        Download Ticket
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
