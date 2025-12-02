import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
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
  create: (data: CreateOrderRequest) => api.post('/orders', data),
  get: (orderId: string) => api.get(`/orders/${orderId}`),
  getUserOrders: (userId: string) => api.get(`/orders/user/${userId}`),
  confirmRazorpay: (orderId: string, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) =>
    api.post(`/orders/${orderId}/confirm-razorpay`, {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    }),
};

export const checkinApi = {
  scan: (ticketCode: string, eventId: string, checkedInBy: string) =>
    api.post('/checkin/scan', { ticketCode, eventId, checkedInBy }),
  getStats: (eventId: string) => api.get(`/checkin/stats/${eventId}`),
};

export const refundsApi = {
  request: (orderId: string, amountMinor: number, reason: string, requestedBy: string) =>
    api.post('/refunds', { orderId, amountMinor, reason, requestedBy }),
  approve: (refundId: string, approvedBy: string) =>
    api.post(`/refunds/${refundId}/approve`, { approvedBy }),
};

export const seatsApi = {
  getAvailableSeats: (eventId: string) => api.get(`/seats/event/${eventId}/available`),
};

export const seatReservationsApi = {
  reserve: (seatIds: string[], userId: string, eventId: string) =>
    api.post('/seat-reservations/reserve', { seatIds, userId, eventId }),
  release: (seatIds: string[]) =>
    api.post('/seat-reservations/release', { seatIds }),
  getReserved: (eventId: string, userId?: string) =>
    api.get(`/seat-reservations/event/${eventId}`, { params: { userId } }),
  check: (seatIds: string[], eventId: string, userId?: string) =>
    api.post('/seat-reservations/check', { seatIds, eventId, userId }),
};

export default api;

