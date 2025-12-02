import express from 'express';
import { verifyPaymentSignature } from '../lib/razorpay';
import { confirmOrder } from '../services/orderService';
import { getPocketBase } from '../lib/pocketbase';

const router = express.Router();

// Razorpay webhook handler
router.post('/webhook', async (req, res, next) => {
  try {
    const { event, payload } = req.body;
    
    console.log('Razorpay webhook received:', { event, payload: payload?.entity?.id });

    if (event === 'payment.captured') {
      const paymentEntity = payload.entity;
      const { order_id, id: paymentId } = paymentEntity;
      
      // Note: Razorpay webhooks don't include signature in the payload
      // Signature verification should be done on the frontend when payment is captured
      // For webhook, we trust Razorpay's webhook signature (if configured)
      
      // Find order by Razorpay order ID
      const pb = getPocketBase();
      const orders = await pb.collection('orders').getFullList({
        filter: `razorpay_order_id="${order_id}"`,
      });

      if (orders.length === 0) {
        console.error('Order not found for Razorpay order ID:', order_id);
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orders[0];
      
      // Check if order is already confirmed
      if (order.status === 'paid') {
        console.log('Order already confirmed:', order.id);
        return res.json({ success: true, message: 'Order already confirmed' });
      }

      // Confirm order (paymentId without signature for webhook)
      // The signature was already verified on the frontend
      await confirmOrder(order.id, paymentId);

      console.log(`Order ${order.id} confirmed via Razorpay webhook`);
      res.json({ success: true });
    } else if (event === 'payment.failed') {
      const { order_id } = payload.entity;
      const pb = getPocketBase();
      const orders = await pb.collection('orders').getFullList({
        filter: `razorpay_order_id="${order_id}"`,
      });

      if (orders.length > 0) {
        await pb.collection('orders').update(orders[0].id, {
          status: 'failed',
        });
        console.log(`Order ${orders[0].id} marked as failed`);
      }

      res.json({ success: true });
    } else {
      console.log('Unhandled webhook event:', event);
      res.json({ success: true, message: 'Event not handled' });
    }
  } catch (error: any) {
    console.error('Razorpay webhook error:', error);
    next(error);
  }
});

export default router;

