import { getPocketBase } from '../lib/pocketbase';
import { createRazorpayOrder } from '../lib/razorpay';
import { generateTicketCode } from '../utils/ticketCode';
import QRCode from 'qrcode';

export interface CreateOrderRequest {
  userId: string;
  eventId: string;
  ticketItems: Array<{
    ticketTypeId: string;
    quantity: number;
    seatIds?: string[]; // For seated events
  }>;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  paymentMethod?: 'razorpay' | 'cash'; // Payment method: razorpay or cash
}

export interface OrderValidationResult {
  valid: boolean;
  errors: string[];
  totalAmount: number;
  currency: string;
}

export async function validateOrder(request: CreateOrderRequest): Promise<OrderValidationResult> {
  const pb = getPocketBase();
  const errors: string[] = [];
  let totalAmount = 0;
  let currency = 'INR';

  // Fetch event
  const event = await pb.collection('events').getOne(request.eventId);
  if (event.status !== 'published') {
    errors.push('Event is not published');
  }

  // Check user's existing orders for this event
  const existingOrders = await pb.collection('orders').getFullList({
    filter: `user_id="${request.userId}" && event_id="${request.eventId}" && status="paid"`,
  });

  // Validate each ticket item
  for (const item of request.ticketItems) {
    const ticketType = await pb.collection('ticket_types').getOne(item.ticketTypeId);

    if (ticketType.event_id !== request.eventId) {
      errors.push(`Ticket type ${ticketType.name} does not belong to this event`);
      continue;
    }

    // Check sales window
    const now = new Date();
    if (new Date(ticketType.sales_start) > now || new Date(ticketType.sales_end) < now) {
      errors.push(`Ticket type ${ticketType.name} is not available for sale`);
    }

    // Check quantity limits
    if (item.quantity > ticketType.max_per_order) {
      errors.push(`Cannot order more than ${ticketType.max_per_order} of ${ticketType.name}`);
    }

    if (ticketType.remaining_quantity < item.quantity) {
      errors.push(`Insufficient quantity for ${ticketType.name}`);
    }

    // Check per-user limit
    if (ticketType.max_per_user_per_event) {
      const userTicketCount = existingOrders.reduce((count, order) => {
        // This is simplified - in production, count actual tickets
        return count;
      }, 0);
      if (userTicketCount + item.quantity > ticketType.max_per_user_per_event) {
        errors.push(`Per-user limit exceeded for ${ticketType.name}`);
      }
    }

    // For seated events, validate seats
    if (item.seatIds && item.seatIds.length !== item.quantity) {
      errors.push(`Seat count must match quantity for ${ticketType.name}`);
    }

    if (item.seatIds) {
      for (const seatId of item.seatIds) {
        const seat = await pb.collection('seats').getOne(seatId);
        // Check if seat is already sold (simplified - would check tickets)
        const existingTickets = await pb.collection('tickets').getFullList({
          filter: `seat_id="${seatId}" && status="issued"`,
        });
        if (existingTickets.length > 0) {
          errors.push(`Seat ${seat.label} is already sold`);
        }
      }
    }

    totalAmount += ticketType.final_price_minor * item.quantity;
    currency = ticketType.currency;
  }

  return {
    valid: errors.length === 0,
    errors,
    totalAmount,
    currency,
  };
}

