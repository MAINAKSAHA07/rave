import axios from 'axios';
import { getPocketBase } from './pocketbase';

// Use internal API routes for orders
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CreateOrderRequest {
  userId: string;
  eventId: string;
  ticketItems: Array<{
    ticketTypeId: string;
    quantity: number;
    seatIds?: string[];
  }>;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  paymentMethod?: 'razorpay' | 'cash';
}

export const ordersApi = {
  create: (data: CreateOrderRequest) => api.post('/orders/create', data),

  confirmRazorpay: (orderId: string, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) =>
    api.post('/orders/confirm', {
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    }),

  get: async (orderId: string) => {
    const pb = getPocketBase();
    return await pb.collection('orders').getOne(orderId, { expand: 'event_id' });
  },

  getUserOrders: async (userId: string) => {
    const pb = getPocketBase();
    return await pb.collection('orders').getFullList({
      filter: `user_id="${userId}"`,
      sort: '-created',
      expand: 'event_id',
    });
  },
};

export const checkinApi = {
  // Simple checkin logic via PB directly if needed, or keep using API routes if complex
  // For now, let's assume checkin is done via Backoffice mostly.
  // If frontend needs it, we can add a route later.
  scan: async (ticketCode: string, eventId: string, checkedInBy: string) => {
    const pb = getPocketBase();
    const ticket = await pb.collection('tickets').getFirstListItem(
      `ticket_code="${ticketCode}" && event_id="${eventId}"`
    );

    // Prevent multiple check-ins and invalid states
    if (ticket.status === 'checked_in') {
      throw new Error('Ticket already checked in');
    }
    if (ticket.status !== 'issued') {
      throw new Error(`Ticket cannot be checked in (status: ${ticket.status})`);
    }

    return await pb.collection('tickets').update(ticket.id, {
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: checkedInBy,
    });
  },
  getStats: async (eventId: string) => {
    const pb = getPocketBase();
    const total = await pb.collection('tickets').getList(1, 1, { filter: `event_id="${eventId}" && status="issued"` });
    const checkedIn = await pb.collection('tickets').getList(1, 1, { filter: `event_id="${eventId}" && status="checked_in"` });
    return {
      totalIssued: total.totalItems + checkedIn.totalItems,
      checkedIn: checkedIn.totalItems,
    };
  },
};

export const refundsApi = {
  request: async (orderId: string, amountMinor: number, reason: string, requestedBy: string) => {
    const pb = getPocketBase();
    const order = await pb.collection('orders').getOne(orderId);
    return await pb.collection('refunds').create({
      order_id: orderId,
      amount_minor: amountMinor,
      reason,
      requested_by: requestedBy,
      currency: order.currency,
      status: 'pending',
    });
  },
};

export const seatsApi = {
  getAvailableSeats: async (eventId: string) => {
    const pb = getPocketBase();
    // This is complex logic (checking tickets vs seats). 
    // For now, fetch all seats and filter client-side or use a simple rule.
    // Assuming 'seats' collection has status or we check tickets.
    const seats = await pb.collection('seats').getFullList({ filter: `event_id="${eventId}"` });
    // TODO: Filter out sold seats by checking tickets collection
    return { data: seats };
  },
};

export const seatReservationsApi = {
  // Simplified: Just check if seat is taken in tickets
  reserve: async (seatIds: string[], userId: string, eventId: string) => {
    // No-op for now in simplified version, or implement basic locking
    return { data: { success: true, reserved: seatIds } };
  },
  release: async (seatIds: string[]) => {
    return { data: { success: true } };
  },
  getReserved: async (eventId: string, userId?: string) => {
    return { data: [] };
  },
  check: async (seatIds: string[], eventId: string, userId?: string) => {
    return { data: { available: seatIds, unavailable: [] } };
  },
};

export default api;
