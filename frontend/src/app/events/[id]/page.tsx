'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getPocketBase } from '@/lib/pocketbase';
import { ordersApi, seatsApi, seatReservationsApi } from '@/lib/api';
import Script from 'next/script';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  start_date: string;
  end_date: string;
  city: string;
  cover_image?: string;
  event_date?: string;
  venue_id: string;
  organizer_id: string;
  expand?: {
    venue_id?: {
      id: string;
      name: string;
      layout_type: 'GA' | 'SEATED';
    };
  };
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

interface Seat {
  id: string;
  section: string;
  row: string;
  seat_number: string;
  label: string;
  available: boolean;
  reserved?: boolean;
  sold?: boolean;
  position_x?: number;
  position_y?: number;
}

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string[]>>({}); // ticketTypeId -> seatIds[]
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [isSeated, setIsSeated] = useState(false);
  const [showSeatSelection, setShowSeatSelection] = useState<Record<string, boolean>>({});
  const [reservedSeats, setReservedSeats] = useState<Set<string>>(new Set());
  const [reservationTimer, setReservationTimer] = useState<NodeJS.Timeout | null>(null);
  const [attendeeDetails, setAttendeeDetails] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cash'>('razorpay');
  const [loading, setLoading] = useState(true);
  const reservationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      const pb = getPocketBase();
      console.log('Loading event:', eventId);

      const eventData = await pb.collection('events').getOne(eventId, {
        expand: 'venue_id,organizer_id',
      });
      console.log('Loaded event data:', eventData);
      console.log('Event venue_id:', eventData.venue_id);
      console.log('Event expanded venue:', eventData.expand?.venue_id);

      setEvent(eventData as any);

      try {
        console.log('Fetching ticket types for event:', eventId);
        const ticketTypesData = await pb.collection('ticket_types').getFullList({
          filter: `event_id="${eventId}"`,
        });
        console.log('Ticket types raw response:', ticketTypesData);
        setTicketTypes(ticketTypesData as any);
        console.log('Loaded ticket types:', ticketTypesData.length);
      } catch (ticketError) {
        console.error('Failed to load ticket types:', ticketError);
        setTicketTypes([]);
      }

      // Check if venue is SEATED and load available seats
      let venue = eventData.expand?.venue_id;
      if (!venue && eventData.venue_id) {
        try {
          console.log('Fetching venue manually:', eventData.venue_id);
          venue = await pb.collection('venues').getOne(eventData.venue_id);
          console.log('Manually fetched venue:', venue);
        } catch (venueError: any) {
          console.warn('Failed to load venue:', venueError);
          // Venue might not exist or user might not have access - continue without venue data
        }
      }
      if (venue && venue.layout_type === 'SEATED') {
        setIsSeated(true);
        await loadSeats();
      }

      // Load user details for attendee form
      const user = pb.authStore.model;
      if (user) {
        setAttendeeDetails({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleTicketChange(ticketTypeId: string, quantity: number) {
    setSelectedTickets({ ...selectedTickets, [ticketTypeId]: quantity });

    // For seated events, clear seat selection if quantity is reduced
    if (isSeated && selectedSeats[ticketTypeId]) {
      const currentSeats = selectedSeats[ticketTypeId] || [];
      if (quantity < currentSeats.length) {
        setSelectedSeats({
          ...selectedSeats,
          [ticketTypeId]: currentSeats.slice(0, quantity),
        });
      }
    }
  }

  async function loadSeats() {
    try {
      const seatsResponse = await seatsApi.getAvailableSeats(eventId);
      setAvailableSeats(seatsResponse.data.seats || []);

      // Load reserved seats
      const user = getPocketBase().authStore.model;
      if (user) {
        const reservedResponse = await seatReservationsApi.getReserved(eventId, user.id);
        setReservedSeats(new Set((reservedResponse.data as any)?.reserved || []));
      }
    } catch (error) {
      console.error('Failed to load seats:', error);
    }
  }

  async function handleSeatToggle(ticketTypeId: string, seatId: string) {
    const currentSeats = selectedSeats[ticketTypeId] || [];
    const quantity = selectedTickets[ticketTypeId] || 0;
    const user = getPocketBase().authStore.model;

    if (!user) {
      alert('Please login to select seats');
      return;
    }

    if (currentSeats.includes(seatId)) {
      // Deselect seat - release reservation
      const newSeats = currentSeats.filter((id) => id !== seatId);
      setSelectedSeats({
        ...selectedSeats,
        [ticketTypeId]: newSeats,
      });

      // Release reservation
      try {
        await seatReservationsApi.release([seatId]);
        setReservedSeats((prev) => {
          const newSet = new Set(prev);
          newSet.delete(seatId);
          return newSet;
        });
      } catch (error) {
        console.error('Failed to release seat reservation:', error);
      }
    } else {
      // Select seat (if not at limit)
      if (currentSeats.length < quantity) {
        // Reserve the seat
        try {
          const reserveResponse = await seatReservationsApi.reserve([seatId], user.id, eventId);

          if (reserveResponse.data.reserved.includes(seatId)) {
            setSelectedSeats({
              ...selectedSeats,
              [ticketTypeId]: [...currentSeats, seatId],
            });
            setReservedSeats((prev) => new Set([...prev, seatId]));

            // Set timeout to release reservation after 10 minutes
            if (reservationTimeoutRef.current) {
              clearTimeout(reservationTimeoutRef.current);
            }
            reservationTimeoutRef.current = setTimeout(() => {
              seatReservationsApi.release([seatId]).catch(console.error);
              setReservedSeats((prev) => {
                const newSet = new Set(prev);
                newSet.delete(seatId);
                return newSet;
              });
              setSelectedSeats((prev) => ({
                ...prev,
                [ticketTypeId]: (prev[ticketTypeId] || []).filter((id) => id !== seatId),
              }));
              alert('Your seat reservation has expired. Please select seats again.');
            }, 10 * 60 * 1000); // 10 minutes
          } else {
            alert('This seat is no longer available. Please select another seat.');
            await loadSeats(); // Refresh seat availability
          }
        } catch (error: any) {
          console.error('Failed to reserve seat:', error);
          alert(`Failed to reserve seat: ${error.response?.data?.error || error.message || 'Unknown error'}`);
          await loadSeats(); // Refresh seat availability
        }
      } else {
        alert(`You can only select ${quantity} seat(s) for this ticket type`);
      }
    }
  }

  // Poll for reserved seats updates
  useEffect(() => {
    if (!isSeated) return;

    const interval = setInterval(async () => {
      try {
        const user = getPocketBase().authStore.model;
        if (user) {
          const reservedResponse = await seatReservationsApi.getReserved(eventId, user.id);
          setReservedSeats(new Set((reservedResponse.data as any)?.reserved || []));
        }
      } catch (error) {
        console.error('Failed to check reserved seats:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isSeated, eventId]);

  // Cleanup reservations on unmount or page navigation
  useEffect(() => {
    return () => {
      if (reservationTimeoutRef.current) {
        clearTimeout(reservationTimeoutRef.current);
      }

      // Release all reservations when component unmounts
      const allSelectedSeatIds = Object.values(selectedSeats).flat();
      if (allSelectedSeatIds.length > 0) {
        seatReservationsApi.release(allSelectedSeatIds).catch(console.error);
      }
    };
  }, [selectedSeats]);

  async function handleCheckout() {
    const pb = getPocketBase();
    const user = pb.authStore.model;

    if (!user) {
      if (confirm('You need to login to purchase tickets. Redirect to login page?')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }

    // Validate seat selection for seated events
    if (isSeated) {
      for (const [ticketTypeId, quantity] of Object.entries(selectedTickets)) {
        if (quantity > 0) {
          const selectedSeatIds = selectedSeats[ticketTypeId] || [];
          if (selectedSeatIds.length !== quantity) {
            alert(`Please select exactly ${quantity} seat(s) for ${ticketTypes.find(tt => tt.id === ticketTypeId)?.name || 'this ticket type'}`);
            return;
          }
        }
      }

      // Ensure all selected seats are still reserved
      const allSelectedSeatIds = Object.values(selectedSeats).flat();
      if (allSelectedSeatIds.length > 0) {
        try {
          const checkResponse = await seatReservationsApi.check(allSelectedSeatIds, eventId, user.id);
          const unavailableSeats: string[] = [];
          for (const [seatId, isReserved] of Object.entries((checkResponse.data as any)?.status || {})) {
            if (!isReserved && !reservedSeats.has(seatId)) {
              unavailableSeats.push(seatId);
            }
          }
          if (unavailableSeats.length > 0) {
            alert('Some of your selected seats are no longer available. Please select different seats.');
            await loadSeats();
            return;
          }
        } catch (error) {
          console.error('Failed to check seat availability:', error);
        }
      }
    }

    const ticketItems = Object.entries(selectedTickets)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({
        ticketTypeId,
        quantity,
        seatIds: isSeated ? (selectedSeats[ticketTypeId] || []) : undefined,
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
        attendeeName: attendeeDetails.name || undefined,
        attendeeEmail: attendeeDetails.email || undefined,
        attendeePhone: attendeeDetails.phone || undefined,
      });

      const { razorpayOrder, order } = response.data;

      // Release seat reservations on successful order creation (they'll be confirmed when payment completes)
      if (isSeated) {
        const allSelectedSeatIds = Object.values(selectedSeats).flat();
        if (allSelectedSeatIds.length > 0) {
          // Don't release yet - wait for payment confirmation
          // Reservations will be released when order is confirmed
        }
      }

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

            // Release seat reservations (they're now confirmed as tickets)
            if (isSeated) {
              const allSelectedSeatIds = Object.values(selectedSeats).flat();
              if (allSelectedSeatIds.length > 0) {
                try {
                  await seatReservationsApi.release(allSelectedSeatIds);
                } catch (error) {
                  console.error('Failed to release reservations:', error);
                }
              }
            }

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

      // Release seat reservations on checkout failure
      if (isSeated) {
        const allSelectedSeatIds = Object.values(selectedSeats).flat();
        if (allSelectedSeatIds.length > 0) {
          try {
            await seatReservationsApi.release(allSelectedSeatIds);
            setReservedSeats((prev) => {
              const newSet = new Set(prev);
              allSelectedSeatIds.forEach((id) => newSet.delete(id));
              return newSet;
            });
            setSelectedSeats({});
          } catch (releaseError) {
            console.error('Failed to release seat reservations:', releaseError);
          }
        }
      }

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

      <div className="min-h-screen p-4 pb-20">
        <div className="w-full">
          {event.cover_image && (
            <img
              src={event.cover_image ? getPocketBase().files.getUrl(event as any, event.cover_image) : ''}
              alt={event.name}
              className="w-full h-48 object-cover rounded-xl mb-4"
            />
          )}

          <h1 className="text-2xl font-bold mb-2 text-gray-900">{event.name}</h1>
          <p className="text-gray-600 mb-2 text-sm">{event.category} • {event.city}</p>
          <p className="mb-4 text-gray-700 text-sm">
            {new Date(event.event_date || event.start_date).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Description</h2>
            <p className="whitespace-pre-wrap text-gray-700 text-sm">{event.description}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">Tickets</h2>
            {ticketTypes.length === 0 ? (
              <div className="border border-gray-200 rounded-xl p-6 text-center bg-gray-50">
                <p className="text-gray-600 mb-2">No tickets available for this event yet.</p>
                <p className="text-xs text-gray-500">Please check back later or contact the organizer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ticketTypes.map((tt) => (
                  <div key={tt.id} className="border border-gray-200 rounded-xl p-4 bg-white">
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

                    {/* Seat Selection for Seated Events */}
                    {isSeated && (selectedTickets[tt.id] || 0) > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <button
                          onClick={() => setShowSeatSelection({ ...showSeatSelection, [tt.id]: !showSeatSelection[tt.id] })}
                          className="text-sm text-blue-600 hover:underline mb-2"
                        >
                          {showSeatSelection[tt.id] ? 'Hide Seat Selection' : 'Select Seats'}
                        </button>
                        {showSeatSelection[tt.id] && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-2">
                              Select {selectedTickets[tt.id]} seat(s). Selected: {(selectedSeats[tt.id] || []).length}
                            </p>
                            <div className="max-h-64 overflow-y-auto border rounded p-3">
                              {availableSeats.length === 0 ? (
                                <p className="text-sm text-gray-500">Loading seats...</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {availableSeats.map((seat) => {
                                    const isSelected = (selectedSeats[tt.id] || []).includes(seat.id);
                                    const isReserved = reservedSeats.has(seat.id) && !isSelected;
                                    const isUnavailable = !seat.available || seat.sold || isReserved;

                                    return (
                                      <button
                                        key={seat.id}
                                        onClick={() => handleSeatToggle(tt.id, seat.id)}
                                        disabled={isUnavailable}
                                        className={`px-2 py-1 text-xs rounded ${isSelected
                                          ? 'bg-blue-600 text-white'
                                          : isReserved
                                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                            : seat.available && !seat.sold
                                              ? 'bg-gray-100 hover:bg-gray-200'
                                              : 'bg-red-100 text-gray-400 cursor-not-allowed'
                                          }`}
                                        title={
                                          isSelected
                                            ? `Selected: ${seat.section} - Row ${seat.row} - ${seat.label}`
                                            : isReserved
                                              ? `Reserved: ${seat.section} - Row ${seat.row} - ${seat.label}`
                                              : seat.sold
                                                ? 'Sold'
                                                : `${seat.section} - Row ${seat.row} - ${seat.label}`
                                        }
                                      >
                                        💺 {seat.label}
                                        {isReserved && <span className="ml-1 text-xs">⏱️</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendee Details Form */}
          {totalAmount > 0 && (
            <div className="mb-6 border border-gray-200 rounded-xl p-4 bg-white">
              <h2 className="text-lg font-semibold mb-3 text-gray-900">Attendee Details</h2>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="attendeeName" className="text-gray-700">Name *</Label>
                  <Input
                    id="attendeeName"
                    value={attendeeDetails.name}
                    onChange={(e) => setAttendeeDetails({ ...attendeeDetails, name: e.target.value })}
                    placeholder="Full name"
                    className="bg-white border-gray-300 focus:border-purple-500"
                  />
                </div>
                <div>
                  <Label htmlFor="attendeeEmail" className="text-gray-700">Email *</Label>
                  <Input
                    id="attendeeEmail"
                    type="email"
                    value={attendeeDetails.email}
                    onChange={(e) => setAttendeeDetails({ ...attendeeDetails, email: e.target.value })}
                    placeholder="email@example.com"
                    className="bg-white border-gray-300 focus:border-purple-500"
                  />
                </div>
                <div>
                  <Label htmlFor="attendeePhone" className="text-gray-700">Phone *</Label>
                  <Input
                    id="attendeePhone"
                    type="tel"
                    value={attendeeDetails.phone}
                    onChange={(e) => setAttendeeDetails({ ...attendeeDetails, phone: e.target.value })}
                    placeholder="+91 1234567890"
                    className="bg-white border-gray-300 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {totalAmount > 0 && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-t-xl shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <span className="text-base font-semibold text-gray-700">Total Amount</span>
                <span className="text-2xl font-bold text-gray-900">₹{(totalAmount / 100).toFixed(2)}</span>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Payment Method</label>
                <div className="flex flex-col gap-2">
                  <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${paymentMethod === 'razorpay' ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'razorpay' | 'cash')}
                      className="w-4 h-4 accent-purple-600"
                    />
                    <span className="text-gray-700">Razorpay (Online)</span>
                  </label>
                  <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${paymentMethod === 'cash' ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'razorpay' | 'cash')}
                      className="w-4 h-4 accent-purple-600"
                    />
                    <span className="text-gray-700">Cash (At Venue)</span>
                  </label>
                </div>
              </div>

              {(!attendeeDetails.name || !attendeeDetails.email || !attendeeDetails.phone) && (
                <p className="text-sm text-red-600 mb-3 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600"></span>
                  Please fill in all attendee details above
                </p>
              )}
              <button
                onClick={handleCheckout}
                disabled={!attendeeDetails.name || !attendeeDetails.email || !attendeeDetails.phone}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-base hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
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

