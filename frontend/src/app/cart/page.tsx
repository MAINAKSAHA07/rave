'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { ordersApi, tableReservationsApi } from '@/lib/api';
import { getPocketBase, getCurrentUser } from '@/lib/pocketbase';
import { useNotificationHelpers } from '@/lib/notifications';
import Script from 'next/script';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Loading from '@/components/Loading';
import BottomNavigation from '@/components/BottomNavigation';
import Link from 'next/link';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, clearCart, getTotalAmount } = useCart();
  const { notifySuccess, notifyError } = useNotificationHelpers();
  const [attendeeDetails, setAttendeeDetails] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cash'>('razorpay');
  const [loading, setLoading] = useState(false);
  const [checkoutTimer, setCheckoutTimer] = useState<number | null>(null);
  const checkoutTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate totals
  const baseAmount = items.reduce((sum, item) => {
    const itemBase = Math.round(item.price / 1.18); // Remove GST (18%)
    return sum + itemBase * item.quantity;
  }, 0);
  const gstAmount = getTotalAmount() - baseAmount;
  const totalAmount = getTotalAmount();

  // Check if any items require table selection
  const hasTableItems = items.some(item => item.ticketTypeCategory === 'TABLE' && (!item.selectedTables || item.selectedTables.length === 0));

  // Check if there are table items with selections
  const hasTableSelections = items.some(item =>
    item.ticketTypeCategory === 'TABLE' && item.selectedTables && item.selectedTables.length > 0
  );

  // Handle timer expiry - defined before useEffect that uses it
  const handleCheckoutTimerExpiry = useCallback(async () => {
    console.log('[CartTimer] Timer expired - releasing table reservations');
    notifyError('Checkout timer expired. Please add items to cart again.');

    // Release table reservations for all table items
    const tableItems = items.filter(item =>
      item.ticketTypeCategory === 'TABLE' && item.selectedTables && item.selectedTables.length > 0
    );

    if (tableItems.length > 0) {
      const allTableIds = tableItems.flatMap(item => item.selectedTables || []);

      try {
        await tableReservationsApi.release(allTableIds);
        console.log('[CartTimer] Released table reservations:', allTableIds);
      } catch (error) {
        console.error('[CartTimer] Failed to release table reservations:', error);
      }
    }

    clearCart();
    router.push('/events');
  }, [items, clearCart, router, notifyError]);

  // Start checkout timer if there are table items with selections
  useEffect(() => {
    // Only start timer if we have table selections and timer is not already running
    if (hasTableSelections && checkoutTimer === null) {
      console.log('[CartTimer] Starting 5-minute checkout timer...');
      setCheckoutTimer(300); // 5 minutes (300 seconds)
    }

    // Stop timer if no table selections
    if (!hasTableSelections && checkoutTimer !== null) {
      console.log('[CartTimer] Clearing timer - no table selections');
      if (checkoutTimerIntervalRef.current) {
        clearInterval(checkoutTimerIntervalRef.current);
        checkoutTimerIntervalRef.current = null;
      }
      setCheckoutTimer(null);
    }
  }, [hasTableSelections, checkoutTimer]);

  // Separate effect to handle the countdown interval
  useEffect(() => {
    if (checkoutTimer !== null && checkoutTimer > 0) {
      // Clear any existing interval
      if (checkoutTimerIntervalRef.current) {
        clearInterval(checkoutTimerIntervalRef.current);
      }

      // Start countdown
      const interval = setInterval(() => {
        setCheckoutTimer((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            checkoutTimerIntervalRef.current = null;
            console.log('[CartTimer] Timer expired');
            // Timer expired - release tables
            handleCheckoutTimerExpiry();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      checkoutTimerIntervalRef.current = interval;
      console.log('[CartTimer] Countdown started, interval ID:', interval);
    }

    return () => {
      if (checkoutTimerIntervalRef.current) {
        clearInterval(checkoutTimerIntervalRef.current);
        checkoutTimerIntervalRef.current = null;
      }
    };
  }, [checkoutTimer, handleCheckoutTimerExpiry]);

  async function handleCheckout() {
    if (!attendeeDetails.name || !attendeeDetails.email || !attendeeDetails.phone) {
      notifyError('Please fill in all attendee details');
      return;
    }

    if (hasTableItems) {
      notifyError('Please select tables for all table ticket types');
      return;
    }

    setLoading(true);

    try {
      const user = getCurrentUser();
      if (!user) {
        notifyError('Please login to checkout');
        router.push('/login');
        return;
      }

      // Prepare order items
      const ticketItems = items.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        seatIds: item.selectedSeats || [],
        tableIds: item.selectedTables || [],
      }));

      // Create order
      const orderData = {
        userId: user.id,
        eventId: items[0]?.eventId,
        ticketItems,
        attendeeName: attendeeDetails.name,
        attendeeEmail: attendeeDetails.email,
        attendeePhone: attendeeDetails.phone,
        paymentMethod,
      };

      if (paymentMethod === 'cash') {
        // Create order directly for cash payment
        const response = await ordersApi.create(orderData);
        notifySuccess('Order created successfully!');
        clearCart();
        router.push(`/my-tickets`);
      } else {
        // Razorpay payment
        const response = await ordersApi.create(orderData);
        const { razorpayOrder, order } = response.data;

        if (razorpayOrder && window.Razorpay) {
          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            name: 'Powerglide',
            description: `Order for ${items[0]?.eventName || 'Event'}`,
            order_id: razorpayOrder.id,
            handler: async function (paymentResponse: any) {
              try {
                await ordersApi.confirmRazorpay(
                  order.id,
                  paymentResponse.razorpay_order_id,
                  paymentResponse.razorpay_payment_id,
                  paymentResponse.razorpay_signature
                );
                notifySuccess('Payment successful! Order confirmed.');
                clearCart();
                router.push(`/my-tickets`);
              } catch (error: any) {
                console.error('Payment confirmation failed:', error);
                notifyError(error.message || 'Payment confirmation failed');
              }
            },
            prefill: {
              name: attendeeDetails.name,
              email: attendeeDetails.email,
              contact: attendeeDetails.phone,
            },
            theme: {
              color: '#A855F7',
            },
          };

          const razorpay = new window.Razorpay(options);
          razorpay.on('payment.failed', function (response: any) {
            notifyError(`Payment failed: ${response.error.description}`);
          });
          razorpay.open();
        } else {
          notifyError('Payment gateway not available');
        }
      }
    } catch (error: any) {
      console.error('Checkout failed:', error);
      notifyError(error.response?.data?.error || error.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <>
        <div 
          className="min-h-screen pb-20"
          style={{
            backgroundColor: '#050509',
            backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(168,85,247,0.18), rgba(59,130,246,0.12), rgba(12,10,24,0)), radial-gradient(circle at 80% 0%, rgba(196,181,253,0.14), rgba(12,10,24,0))',
          }}
        >
          <div className="max-w-[428px] mx-auto min-h-screen">
            <div className="sticky top-0 z-20 p-4" style={{ background: 'transparent', borderBottom: 'none' }}>
              <h1 className="text-2xl font-bold text-white">Cart</h1>
            </div>
            <div className="p-8 text-center flex flex-col items-center justify-center h-[calc(100vh-80px)]">
              <div className="text-6xl mb-4 grayscale opacity-80">🛒</div>
              <h2 className="text-xl font-semibold text-white mb-2">Your cart is empty</h2>
              <p className="text-gray-400 mb-6">Add tickets to your cart to get started</p>
              <Link
                href="/events"
                className="inline-block text-white px-8 py-3 rounded-full font-bold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #C4B5FD 100%)',
                  boxShadow: '0 14px 45px rgba(0,0,0,0.6), 0 0 18px rgba(168,85,247,0.35)'
                }}
              >
                Browse Events
              </Link>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div 
        className="min-h-screen pb-20"
        style={{
            backgroundColor: '#050509',
            backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(168,85,247,0.18), rgba(59,130,246,0.12), rgba(12,10,24,0)), radial-gradient(circle at 80% 0%, rgba(196,181,253,0.14), rgba(12,10,24,0))',
        }}
      >
        <div className="max-w-[428px] mx-auto min-h-screen">
          {/* Header */}
          <div className="sticky top-0 z-20 p-4" style={{ background: 'transparent', borderBottom: 'none' }}>
            <h1 className="text-2xl font-bold text-white">Cart</h1>
            <p className="text-sm font-medium text-gray-300">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Cart Items */}
            {items.map((item) => (
              <div key={`${item.eventId}-${item.ticketTypeId}`} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{item.ticketTypeName}</h3>
                    <p className="text-sm text-gray-400">{item.eventName}</p>
                    {item.ticketTypeCategory && (
                      <p className="text-xs text-[#C4B5FD] mt-1">
                        {item.ticketTypeCategory}
                        {item.selectedTables && item.selectedTables.length > 0 && (
                          <span> - {item.selectedTables.length} table(s) selected</span>
                        )}
                        {item.selectedSeats && item.selectedSeats.length > 0 && (
                          <span> - {item.selectedSeats.length} seat(s) selected</span>
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.eventId, item.ticketTypeId)}
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.eventId, item.ticketTypeId, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center hover:bg-white/10 text-white"
                    >
                      −
                    </button>
                    <span className="font-semibold w-8 text-center text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.eventId, item.ticketTypeId, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center hover:bg-white/10 text-white"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">
                      ₹{((item.price * item.quantity) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">₹{(item.price / 100).toFixed(2)} each</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Attendee Details */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-lg">
              <h2 className="text-lg font-bold mb-4 text-white">Attendee Details</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="attendeeName" className="text-gray-300 mb-2 block">Name *</Label>
                  <Input
                    id="attendeeName"
                    value={attendeeDetails.name}
                    onChange={(e) => setAttendeeDetails({ ...attendeeDetails, name: e.target.value })}
                    placeholder="Full name"
                    className="bg-white/5 border-2 border-white/10 focus:border-[#3B82F6] rounded-xl text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="attendeeEmail" className="text-gray-300 mb-2 block">Email *</Label>
                  <Input
                    id="attendeeEmail"
                    type="email"
                    value={attendeeDetails.email}
                    onChange={(e) => setAttendeeDetails({ ...attendeeDetails, email: e.target.value })}
                    placeholder="email@example.com"
                    className="bg-white/5 border-2 border-white/10 focus:border-[#3B82F6] rounded-xl text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="attendeePhone" className="text-gray-300 mb-2 block">Phone *</Label>
                  <Input
                    id="attendeePhone"
                    type="tel"
                    value={attendeeDetails.phone}
                    onChange={(e) => setAttendeeDetails({ ...attendeeDetails, phone: e.target.value })}
                    placeholder="+91 1234567890"
                    className="bg-white/5 border-2 border-white/10 focus:border-[#3B82F6] rounded-xl text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-lg">
              <h2 className="text-lg font-bold mb-4 text-white">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Subtotal</span>
                  <span className="text-base font-semibold text-gray-300">₹{(baseAmount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">GST (18%)</span>
                  <span className="text-base font-semibold text-gray-300">₹{(gstAmount / 100).toFixed(2)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                  <span className="text-base font-semibold text-white">Total Amount</span>
                  <span className="text-2xl font-bold text-[#3B82F6]">₹{(totalAmount / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-lg">
              <label className="block text-sm font-medium mb-2 text-gray-300">Payment Method</label>
              <div className="flex flex-col gap-2">
                <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${paymentMethod === 'razorpay' ? 'bg-[#A855F7]/15 border-[#A855F7]/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'razorpay' | 'cash')}
                    className="w-4 h-4 accent-[#A855F7]"
                  />
                  <span className="text-gray-200">Razorpay (Online)</span>
                </label>
                <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${paymentMethod === 'cash' ? 'bg-[#A855F7]/15 border-[#A855F7]/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'razorpay' | 'cash')}
                    className="w-4 h-4 accent-[#A855F7]"
                  />
                  <span className="text-gray-200">Cash (At Venue)</span>
                </label>
              </div>
            </div>

            {/* Checkout Timer */}
            {checkoutTimer !== null && checkoutTimer > 0 && (
              <div className={`p-3 rounded-lg border-2 ${checkoutTimer <= 60
                ? 'bg-red-500/10 border-red-500/30'
                : checkoutTimer <= 120
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏱️</span>
                    <span className={`font-semibold ${checkoutTimer <= 60
                      ? 'text-red-400'
                      : checkoutTimer <= 120
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                      }`}>
                      Complete checkout in: {Math.floor(checkoutTimer / 60)}:{(checkoutTimer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  {checkoutTimer <= 60 && (
                    <span className="text-xs text-red-400 font-medium">⚠️ Hurry!</span>
                  )}
                </div>
                <p className="text-xs mt-1 text-gray-400">
                  Your table reservation will expire if checkout is not completed in time.
                </p>
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={!attendeeDetails.name || !attendeeDetails.email || !attendeeDetails.phone || hasTableItems || loading || (checkoutTimer === 0)}
              className="w-full text-white py-4 rounded-xl font-bold text-base disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
              style={{
                background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #C4B5FD 100%)',
                boxShadow: '0 14px 45px rgba(0,0,0,0.6), 0 0 18px rgba(168,85,247,0.35)'
              }}
            >
              {loading ? 'Processing...' : paymentMethod === 'cash' ? 'Create Order (Pay at Venue)' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </>
  );
}

