import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export interface CreateOrderParams {
  amount: number; // in minor units (paise)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  created_at: number;
}

export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  try {
    const order = await razorpay.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes || {},
    });
    return order as RazorpayOrder;
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw error;
  }
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  // Payment signature verification uses key_secret, not webhook_secret
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keySecret) {
    console.warn('RAZORPAY_KEY_SECRET not configured, skipping signature verification');
    return true; // In development, allow if not configured
  }

  const payload = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  const isValid = generatedSignature === signature;
  if (!isValid) {
    console.error('Payment signature verification failed', {
      orderId,
      paymentId,
      expected: generatedSignature,
      received: signature,
    });
  }
  return isValid;
}

export interface RefundParams {
  paymentId: string;
  amount: number; // in minor units
  notes?: Record<string, string>;
}

export interface RazorpayRefund {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  created_at: number;
}

export async function createRefund(params: RefundParams): Promise<RazorpayRefund> {
  try {
    const refund = await razorpay.payments.refund(params.paymentId, {
      amount: params.amount,
      notes: params.notes || {},
    });
    return refund as RazorpayRefund;
  } catch (error) {
    console.error('Razorpay refund creation failed:', error);
    throw error;
  }
}

export async function getPaymentDetails(paymentId: string) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Failed to fetch payment details:', error);
    throw error;
  }
}

export default razorpay;

