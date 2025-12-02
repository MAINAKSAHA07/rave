'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPocketBase } from '@/lib/pocketbase';
import { ordersApi } from '@/lib/api';
import Script from 'next/script';

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  start_date: string;
  end_date: string;
  city: string;
  cover_image?: string;
  venue_id: string;
  organizer_id: string;
}

interface TicketType {
  id: string;
  name: string;
  description: string;
  final_price_minor: number;
  currency: string;
  remaining_quantity: number;
  max_per_order: number;
}

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cash'>('razorpay');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      const pb = getPocketBase();
      const eventData = await pb.collection('events').getOne(eventId, {
        expand: 'venue_id,organizer_id',
      });
      setEvent(eventData as any);

      const ticketTypesData = await pb.collection('ticket_types').getFullList({
        filter: `event_id="${eventId}"`,
      });
      setTicketTypes(ticketTypesData as any);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleTicketChange(ticketTypeId: string, quantity: number) {
    setSelectedTickets({ ...selectedTickets, [ticketTypeId]: quantity });
  }

  async function handleCheckout() {
    const pb = getPocketBase();
    const user = pb.authStore.model;

    if (!user) {
      if (confirm('You need to login to purchase tickets. Redirect to login page?')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }

    const ticketItems = Object.entries(selectedTickets)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({
        ticketTypeId,
        quantity,
      }));

    if (ticketItems.length === 0) {
      alert('Please select at least one ticket');
      return;
    }

    try {
      const response = await ordersApi.create({
        userId: user.id,
        eventId,
        ticketItems,
        paymentMethod,
      });

      const { razorpayOrder, order } = response.data;

      // Handle cash payments
      if (paymentMethod === 'cash') {
        alert('Order created successfully! Please pay cash at the venue. Your order number is: ' + order.order_number);
        window.location.href = '/my-tickets';
        return;
      }

      // Handle Razorpay payments
      if (!razorpayOrder) {
        throw new Error('Razorpay order not created');
      }

      // Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Rave Ticketing',
        description: event?.name,
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          try {
            // Confirm payment on backend
            await ordersApi.confirmRazorpay(
              order.id,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            
            alert('Payment successful! Check your email for tickets with QR codes.');
            window.location.href = '/my-tickets';
          } catch (error: any) {
            console.error('Failed to confirm payment:', error);
            alert('Payment successful but confirmation failed. Your tickets will be issued shortly via webhook. Check your email.');
            window.location.href = '/my-tickets';
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        theme: {
          color: '#3399cc',
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Checkout failed:', error);
      alert(error.response?.data?.error || error.message || 'Checkout failed');
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!event) {
    return <div className="p-8">Event not found</div>;
  }

  const totalAmount = ticketTypes.reduce((sum, tt) => {
    const qty = selectedTickets[tt.id] || 0;
    return sum + tt.final_price_minor * qty;
  }, 0);

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          {event.cover_image && (
            <img
              src={getPocketBase().files.getUrl(event as any, event.cover_image)}
              alt={event.name}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
          <p className="text-gray-600 mb-4">{event.category} • {event.city}</p>
          <p className="mb-6">
            {new Date(event.start_date).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Description</h2>
            <p className="whitespace-pre-wrap">{event.description}</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Tickets</h2>
            <div className="space-y-4">
              {ticketTypes.map((tt) => (
                <div key={tt.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{tt.name}</h3>
                      {tt.description && <p className="text-sm text-gray-600">{tt.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ₹{(tt.final_price_minor / 100).toFixed(2)} <span className="text-xs text-gray-500">(incl. GST)</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        {tt.remaining_quantity} available
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() =>
                        handleTicketChange(tt.id, Math.max(0, (selectedTickets[tt.id] || 0) - 1))
                      }
                      className="px-3 py-1 border rounded"
                      disabled={(selectedTickets[tt.id] || 0) === 0}
                    >
                      -
                    </button>
                    <span>{selectedTickets[tt.id] || 0}</span>
                    <button
                      onClick={() =>
                        handleTicketChange(
                          tt.id,
                          Math.min(tt.remaining_quantity, (selectedTickets[tt.id] || 0) + 1)
                        )
                      }
                      className="px-3 py-1 border rounded"
                      disabled={
                        (selectedTickets[tt.id] || 0) >= tt.remaining_quantity ||
                        (selectedTickets[tt.id] || 0) >= tt.max_per_order
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalAmount > 0 && (
            <div className="sticky bottom-0 bg-white border-t p-4 rounded-lg shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">₹{(totalAmount / 100).toFixed(2)}</span>
              </div>
              
              {/* Payment Method Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'razorpay' | 'cash')}
                      className="w-4 h-4"
                    />
                    <span>Razorpay (Online)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'razorpay' | 'cash')}
                      className="w-4 h-4"
                    />
                    <span>Cash (At Venue)</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                {paymentMethod === 'cash' ? 'Create Order (Pay at Venue)' : 'Proceed to Checkout'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

