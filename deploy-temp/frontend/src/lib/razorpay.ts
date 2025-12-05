import Razorpay from 'razorpay';
import crypto from 'crypto';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
    console.warn('Razorpay keys not found in environment variables');
}

export const razorpay = new Razorpay({
    key_id: key_id || 'dummy',
    key_secret: key_secret || 'dummy',
});

export interface CreateOrderOptions {
    amount: number; // in smallest currency unit (paise)
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
}

export async function createRazorpayOrder(options: CreateOrderOptions) {
    try {
        const order = await razorpay.orders.create({
            amount: options.amount,
            currency: options.currency,
            receipt: options.receipt,
            notes: options.notes,
        });
        return order;
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        throw error;
    }
}

export function verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    if (!key_secret) return false;

    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
        .createHmac('sha256', key_secret)
        .update(text)
        .digest('hex');

    return generated_signature === signature;
}
