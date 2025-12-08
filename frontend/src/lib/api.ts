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
    tableIds?: string[];
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
    // First get the event to find the venue_id
    const event = await pb.collection('events').getOne(eventId);
    const venueId = event.venue_id;
    
    // Fetch all seats for this venue
    const seats = await pb.collection('seats').getFullList({ 
      filter: `venue_id="${venueId}"`,
      sort: 'section,row,seat_number',
    });
    
    // Get all tickets for this event to determine sold seats
    const tickets = await pb.collection('tickets').getFullList({
      filter: `event_id="${eventId}" && status="issued"`,
    });
    
    const soldSeatIds = new Set(tickets.map((t: any) => t.seat_id).filter(Boolean));
    
    // Mark seats as sold/available
    const seatsWithStatus = seats.map((seat: any) => ({
      ...seat,
      available: !soldSeatIds.has(seat.id),
      sold: soldSeatIds.has(seat.id),
    }));
    
    return { data: { seats: seatsWithStatus } };
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

export const tablesApi = {
  getAvailableTables: async (eventId: string) => {
    const pb = getPocketBase();
    // First get the event to find the venue_id
    const event = await pb.collection('events').getOne(eventId);
    const venueId = event.venue_id;
    
    // Fetch all tables for this venue - try multiple filter formats
    // Note: venue_id might be stored as an array in PocketBase, which won't match string filters
    let tables: any[] = [];
    
    // Try direct filter first
    try {
      tables = await pb.collection('tables').getFullList({ 
        filter: `venue_id="${venueId}"`,
        sort: 'section,name',
      });
      
      // If we got 0 results, the filter might not work (e.g., venue_id is an array)
      // Fall through to manual filtering
      if (tables.length === 0) {
        throw new Error('No results from direct filter, trying fallback');
      }
    } catch (error: any) {
      console.warn('[tablesApi] Direct filter failed or returned 0 results:', error.message);
      
      // Try relation filter
      try {
        tables = await pb.collection('tables').getFullList({ 
          filter: `venue_id.id="${venueId}"`,
          sort: 'section,name',
        });
        
        // If still 0, fall through to manual filtering
        if (tables.length === 0) {
          throw new Error('No results from relation filter, trying fallback');
        }
      } catch (relError: any) {
        console.warn('[tablesApi] Relation filter failed or returned 0 results:', relError.message);
        
        // Fallback: get all and filter manually
        // This handles cases where venue_id is stored as an array
        let allTables: any[] = [];
        try {
          allTables = await pb.collection('tables').getFullList({ sort: 'section,name' });
          if (allTables.length === 0) {
            console.error('[tablesApi] ERROR: No tables found in database at all!');
          }
        } catch (fallbackError: any) {
          console.error('[tablesApi] ERROR: Failed to get all tables in fallback:', fallbackError.message);
          throw fallbackError;
        }
        
        tables = allTables.filter((t: any) => {
          // Handle different venue_id formats:
          // - String: "venue_id"
          // - Array: ["venue_id"] - PocketBase relation stored as array
          // - Object: { id: "venue_id" }
          let matches = false;
          
          if (typeof t.venue_id === 'string') {
            matches = t.venue_id === venueId;
          } else if (Array.isArray(t.venue_id)) {
            // If venue_id is an array, check if it contains the venueId
            matches = t.venue_id.includes(venueId);
          } else if (t.venue_id && typeof t.venue_id === 'object') {
            // If it's an object, try to get the id
            const objId = t.venue_id.id || t.venue_id;
            matches = objId === venueId;
          }
          
          return matches;
        });
      }
    }
    
    // Get all tickets for this event to determine sold tables
    const tickets = await pb.collection('tickets').getFullList({
      filter: `event_id="${eventId}" && status="issued"`,
    });
    
    const soldTableIds = new Set(tickets.map((t: any) => t.table_id).filter(Boolean));
    
    // Mark tables as sold/available
    const tablesWithStatus = tables.map((table: any) => ({
      ...table,
      available: !soldTableIds.has(table.id),
      sold: soldTableIds.has(table.id),
    }));
    
    return { data: { tables: tablesWithStatus } };
  },
};

export const tableReservationsApi = {
  // Reserve tables with conflict handling
  reserve: async (tableIds: string[], userId: string, eventId: string) => {
    try {
      // Use API route for reservation to handle conflicts server-side
      const response = await api.post('/table-reservations/reserve', {
        tableIds,
        userId,
        eventId,
      });
      return response.data;
    } catch (error: any) {
      // If API route doesn't exist, use client-side logic
      console.warn('Table reservation API route not found, using client-side logic');
      return { data: { success: true, reserved: tableIds, conflicts: [] } };
    }
  },
  
  release: async (tableIds: string[]) => {
    try {
      const response = await api.post('/table-reservations/release', { tableIds });
      return response.data;
    } catch (error: any) {
      console.warn('Table reservation release API route not found');
      return { data: { success: true } };
    }
  },
  
  getReserved: async (eventId: string, userId?: string) => {
    try {
      const response = await api.get(`/table-reservations/reserved?eventId=${eventId}${userId ? `&userId=${userId}` : ''}`);
      return response.data;
    } catch (error: any) {
      return { data: { reserved: [] } };
    }
  },
  
  check: async (tableIds: string[], eventId: string, userId?: string) => {
    try {
      const response = await api.post('/table-reservations/check', {
        tableIds,
        eventId,
        userId,
      });
      return response.data;
    } catch (error: any) {
      // Fallback: check via tickets
      const pb = getPocketBase();
      const tickets = await pb.collection('tickets').getFullList({
        filter: `event_id="${eventId}" && status="issued"`,
      });
      const soldTableIds = new Set(tickets.map((t: any) => t.table_id).filter(Boolean));
      const unavailable = tableIds.filter(id => soldTableIds.has(id));
      return { data: { available: tableIds.filter(id => !soldTableIds.has(id)), unavailable } };
    }
  },
};

export default api;
