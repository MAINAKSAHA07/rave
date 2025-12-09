import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { sendTicketConfirmationEmail } from '@/lib/emailjs';

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

        // Send confirmation email
        try {
            // Get order with expanded relations
            const orderData = await pb.collection('orders').getOne(orderId, {
                expand: 'event_id,user_id'
            });

            // Get event details
            const event = await pb.collection('events').getOne(orderData.event_id);
            
            // Get venue address if available
            let venueAddress = 'TBD';
            if (event.venue_id) {
                try {
                    const venue = await pb.collection('venues').getOne(event.venue_id);
                    // Format full address: address, city, state - pincode
                    if (venue.address) {
                        const addressParts = [venue.address];
                        if (venue.city) addressParts.push(venue.city);
                        if (venue.state) addressParts.push(venue.state);
                        if (venue.pincode) addressParts.push(`- ${venue.pincode}`);
                        venueAddress = addressParts.join(', ');
                    } else {
                        venueAddress = event.venue_name || 'TBD';
                    }
                } catch (venueError) {
                    venueAddress = event.venue_name || 'TBD';
                }
            } else {
                venueAddress = event.venue_name || 'TBD';
            }

            // Get ticket details with expanded ticket types
            const ticketDetails = await pb.collection('tickets').getFullList({
                filter: `order_id="${orderId}"`,
                expand: 'ticket_type_id'
            });

                    const ticketCodes = ticketDetails.map((t: any) => t.code || t.id);
                    const ticketTypes = ticketDetails.map((t: any) => {
                        const type = t.expand?.ticket_type_id;
                        return type ? type.name : 'General Admission';
                    });

            // Get attendee email from order or user
            const attendeeEmail = orderData.attendee_email || orderData.expand?.user_id?.email || '';
            const attendeeName = orderData.attendee_name || orderData.expand?.user_id?.name || 'Customer';

            if (attendeeEmail) {
                // Format event date
                const eventDate = event.start_date 
                    ? new Date(event.start_date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'TBD';

                // Calculate total amount
                const totalAmount = orderData.total_amount_minor 
                    ? `₹${(orderData.total_amount_minor / 100).toFixed(2)}`
                    : '₹0.00';

                // Generate QR code image URL
                // Construct frontend URL for ticket page
                let frontendUrl = 'http://localhost:3000';
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
                if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
                  frontendUrl = 'http://localhost:3000';
                } else if (backendUrl) {
                  try {
                    const url = new URL(backendUrl);
                    if (url.port === '3001' || url.port === '') {
                      url.port = '3000';
                    }
                    frontendUrl = url.toString().replace('/api', '');
                  } catch (e) {
                    frontendUrl = backendUrl.replace(':3001', ':3000').replace('/api', '');
                  }
                }

                // Generate QR code image URL using QR code API service
                let qrCodeUrl = '';
                if (ticketCodes.length > 0) {
                  const ticketPageUrl = `${frontendUrl}/t/${ticketCodes[0]}`;
                  // Use QR Server API to generate QR code image (200x200 pixels, PNG format)
                  qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketPageUrl)}`;
                }

                await sendTicketConfirmationEmail({
                    to_email: attendeeEmail,
                    to_name: attendeeName,
                    event_name: event.name || 'Event',
                    event_date: eventDate,
                    event_venue: venueAddress,
                    order_id: orderId,
                    ticket_codes: ticketCodes,
                    ticket_types: ticketTypes,
                    total_amount: totalAmount,
                    qr_code_url: qrCodeUrl,
                });
            } else {
                console.warn('⚠️ No email address found for order:', orderId);
            }
        } catch (emailError: any) {
            // Log error but don't fail the order confirmation
            console.error('❌ Failed to send confirmation email:', emailError);
            // Continue with successful order confirmation even if email fails
        }

        return NextResponse.json({ success: true, message: 'Order confirmed' });

    } catch (error: any) {
        console.error('Order confirmation error:', error);
        return NextResponse.json({ error: error.message || 'Failed to confirm order' }, { status: 500 });
    }
}