export async function createOrder(request: CreateOrderRequest) {
  const pb = getPocketBase();

  // Validate order
  const validation = await validateOrder(request);
  if (!validation.valid) {
    throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
  }

  // Calculate GST breakdown
  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  for (const item of request.ticketItems) {
    const ticketType = await pb.collection('ticket_types').getOne(item.ticketTypeId);
    totalBaseAmount += ticketType.base_price_minor * item.quantity;
    totalGstAmount += ticketType.gst_amount_minor * item.quantity;
  }

  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Determine payment method (default to razorpay)
  const paymentMethod = request.paymentMethod || 'razorpay';

  // Create order record
  const orderData: any = {
    user_id: request.userId,
    event_id: request.eventId,
    order_number: orderNumber,
    status: paymentMethod === 'cash' ? 'pending' : 'pending', // Cash orders need manual confirmation
    total_amount_minor: validation.totalAmount,
    base_amount_minor: totalBaseAmount,
    gst_amount_minor: totalGstAmount,
    currency: validation.currency,
    attendee_name: request.attendeeName,
    attendee_email: request.attendeeEmail,
    attendee_phone: request.attendeePhone,
    payment_method: paymentMethod,
  };

  // Reserve seats before creating order (for seated events)
  let reservedSeatIds: string[] = [];
  if (request.ticketItems.some((item) => item.seatIds && item.seatIds.length > 0)) {
    const allSeatIds = request.ticketItems.flatMap((item) => item.seatIds || []);
    try {
      const { reserveSeats } = await import('./seatReservationService');
      const reserveResult = await reserveSeats(allSeatIds, request.userId, request.eventId);
      
      if (!reserveResult.success || reserveResult.failed.length > 0) {
        throw new Error(
          `Failed to reserve seats: ${reserveResult.failed.join(', ')}. Some seats may have been taken.`
        );
      }
      reservedSeatIds = reserveResult.reserved;
      console.log(`[createOrder] Reserved ${reservedSeatIds.length} seats for order`);
    } catch (error: any) {
      console.error('[createOrder] Failed to reserve seats:', error);
      throw new Error(`Seat reservation failed: ${error.message || 'Unknown error'}`);
    }
  }

  let order;
  try {
    order = await pb.collection('orders').create(orderData);
  } catch (error: any) {
    // If order creation fails, release seat reservations
    if (reservedSeatIds.length > 0) {
      try {
        const { releaseSeats } = await import('./seatReservationService');
        await releaseSeats(reservedSeatIds);
        console.log(`[createOrder] Released ${reservedSeatIds.length} seat reservations due to order creation failure`);
      } catch (releaseError) {
        console.error('[createOrder] Failed to release seat reservations:', releaseError);
      }
    }
    throw error;
  }

  let razorpayOrder = null;

  // Only create Razorpay order if payment method is razorpay
  if (paymentMethod === 'razorpay') {
    try {
      razorpayOrder = await createRazorpayOrder({
        amount: validation.totalAmount,
        currency: validation.currency,
        receipt: orderNumber,
        notes: {
          order_id: order.id,
          event_id: request.eventId,
        },
      });

      // Update order with Razorpay order ID
      await pb.collection('orders').update(order.id, {
        razorpay_order_id: razorpayOrder.id,
      });
    } catch (razorpayError: any) {
      console.error('Failed to create Razorpay order:', razorpayError);
      
      // Check if it's a configuration error
      if (razorpayError.statusCode === 401 || razorpayError.message?.includes('key')) {
        throw new Error('Razorpay is not properly configured. Please contact support or use cash payment.');
      }
      
      // If Razorpay fails, we should still return the order but mark it appropriately
      // The frontend can handle this case
      throw new Error(`Failed to create Razorpay order: ${razorpayError.message || 'Unknown error'}`);
    }
  }

  // Create pending tickets (will be confirmed on payment)
  const tickets = [];
  for (const item of request.ticketItems) {
    const ticketType = await pb.collection('ticket_types').getOne(item.ticketTypeId);

    for (let i = 0; i < item.quantity; i++) {
      const ticketCode = generateTicketCode();
      const ticketData: any = {
        order_id: order.id,
        event_id: request.eventId,
        ticket_type_id: item.ticketTypeId,
        ticket_code: ticketCode,
        status: 'pending',
      };

      if (item.seatIds && item.seatIds[i]) {
        ticketData.seat_id = item.seatIds[i];
      }

      const ticket = await pb.collection('tickets').create(ticketData);
      tickets.push(ticket);
    }
  }

  return {
    order,
    razorpayOrder, // null for cash payments
    tickets,
  };
}

