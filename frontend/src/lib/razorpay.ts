import Razorpay from 'razorpay';
import crypto from 'crypto';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

// Validate Razorpay configuration before use
function validateRazorpayConfig() {
    if (!key_id || !key_secret) {
        const error = new Error('Razorpay configuration is missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.');
        console.error('❌ Razorpay keys not found in environment variables');
        console.error('   Required: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
        console.error('   Please check your .env file');
        throw error;
    }
}

// Create Razorpay instance - will use dummy values if keys are missing
// But we validate before actual API calls
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
        // Validate Razorpay configuration first
        validateRazorpayConfig();

        // Validate amount is positive
        if (!options.amount || options.amount <= 0) {
            throw new Error('Invalid order amount. Amount must be greater than 0.');
        }

        const order = await razorpay.orders.create({
            amount: options.amount,
            currency: options.currency || 'INR',
            receipt: options.receipt,
            notes: options.notes,
        });
        return order;
    } catch (error: any) {
        console.error('❌ Error creating Razorpay order:', error);
        
        // Provide more helpful error messages
        if (error.message?.includes('configuration')) {
            throw error; // Re-throw configuration errors as-is
        } else if (error.statusCode === 401) {
            throw new Error('Razorpay authentication failed. Please check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
        } else if (error.statusCode === 400) {
            throw new Error(`Razorpay API error: ${error.error?.description || error.message || 'Invalid request'}`);
        } else {
            throw new Error(`Failed to create Razorpay order: ${error.error?.description || error.message || 'Unknown error'}`);
        }
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
