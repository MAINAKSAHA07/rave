'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const frontendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000';

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            My Tickets
          </h1>
          <p className="text-muted-foreground mt-2">View and manage your event tickets</p>
        </div>

        {tickets.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur-md border-white/10 shadow-xl p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
                🎟️
              </div>
              <h3 className="text-xl font-semibold">No tickets yet</h3>
              <p className="text-muted-foreground max-w-sm">
                You haven't purchased any tickets yet. Browse our events to find your next experience.
              </p>
              <Link href="/events">
                <Button className="mt-4 bg-primary hover:bg-primary/90 text-white">
                  Browse Events
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => {
              const order = orders[ticket.order_id];
              const event = events[ticket.event_id];
              const qrUrl = `${frontendUrl}/t/${ticket.ticket_code}`;

              return (
                <Card key={ticket.id} className="bg-card/50 backdrop-blur-md border-white/10 shadow-xl overflow-hidden group hover:border-primary/50 transition-colors">
                  <div className="flex flex-col md:flex-row">
                    {/* Event Image (Left) */}
                    <div className="md:w-1/3 relative h-48 md:h-auto">
                      {event?.cover_image ? (
                        <img
                          src={getPocketBase().files.getUrl(event, event.cover_image)}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground">No image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/50" />
                    </div>

                    {/* Ticket Details (Right) */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-2xl font-bold mb-1">{event?.name}</h2>
                          <p className="text-primary font-medium">
                            {event && new Date(event.start_date).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {event?.venue_id?.name || 'Venue TBD'} • {event?.city}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${ticket.status === 'issued'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : ticket.status === 'checked_in'
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                            }`}
                        >
                          {ticket.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>

                      <div className="mt-6 flex flex-col md:flex-row justify-between items-end gap-6">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Order #{order?.order_number}</p>
                          <p className="text-sm font-mono text-white/70">Code: {ticket.ticket_code}</p>
                        </div>

                        {ticket.status === 'issued' && (
                          <div className="bg-white p-2 rounded-lg shadow-lg">
                            <QRCodeSVG value={qrUrl} size={100} />
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

