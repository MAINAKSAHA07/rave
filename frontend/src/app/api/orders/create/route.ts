import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase';
import { createRazorpayOrder } from '@/lib/razorpay';

// Helper to generate ticket code
function generateTicketCode() {
    return 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, eventId, ticketItems, attendeeName, attendeeEmail, attendeePhone, paymentMethod = 'razorpay' } = body;

        if (!userId || !eventId || !ticketItems || ticketItems.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const pb = getPocketBase();

        // Validate admin credentials are configured
        const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
        const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.error('❌ PocketBase admin credentials not configured');
            console.error('   Required: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD');
            return NextResponse.json({ 
                error: 'Server configuration error. Please contact support.' 
            }, { status: 500 });
        }

        // Authenticate as admin to create order (orders collection has createRule = null)
        try {
            await pb.admins.authWithPassword(adminEmail, adminPassword);
        } catch (authError: any) {
            console.error('❌ PocketBase admin authentication failed:', authError);
            console.error('   URL:', authError.url);
            console.error('   Status:', authError.status);
            console.error('   Response:', JSON.stringify(authError.response, null, 2));
            
            // Provide helpful error message
            if (authError.status === 400) {
                return NextResponse.json({ 
                    error: 'Invalid admin credentials. Please check POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD configuration.',
                    details: process.env.NODE_ENV === 'development' ? authError.response : undefined
                }, { status: 500 });
            } else if (authError.status === 404) {
                return NextResponse.json({ 
                    error: 'PocketBase admin endpoint not found. Please check POCKETBASE_URL configuration.'
                }, { status: 500 });
            } else {
                return NextResponse.json({ 
                    error: 'Failed to authenticate with PocketBase admin.',
                    details: process.env.NODE_ENV === 'development' ? authError.message : undefined
                }, { status: 500 });
            }
        }

        // 1. Validate Event
        const event = await pb.collection('events').getOne(eventId);
        if (event.status !== 'published') {
            return NextResponse.json({ error: 'Event is not published' }, { status: 400 });
        }

        // 2. Validate Tickets & Calculate Totals
        let totalAmount = 0;
        let totalBaseAmount = 0;
        let totalGstAmount = 0;
        let currency = 'INR';
        const errors: string[] = [];

        for (const item of ticketItems) {
            const ticketType = await pb.collection('ticket_types').getOne(item.ticketTypeId);

            if (ticketType.event_id !== eventId) {
                errors.push(`Ticket type ${ticketType.name} does not belong to this event`);
                continue;
            }

            // Check sales window
            const now = new Date();
            if (new Date(ticketType.sales_start) > now || new Date(ticketType.sales_end) < now) {
                errors.push(`Ticket type ${ticketType.name} is not available for sale`);
            }

            // Check quantity
            if (item.quantity > ticketType.max_per_order) {
                errors.push(`Cannot order more than ${ticketType.max_per_order} of ${ticketType.name}`);
            }
            if (ticketType.remaining_quantity < item.quantity) {
                errors.push(`Insufficient quantity for ${ticketType.name}`);
            }

            totalAmount += ticketType.final_price_minor * item.quantity;
            totalBaseAmount += ticketType.base_price_minor * item.quantity;
            totalGstAmount += ticketType.gst_amount_minor * item.quantity;
            currency = ticketType.currency;
        }

        if (errors.length > 0) {
            return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
        }

        // 3. Create Order Record
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const orderData = {
            user_id: userId,
            event_id: eventId,
            order_number: orderNumber,
            status: 'pending',
            total_amount_minor: totalAmount,
            base_amount_minor: totalBaseAmount,
            gst_amount_minor: totalGstAmount,
            currency: currency,
            attendee_name: attendeeName,
            attendee_email: attendeeEmail,
            attendee_phone: attendeePhone,
            payment_method: paymentMethod,
        };

        const order = await pb.collection('orders').create(orderData);

        // 4. Create Razorpay Order (if applicable)
        let razorpayOrder = null;
        if (paymentMethod === 'razorpay') {
            try {
                // Validate Razorpay is configured
                if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                    console.error('❌ Razorpay is not configured. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
                    return NextResponse.json({ 
                        error: 'Payment gateway is not configured. Please contact support.' 
                    }, { status: 500 });
                }

                razorpayOrder = await createRazorpayOrder({
                    amount: totalAmount,
                    currency: currency,
                    receipt: orderNumber,
                    notes: {
                        order_id: order.id,
                        event_id: eventId,
                    },
                });

                // Update order with Razorpay ID
                await pb.collection('orders').update(order.id, {
                    razorpay_order_id: razorpayOrder.id,
                });
            } catch (e: any) {
                console.error('❌ Razorpay order creation failed:', e);
                
                // Delete the order since payment gateway failed
                try {
                    await pb.collection('orders').delete(order.id);
                } catch (deleteError) {
                    console.error('Failed to delete order after Razorpay error:', deleteError);
                }

                // Return detailed error message
                const errorMessage = e.message || 'Failed to initiate payment gateway';
                return NextResponse.json({ 
                    error: errorMessage,
                    details: process.env.NODE_ENV === 'development' ? e.stack : undefined
                }, { status: 500 });
            }
        }

        // 5. Create Pending Tickets
        // Note: We create them as 'pending'. They will be 'issued' upon payment confirmation.
        const tickets = [];
        for (const item of ticketItems) {
            for (let i = 0; i < item.quantity; i++) {
                const ticketCode = generateTicketCode();
                const ticketData: any = {
                    order_id: order.id,
                    event_id: eventId,
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

        return NextResponse.json({
            order,
            razorpayOrder,
            tickets
        });

    } catch (error: any) {
        console.error('Order creation error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
    }
}
