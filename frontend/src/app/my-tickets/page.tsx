'use client';

import { useEffect, useState } from 'react';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

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
        const order = await pb.collection('orders').getOne(orderId);
        ordersMap[orderId] = order as any;
      }
      setOrders(ordersMap);

      const eventsMap: Record<string, any> = {};
      for (const eventId of eventIds) {
        const event = await pb.collection('events').getOne(eventId);
        eventsMap[eventId] = event;
      }
      setEvents(eventsMap);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading tickets...</div>;
  }

  const frontendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:3000';

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">My Tickets</h1>

        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">You don't have any tickets yet</p>
            <Link href="/events" className="text-blue-600 hover:underline">
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => {
              const order = orders[ticket.order_id];
              const event = events[ticket.event_id];
              const qrUrl = `${frontendUrl}/t/${ticket.ticket_code}`;

              return (
                <div key={ticket.id} className="border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold">{event?.name}</h2>
                      <p className="text-gray-600">
                        {event && new Date(event.start_date).toLocaleDateString('en-IN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Order: {order?.order_number} • Ticket: {ticket.ticket_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          ticket.status === 'issued'
                            ? 'bg-green-100 text-green-800'
                            : ticket.status === 'checked_in'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  {ticket.status === 'issued' && (
                    <div className="mt-6 flex justify-center">
                      <div className="bg-white p-4 rounded border">
                        <QRCodeSVG value={qrUrl} size={200} />
                        <p className="text-center text-sm mt-2 text-gray-600">
                          {ticket.ticket_code}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

