import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase';
import { verifyPaymentSignature } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
        }

        const pb = getPocketBase();
        const order = await pb.collection('orders').getOne(orderId);

        if (order.status !== 'pending') {
            return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 400 });
        }

        // Verify Razorpay Signature if applicable
        if (order.payment_method === 'razorpay') {
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
            }

            if (order.razorpay_order_id !== razorpay_order_id) {
                return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 });
            }

            const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            if (!isValid) {
                return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
            }
        }

        // Update Order Status
        const updateData: any = {
            status: 'paid',
            paid_at: new Date().toISOString(),
        };

        if (order.payment_method === 'razorpay') {
            updateData.razorpay_payment_id = razorpay_payment_id;
            updateData.razorpay_signature = razorpay_signature;
        }

        await pb.collection('orders').update(orderId, updateData);

        // Issue Tickets & Update Inventory
        const tickets = await pb.collection('tickets').getFullList({
            filter: `order_id="${orderId}"`,
        });

        const ticketTypeUpdates = new Map<string, number>();

        for (const ticket of tickets) {
            await pb.collection('tickets').update(ticket.id, {
                status: 'issued',
            });

            const currentCount = ticketTypeUpdates.get(ticket.ticket_type_id) || 0;
            ticketTypeUpdates.set(ticket.ticket_type_id, currentCount + 1);
        }

        // Update Inventory
        for (const [ticketTypeId, quantity] of ticketTypeUpdates.entries()) {
            const ticketType = await pb.collection('ticket_types').getOne(ticketTypeId);
            await pb.collection('ticket_types').update(ticketTypeId, {
                remaining_quantity: ticketType.remaining_quantity - quantity,
            });
        }

        // TODO: Send Email (Skipped for simplicity as requested, can be added later)

        return NextResponse.json({ success: true, message: 'Order confirmed' });

    } catch (error: any) {
        console.error('Order confirmation error:', error);
        return NextResponse.json({ error: error.message || 'Failed to confirm order' }, { status: 500 });
    }
}
