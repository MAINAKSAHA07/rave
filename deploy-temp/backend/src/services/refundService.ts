import { getPocketBase } from '../lib/pocketbase';
import { createRefund } from '../lib/razorpay';
import { sendTemplatedEmail } from '../lib/email';

export interface ProcessRefundParams {
  orderId: string;
  refundedBy: string;
  reason?: string;
  amount?: number; // If not provided, refund full amount
}

export async function processRefund(params: ProcessRefundParams) {
  const pb = getPocketBase();
  const order = await pb.collection('orders').getOne(params.orderId);

  if (order.status === 'refunded') {
    throw new Error('Order already fully refunded');
  }

  const refundAmount = params.amount || (order.total_amount_minor - (order.refunded_amount_minor || 0));

  if (refundAmount <= 0) {
    throw new Error('No amount available for refund');
  }

  // Create refund record
  const refundData: any = {
    order_id: params.orderId,
    requested_by: params.refundedBy,
    amount_minor: refundAmount,
    currency: order.currency,
    reason: params.reason || 'Admin refund',
    status: 'processing',
  };

  const event = await pb.collection('events').getOne(order.event_id);
  const user = await pb.collection('users').getOne(params.refundedBy);

  // If requested by organizer staff, add organizer_id
  if (user.role !== 'customer' && user.role !== 'admin' && user.role !== 'super_admin') {
    try {
      const staff = await pb
        .collection('organizer_staff')
        .getFirstListItem(`user_id="${params.refundedBy}" && organizer_id="${event.organizer_id}"`);
      if (staff) {
        refundData.organizer_id = event.organizer_id;
      }
    } catch (e) {
      // Not organizer staff, continue
    }
  }

  const refund = await pb.collection('refunds').create(refundData);

  // Process refund via Razorpay
  try {
    const razorpayRefund = await createRefund({
      paymentId: order.razorpay_payment_id,
      amount: refundAmount,
      notes: {
        refund_id: refund.id,
        reason: params.reason || '',
      },
    });

    await pb.collection('refunds').update(refund.id, {
      status: 'completed',
      razorpay_refund_id: razorpayRefund.id,
      processed_at: new Date().toISOString(),
    });

    // Update order
    const newRefundedAmount = (order.refunded_amount_minor || 0) + refundAmount;
    const newStatus =
      newRefundedAmount >= order.total_amount_minor ? 'refunded' : 'partial_refunded';

    await pb.collection('orders').update(order.id, {
      refunded_amount_minor: newRefundedAmount,
      status: newStatus,
    });

    // Cancel associated tickets if full refund
    if (newStatus === 'refunded') {
      const tickets = await pb.collection('tickets').getFullList({
        filter: `order_id="${order.id}"`,
      });
      for (const ticket of tickets) {
        await pb.collection('tickets').update(ticket.id, {
          status: 'cancelled',
        });
      }
    }

    // Send email notification
    const orderUser = await pb.collection('users').getOne(order.user_id);
    await sendTemplatedEmail(
      'refund_completed',
      orderUser.email,
      {
        user_name: orderUser.name,
        order_number: order.order_number,
        event_name: event.name,
        refund_amount: refundAmount,
        currency: order.currency,
      },
      event.organizer_id
    );

    return { success: true, refund };
  } catch (error) {
    await pb.collection('refunds').update(refund.id, {
      status: 'failed',
    });
    throw error;
  }
}

export async function forceCancelEvent(eventId: string, cancelledBy: string, reason: string) {
  const pb = getPocketBase();
  const event = await pb.collection('events').getOne(eventId);

  if (event.status === 'cancelled') {
    throw new Error('Event already cancelled');
  }

  // Update event status
  await pb.collection('events').update(eventId, {
    status: 'cancelled',
  });

  // Get all paid orders for this event
  const orders = await pb.collection('orders').getFullList({
    filter: `event_id="${eventId}" && status="paid"`,
  });

  let refunded = 0;
  let failed = 0;

  // Refund all orders
  for (const order of orders) {
    try {
      await processRefund({
        orderId: order.id,
        refundedBy: cancelledBy,
        reason: `Event cancelled: ${reason}`,
      });
      refunded++;
    } catch (error) {
      console.error(`Failed to refund order ${order.id}:`, error);
      failed++;
    }
  }

  // Cancel all pending tickets
  const tickets = await pb.collection('tickets').getFullList({
    filter: `event_id="${eventId}" && status="issued"`,
  });

  for (const ticket of tickets) {
    await pb.collection('tickets').update(ticket.id, {
      status: 'cancelled',
    });
  }

  return {
    success: true,
    refunded,
    failed,
    totalOrders: orders.length,
  };
}
