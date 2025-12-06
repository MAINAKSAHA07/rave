'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Loading from '@/components/Loading';

interface Ticket {
  id: string;
  ticket_code: string;
  status: string;
  event_id: string;
  ticket_type_id: string;
  order_id: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount_minor: number;
  currency: string;
  event_id: string;
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [events, setEvents] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      const user = getCurrentUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const pb = getPocketBase();
      const ticketsData = await pb.collection('tickets').getFullList({
        filter: `order_id.user_id="${user.id}"`,
        expand: 'order_id,event_id,ticket_type_id',
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

  if (loading) {
    return <Loading />;
  }

  const frontendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000';

  return (
    <div className="min-h-screen p-4">
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Tickets
          </h1>
          <p className="text-gray-600 mt-1 text-sm">View and manage your event tickets</p>
        </div>

        {tickets.length === 0 ? (
          <Card className="bg-white border border-gray-200 shadow-sm p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-3xl">
                🎟️
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No tickets yet</h3>
              <p className="text-gray-600 max-w-sm text-sm">
                You haven't purchased any tickets yet. Browse our events to find your next experience.
              </p>
              <Link href="/events">
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white">
                  Browse Events
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const order = orders[ticket.order_id];
              const event = events[ticket.event_id];
              const qrUrl = `${frontendUrl}/t/${ticket.ticket_code}`;

              return (
                <Card key={ticket.id} className="bg-white border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex flex-col">
                    {/* Event Image */}
                    <div className="relative h-48">
                      {event?.cover_image ? (
                        <img
                          src={getPocketBase().files.getUrl(event, event.cover_image)}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Ticket Details */}
                    <div className="p-4 flex flex-col gap-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h2 className="text-lg font-bold mb-1 text-gray-900">{event?.name}</h2>
                          <p className="text-purple-600 font-medium text-sm">
                            {event && new Date(event.start_date).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {event?.venue_id?.name || 'Venue TBD'} • {event?.city}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${ticket.status === 'issued'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : ticket.status === 'checked_in'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                        >
                          {ticket.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-col justify-between items-start gap-4 pt-2 border-t border-gray-100">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">Order #{order?.order_number}</p>
                          <p className="text-xs font-mono text-gray-700">Code: {ticket.ticket_code}</p>
                        </div>

                        {ticket.status === 'issued' && (
                          <div className="bg-white p-2 rounded-lg border border-gray-200">
                            <QRCodeSVG value={qrUrl} size={80} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

