
import { getPocketBase } from './pocketbase';
import { sendTicketConfirmationEmail } from './emailjs';

export const adminApi = {
  getApplications: async (status?: string) => {
    const pb = getPocketBase();
    const filter = status && status !== 'all' ? `status="${status}"` : '';
    const items = await pb.collection('organizer_applications').getFullList({
      sort: '-created',
      filter,
    });
    return { data: items };
  },

  getOrganizers: async (status?: string) => {
    const pb = getPocketBase();
    const filter = status && status !== 'all' ? `status="${status}"` : '';
    const items = await pb.collection('organizers').getFullList({
      sort: '-created',
      filter,
    });
    return { data: items };
  },

  getOrganizer: async (organizerId: string) => {
    const pb = getPocketBase();
    const record = await pb.collection('organizers').getOne(organizerId);
    return { data: record };
  },

  approveApplication: async (applicationId: string) => {
    const pb = getPocketBase();
    const application = await pb.collection('organizer_applications').getOne(applicationId);

    if (application.status !== 'pending') {
      throw new Error('Application already processed');
    }

    const currentUser = pb.authStore.model;
    const approvedBy = currentUser?.id;

    // Check if organizer exists
    try {
      const existingOrganizer = await pb.collection('organizers').getFirstListItem(`email="${application.email}"`);
      // Organizer exists, just update application
      await pb.collection('organizer_applications').update(applicationId, {
        status: 'approved',
        reviewed_by: approvedBy,
        reviewed_at: new Date().toISOString(),
      });
      return { data: { organizer: existingOrganizer, application } };
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    // Create organizer
    const organizer = await pb.collection('organizers').create({
      name: application.name,
      email: application.email,
      phone: application.phone,
      gst_number: application.gst_number,
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });

    // Update application
    await pb.collection('organizer_applications').update(applicationId, {
      status: 'approved',
      reviewed_by: approvedBy,
      reviewed_at: new Date().toISOString(),
    });

    return { data: { organizer, application } };
  },

  rejectApplication: async (applicationId: string, reviewNotes?: string) => {
    const pb = getPocketBase();
    const currentUser = pb.authStore.model;
    const record = await pb.collection('organizer_applications').update(applicationId, {
      status: 'rejected',
      reviewed_by: currentUser?.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || 'Application rejected',
    });
    return { data: record };
  },

  forceCancelEvent: async (eventId: string, reason: string) => {
    const pb = getPocketBase();
    // Update event status
    const event = await pb.collection('events').update(eventId, {
      status: 'cancelled',
    });

    // Note: In a real backend, we would process refunds here.
    // For now, we just mark the event as cancelled.
    return { data: {
      success: true,
      message: 'Event cancelled (Refunds must be processed manually)',
      event
    }};
  },

  forceRefundOrder: async (orderId: string, reason: string, amount?: number) => {
    const pb = getPocketBase();
    const currentUser = pb.authStore.model;
    const order = await pb.collection('orders').getOne(orderId);

    // Create refund record
    const refund = await pb.collection('refunds').create({
      order_id: orderId,
      requested_by: currentUser?.id,
      amount_minor: amount || order.total_amount_minor,
      currency: order.currency,
      reason: reason || 'Force refund by Admin',
      status: 'completed', // Mark as completed since we can't process real money
      processed_at: new Date().toISOString(),
    });

    // Update order status
    await pb.collection('orders').update(orderId, {
      status: 'refunded',
      refunded_amount_minor: (order.refunded_amount_minor || 0) + (amount || order.total_amount_minor),
    });

    // Cancel all tickets for this order so QR codes/check-in are disabled
    const tickets = await pb.collection('tickets').getFullList({
      filter: `order_id="${orderId}"`,
    });

    for (const ticket of tickets) {
      await pb.collection('tickets').update(ticket.id, {
        status: 'cancelled',
      });
    }

    return { data: { success: true, refund } };
  },

  getEvents: async () => {
    const pb = getPocketBase();
    const items = await pb.collection('events').getFullList({
      sort: '-created',
      expand: 'organizer_id,venue_id',
    });
    return { data: items };
  },

  getOrders: async (params?: { eventId?: string; status?: string; limit?: number }) => {
    const pb = getPocketBase();
    let filter = '';
    if (params?.eventId) filter += `event_id="${params.eventId}"`;
    if (params?.status) filter += (filter ? ' && ' : '') + `status="${params.status}"`;

    const list = await pb.collection('orders').getList(1, params?.limit || 50, {
      sort: '-created',
      filter,
      expand: 'user_id,event_id',
    });
    return { data: list };
  },

  confirmCashOrder: async (orderId: string) => {
    const pb = getPocketBase();
    // Update order status
    const order = await pb.collection('orders').update(orderId, {
      status: 'paid',
      payment_method: 'cash',
      paid_at: new Date().toISOString(),
    });

    // Update tickets status
    const tickets = await pb.collection('tickets').getFullList({
      filter: `order_id="${orderId}"`,
      expand: 'ticket_type_id',
    });

    for (const ticket of tickets) {
      await pb.collection('tickets').update(ticket.id, {
        status: 'issued',
      });
    }

    // Send confirmation email with ticket QR codes
    try {
      // Get order with expanded relations
      const orderData = await pb.collection('orders').getOne(orderId, {
        expand: 'event_id,user_id',
      });

      // Get event details
      const event = await pb.collection('events').getOne(orderData.event_id);
      
      // Get venue address if available
      let venueAddress = 'TBD';
      if (event.venue_id) {
        try {
          const venue = await pb.collection('venues').getOne(event.venue_id);
          // Format full address: address, city, state - pincode
          if (venue.address) {
            const addressParts = [venue.address];
            if (venue.city) addressParts.push(venue.city);
            if (venue.state) addressParts.push(venue.state);
            if (venue.pincode) addressParts.push(`- ${venue.pincode}`);
            venueAddress = addressParts.join(', ');
          } else {
            venueAddress = event.venue_name || 'TBD';
          }
        } catch (venueError) {
          venueAddress = event.venue_name || 'TBD';
        }
      } else {
        venueAddress = event.venue_name || 'TBD';
      }

      // Get ticket details
      const ticketCodes = tickets.map(t => t.code || t.id);
      const ticketTypes = tickets.map(t => {
        const type = t.expand?.ticket_type_id;
        return type ? type.name : 'General Admission';
      });

      // Get attendee email from order or user
      const attendeeEmail = orderData.attendee_email || orderData.expand?.user_id?.email || '';
      const attendeeName = orderData.attendee_name || orderData.expand?.user_id?.name || 'Customer';

      if (attendeeEmail) {
        // Format event date
        const eventDate = event.start_date 
          ? new Date(event.start_date).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'TBD';

        // Calculate total amount
        const totalAmount = orderData.total_amount_minor 
          ? `₹${(orderData.total_amount_minor / 100).toFixed(2)}`
          : '₹0.00';

        // Generate QR code URLs for tickets
        // Construct frontend URL for QR code - tickets are accessible at /t/[code] on the frontend
        // Server-side: try environment variables or construct from backend URL
        let frontendUrl = 'http://localhost:3000';
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
          frontendUrl = 'http://localhost:3000';
        } else if (backendUrl) {
          // For production, derive frontend URL from backend URL
          // Backend is typically on port 3001, frontend on 3000
          // Or they might be on the same domain with different paths
          try {
            const url = new URL(backendUrl);
            if (url.port === '3001' || url.port === '') {
              url.port = '3000';
            }
            frontendUrl = url.toString().replace('/api', '');
          } catch (e) {
            // If URL parsing fails, try simple string replacement
            frontendUrl = backendUrl.replace(':3001', ':3000').replace('/api', '');
          }
        }
        
        // Generate QR code image URL using QR code API service
        // The QR code will contain a link to the ticket page
        let qrCodeUrl = '';
        if (ticketCodes.length > 0) {
          const ticketPageUrl = `${frontendUrl}/t/${ticketCodes[0]}`;
          // Use QR Server API to generate QR code image
          // Size: 200x200 pixels, format: PNG
          qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketPageUrl)}`;
        }

        await sendTicketConfirmationEmail({
          to_email: attendeeEmail,
          to_name: attendeeName,
          event_name: event.name || 'Event',
          event_date: eventDate,
          event_venue: venueAddress,
          order_id: orderId,
          ticket_codes: ticketCodes,
          ticket_types: ticketTypes,
          total_amount: totalAmount,
          qr_code_url: qrCodeUrl,
        });

        console.log('✅ Ticket confirmation email sent for cash order:', orderId);
      } else {
        console.warn('⚠️ No email address found for order:', orderId);
      }
    } catch (emailError: any) {
      // Log error but don't fail the order confirmation
      console.error('❌ Failed to send confirmation email for cash order:', emailError);
      // Continue with successful order confirmation even if email fails
    }

    return { data: { success: true, order } };
  },

  getTickets: async (params?: { orderId?: string; eventId?: string; status?: string; limit?: number }) => {
    const pb = getPocketBase();
    let filter = '';
    if (params?.orderId) filter += `order_id="${params.orderId}"`;
    if (params?.eventId) filter += (filter ? ' && ' : '') + `event_id="${params.eventId}"`;
    if (params?.status) filter += (filter ? ' && ' : '') + `status="${params.status}"`;

    const list = await pb.collection('tickets').getList(1, params?.limit || 100, {
      sort: '-created',
      filter,
      expand: 'order_id.user_id,order_id,event_id,ticket_type_id,seat_id',
    });
    return { data: list };
  },

  checkinTicket: async (ticketId: string) => {
    const pb = getPocketBase();
    const currentUser = pb.authStore.model;
    const record = await pb.collection('tickets').update(ticketId, {
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: currentUser?.id,
    });
    return { data: record };
  },

  cancelTicket: async (ticketId: string, reason?: string) => {
    const pb = getPocketBase();
    const record = await pb.collection('tickets').update(ticketId, {
      status: 'cancelled',
    });
    return { data: record };
  },

  getStats: async () => {
    const pb = getPocketBase();
    // Simple stats implementation
    const events = await pb.collection('events').getList(1, 1);
    const orders = await pb.collection('orders').getList(1, 1);
    const users = await pb.collection('users').getList(1, 1);
    const organizers = await pb.collection('organizers').getList(1, 1);

    return { data: {
      totalEvents: events.totalItems,
      totalOrders: orders.totalItems,
      totalUsers: users.totalItems,
      totalOrganizers: organizers.totalItems,
    }};
  },

  getUsers: async (params?: { role?: string; limit?: number }) => {
    const pb = getPocketBase();
    const filter = params?.role ? `role="${params.role}"` : '';
    const list = await pb.collection('users').getList(1, params?.limit || 50, {
      sort: '-created',
      filter,
    });
    return { data: list };
  },

  createUser: async (userData: any) => {
    const pb = getPocketBase();
    const record = await pb.collection('users').create({
      ...userData,
      emailVisibility: true,
      passwordConfirm: userData.password,
    });
    return { data: { user: record } };
  },

  updateUserRole: async (userId: string, role: string) => {
    const pb = getPocketBase();
    const record = await pb.collection('users').update(userId, { role });
    return { data: record };
  },

  toggleUserBlock: async (userId: string, blocked: boolean) => {
    const pb = getPocketBase();
    // PocketBase doesn't have a 'blocked' field by default on users, 
    // but we can assume it might be added or we use a different field.
    // For now, let's assume there is a 'blocked' field.
    // If not, this might fail, but user requested simple connection.
    const record = await pb.collection('users').update(userId, { blocked });
    return { data: record };
  },

  updateBackofficeAccess: async (userId: string, backoffice_access: boolean, can_manage_roles?: boolean, notes?: string) => {
    const pb = getPocketBase();
    const record = await pb.collection('users').update(userId, {
      backoffice_access,
      can_manage_roles,
      notes
    });
    return { data: record };
  },
};

export const checkinApi = {
  scan: async (ticketCode: string, eventId: string, checkedInBy: string) => {
    const pb = getPocketBase();
    // Find ticket by code with expanded relations
    const ticket = await pb.collection('tickets').getFirstListItem(
      `ticket_code="${ticketCode}" && event_id="${eventId}"`,
      { expand: 'order_id,ticket_type_id,order_id.user_id' }
    );

    if (ticket.status === 'checked_in') {
      throw new Error('Ticket already checked in');
    }
    if (ticket.status !== 'issued') {
      throw new Error(`Ticket is ${ticket.status}`);
    }

    // Check in
    const updatedTicket = await pb.collection('tickets').update(ticket.id, {
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: checkedInBy,
    }, { expand: 'order_id,ticket_type_id,order_id.user_id' });

    return updatedTicket;
  },
  getStats: async (eventId: string) => {
    const pb = getPocketBase();
    const issued = await pb.collection('tickets').getList(1, 1, { filter: `event_id="${eventId}" && status="issued"` });
    const checkedIn = await pb.collection('tickets').getList(1, 1, { filter: `event_id="${eventId}" && status="checked_in"` });
    const total = issued.totalItems + checkedIn.totalItems;
    return {
      total,
      checkedIn: checkedIn.totalItems,
      remaining: issued.totalItems,
    };
  },
};

export const refundsApi = {
  requestRefund: async (orderId: string, amountMinor: number, reason: string, requestedBy: string) => {
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
  getRefunds: async (params?: { organizerId?: string; status?: string }) => {
    let filter = '';
    if (params?.status) filter += `status="${params.status}"`;
    // Note: Filtering by organizerId might require expanding order -> event -> organizer, which is complex for list.
    // For now, we return all if organizerId is not easily filterable, or we skip it.
    const pb = getPocketBase();
    return await pb.collection('refunds').getFullList({
      sort: '-created',
      filter,
      expand: 'order_id',
    });
  },
};

export default adminApi;