export async function confirmOrder(orderId: string, paymentId?: string, signature?: string) {
  const pb = getPocketBase();

  const order = await pb.collection('orders').getOne(orderId);

  if (order.status !== 'pending') {
    throw new Error(`Order ${orderId} is not in pending status`);
  }

  // Update order status
  const updateData: any = {
    status: 'paid',
    paid_at: new Date().toISOString(),
  };

  // Only add Razorpay fields if payment method is razorpay
  if (paymentId && signature && order.payment_method === 'razorpay') {
    updateData.razorpay_payment_id = paymentId;
    updateData.razorpay_signature = signature;
  }

  await pb.collection('orders').update(orderId, updateData);

  // Get all tickets for this order
  const tickets = await pb.collection('tickets').getFullList({
    filter: `order_id="${orderId}"`,
  });

  if (tickets.length === 0) {
    throw new Error(`No tickets found for order ${orderId}. Tickets must be created before confirming payment.`);
  }

  console.log(`[confirmOrder] Found ${tickets.length} tickets for order ${orderId}`);

  // Update tickets to issued
  const ticketTypeUpdates = new Map<string, number>();
  const seatIds: string[] = [];

  for (const ticket of tickets) {
    await pb.collection('tickets').update(ticket.id, {
      status: 'issued',
    });

    // Track quantity updates
    const currentCount = ticketTypeUpdates.get(ticket.ticket_type_id) || 0;
    ticketTypeUpdates.set(ticket.ticket_type_id, currentCount + 1);

    // Collect seat IDs for reservation release
    if (ticket.seat_id) {
      seatIds.push(ticket.seat_id);
    }
  }

  // Release seat reservations when tickets are confirmed
  if (seatIds.length > 0) {
    try {
      const { confirmSeats } = await import('./seatReservationService');
      await confirmSeats(seatIds);
      console.log(`[confirmOrder] Released reservations for ${seatIds.length} seats`);
    } catch (error) {
      console.error('[confirmOrder] Failed to release seat reservations:', error);
      // Don't fail order if reservation release fails
    }
  }
  
  console.log(`[confirmOrder] Updated ${tickets.length} tickets to 'issued' status`);

  // Update ticket type remaining quantities
  for (const [ticketTypeId, quantity] of ticketTypeUpdates.entries()) {
    const ticketType = await pb.collection('ticket_types').getOne(ticketTypeId);
    await pb.collection('ticket_types').update(ticketTypeId, {
      remaining_quantity: ticketType.remaining_quantity - quantity,
    });
  }

  // Send confirmation email (don't fail order if email fails)
  // Get recipient email/name outside try block so it's available in catch block
  let recipientEmail: string | undefined;
  let recipientName: string | undefined;
  
  try {
    const event = await pb.collection('events').getOne(order.event_id);
    const user = await pb.collection('users').getOne(order.user_id);

    // Use attendee email if provided, otherwise use user email
    recipientEmail = order.attendee_email || user.email;
    recipientName = order.attendee_name || user.name;

    // Generate QR codes for tickets
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const ticketQRCodes = await Promise.all(
      tickets.map(async (ticket) => {
        const qrUrl = `${frontendUrl}/t/${ticket.ticket_code}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrUrl);
        return {
          ticketCode: ticket.ticket_code,
          qrUrl,
          qrCodeDataUrl,
        };
      })
    );

    // Load ticket types and seats for email
    const ticketTypesMap = new Map();
    const seatsMap = new Map();

    for (const ticket of tickets) {
      if (!ticketTypesMap.has(ticket.ticket_type_id)) {
        const tt = await pb.collection('ticket_types').getOne(ticket.ticket_type_id);
        ticketTypesMap.set(ticket.ticket_type_id, tt);
      }
      if (ticket.seat_id && !seatsMap.has(ticket.seat_id)) {
        const seat = await pb.collection('seats').getOne(ticket.seat_id);
        seatsMap.set(ticket.seat_id, seat);
      }
    }

    const venue = await pb.collection('venues').getOne(event.venue_id);

    // Import email service
    const { sendTemplatedEmail } = await import('../lib/email');
    await sendTemplatedEmail(
      'ticket_confirmation',
      recipientEmail,
      {
        user_name: recipientName,
        event_name: event.name,
        event_date: event.start_date,
        event_time: event.start_date,
        venue_name: venue.name,
        order_number: order.order_number,
        total_amount: order.total_amount_minor,
        currency: order.currency,
        tickets: tickets.map((t, idx) => ({
          type: ticketTypesMap.get(t.ticket_type_id)?.name || 'General',
          seat: t.seat_id ? seatsMap.get(t.seat_id)?.label : null,
          qr_url: ticketQRCodes[idx].qrUrl,
          qr_code: ticketQRCodes[idx].qrCodeDataUrl, // Include QR code image data
        })),
      },
      event.organizer_id
    );
    console.log(`Ticket confirmation email sent to ${recipientEmail} for order ${order.order_number}`);
  } catch (emailError: any) {
    // Log error but don't fail the order confirmation
    console.error('[Cash Confirmation] Error confirming order', orderId + ':', emailError);
    console.error('Error details:', {
      message: emailError.message,
      status: emailError.response?.status,
      data: emailError.response?.data,
      stack: emailError.stack,
    });
    console.error('[Order Confirmation] Failed to send ticket confirmation email:', {
      orderId,
      recipientEmail: recipientEmail || 'unknown',
      recipientName: recipientName || 'unknown',
      error: emailError.message,
      stack: emailError.stack,
      response: emailError.response?.data,
      statusCode: emailError.response?.status,
    });
    console.error('[Order Confirmation] Order confirmation completed successfully, but email failed');
    // Don't re-throw - order confirmation should succeed even if email fails
  }

  return order;
}

