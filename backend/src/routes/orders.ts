import express from 'express';
import { createOrder, confirmOrder, CreateOrderRequest } from '../services/orderService';
import { verifyPaymentSignature } from '../lib/razorpay';
import { getPocketBase } from '../lib/pocketbase';

const router = express.Router();

// Create order
router.post('/', async (req, res, next) => {
  try {
    const request: CreateOrderRequest = req.body;
    const result = await createOrder(request);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

// Confirm Razorpay payment (called from frontend after successful payment)
router.post('/:orderId/confirm-razorpay', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing Razorpay payment details' });
    }

    // Verify payment signature
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Get order to verify it matches
    const pb = getPocketBase();
    const order = await pb.collection('orders').getOne(orderId);

    if (order.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ error: 'Order ID mismatch' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order is already ${order.status}` });
    }

    // Confirm order
    await confirmOrder(orderId, razorpay_payment_id, razorpay_signature);

    res.json({ success: true, message: 'Payment confirmed and tickets issued' });
  } catch (error: any) {
    next(error);
  }
});

// Get order details
router.get('/:orderId', async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const order = await pb.collection('orders').getOne(req.params.orderId, {
      expand: 'event_id,user_id',
    });
    res.json(order);
  } catch (error: any) {
    next(error);
  }
});

// Get user's orders
router.get('/user/:userId', async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const orders = await pb.collection('orders').getFullList({
      filter: `user_id="${req.params.userId}"`,
      sort: '-created',
      expand: 'event_id',
    });
    res.json(orders);
  } catch (error: any) {
    next(error);
  }
});

export default router;

