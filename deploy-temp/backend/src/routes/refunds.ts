import express from 'express';
// import { createRefund, RefundParams } from '../lib/razorpay';
import { getPocketBase } from '../lib/pocketbase';
// import { sendTemplatedEmail } from '../lib/email';

const router = express.Router();

// Request refund
router.post('/', async (req, res, next) => {
  try {
    const { orderId, amountMinor, reason, requestedBy } = req.body;
    const pb = getPocketBase();

    const order = await pb.collection('orders').getOne(orderId);
    const event = await pb.collection('events').getOne(order.event_id);

    // Validate refund amount
    const maxRefund = order.total_amount_minor - (order.refunded_amount_minor || 0);
    if (amountMinor > maxRefund) {
      res.status(400).json({ error: 'Refund amount exceeds available amount' });
      return;
    }

    // Check if event has ended (configurable rule)
    const eventEndDate = new Date(event.end_date);
    const now = new Date();
    // Allow refunds up to 24 hours after event end (configurable)
    const refundDeadline = new Date(eventEndDate.getTime() + 24 * 60 * 60 * 1000);
    if (now > refundDeadline) {
      res.status(400).json({ error: 'Refund deadline has passed' });
      return;
    }

    // Create refund record
    const refundData: any = {
      order_id: orderId,
      requested_by: requestedBy,
      amount_minor: amountMinor,
      currency: order.currency,
      reason,
      status: 'requested',
    };

    // If requested by organizer staff, add organizer_id
    const user = await pb.collection('users').getOne(requestedBy);
    if (user.role !== 'customer') {
      const staff = await pb
        .collection('organizer_staff')
        .getFirstListItem(`user_id="${requestedBy}" && organizer_id="${event.organizer_id}"`);
      if (staff) {
        refundData.organizer_id = event.organizer_id;
      }
    }

    const refund = await pb.collection('refunds').create(refundData);

    // Auto-approve if requested by super admin
    if (user.role === 'super_admin') {
      const { processRefund: processRefundService } = await import('../services/refundService');
      await processRefundService({
        orderId,
        refundedBy: requestedBy,
        reason,
        amount: amountMinor,
      });
    }

    res.json(refund);
    return;
  } catch (error: any) {
    next(error);
  }
});

// Get refunds (with optional filters)
router.get('/', async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const { organizerId, status } = req.query;

    let filter = '';
    if (organizerId) {
      filter += `organizer_id="${organizerId}"`;
    }
    if (status) {
      if (filter) filter += ' && ';
      filter += `status="${status}"`;
    }

    const queryOptions: any = {
      expand: 'order_id,requested_by',
      sort: '-created',
    };

    // Only include filter if it's not empty
    if (filter) {
      queryOptions.filter = filter;
    }

    const refunds = await pb.collection('refunds').getFullList(queryOptions);

    res.json(refunds);
    return;
  } catch (error: any) {
    next(error);
  }
});

// Approve refund (admin only)
router.post('/:refundId/approve', async (req, res, next) => {
  try {
    const { approvedBy } = req.body;
    const pb = getPocketBase();
    const refund = await pb.collection('refunds').getOne(req.params.refundId);
    const order = await pb.collection('orders').getOne(refund.order_id);

    const { processRefund } = await import('../services/refundService');
    await processRefund({
      orderId: order.id,
      refundedBy: approvedBy,
      reason: refund.reason || 'Approved by admin',
      amount: refund.amount_minor,
    });

    res.json({ success: true });
    return;
  } catch (error: any) {
    next(error);
  }
});

export default router;

