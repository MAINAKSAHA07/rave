import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase';
import { sendTicketConfirmationEmail } from '@/lib/emailjs';

/**
 * Test endpoint to verify EmailJS integration
 * GET /api/test-email - Test with a specific order ID
 * POST /api/test-email - Test with custom parameters
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');
        const testEmail = searchParams.get('email') || 'test@example.com';

        if (orderId) {
            // Test with existing order
            const pb = getPocketBase();
            
            // Authenticate as admin
            const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
            const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
            
            if (!adminEmail || !adminPassword) {
                return NextResponse.json(
                    { error: 'Admin credentials not configured' },
                    { status: 500 }
                );
            }

            await pb.admins.authWithPassword(adminEmail, adminPassword);

            // Get order with expanded relations
            const order = await pb.collection('orders').getOne(orderId, {
                expand: 'event_id,user_id'
            });

            // Get event details
            const event = await pb.collection('events').getOne(order.event_id);
            
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

            // Get ticket details
            const ticketDetails = await pb.collection('tickets').getFullList({
                filter: `order_id="${orderId}"`,
                expand: 'ticket_type_id'
            });

            const ticketCodes = ticketDetails.map((t: any) => t.code || t.id);
            const ticketTypes = ticketDetails.map((t: any) => {
                const type = t.expand?.ticket_type_id;
                return type ? type.name : 'General Admission';
            });

            const attendeeEmail = order.attendee_email || order.expand?.user_id?.email || testEmail;
            const attendeeName = order.attendee_name || order.expand?.user_id?.name || 'Test User';

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

            const totalAmount = order.total_amount_minor 
                ? `₹${(order.total_amount_minor / 100).toFixed(2)}`
                : '₹0.00';

            const result = await sendTicketConfirmationEmail({
                to_email: attendeeEmail,
                to_name: attendeeName,
                event_name: event.name || 'Test Event',
                event_date: eventDate,
                event_venue: venueAddress,
                order_id: orderId,
                ticket_codes: ticketCodes,
                ticket_types: ticketTypes,
                total_amount: totalAmount,
            });

            return NextResponse.json({
                success: result.success,
                message: result.success ? 'Test email sent successfully!' : 'Failed to send email',
                error: result.error,
                details: {
                    orderId,
                    sentTo: attendeeEmail,
                    eventName: event.name,
                }
            });
        } else {
            // Test with mock data
            const result = await sendTicketConfirmationEmail({
                to_email: testEmail,
                to_name: 'Test User',
                event_name: 'Test Event',
                event_date: new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
                event_venue: 'Test Venue',
                order_id: 'TEST-ORDER-123',
                ticket_codes: ['TKT-TEST001', 'TKT-TEST002'],
                ticket_types: ['General Admission', 'VIP'],
                total_amount: '₹500.00',
            });

            return NextResponse.json({
                success: result.success,
                message: result.success ? 'Test email sent successfully!' : 'Failed to send email',
                error: result.error,
                details: {
                    sentTo: testEmail,
                    eventName: 'Test Event',
                }
            });
        }
    } catch (error: any) {
        console.error('❌ Test email error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to test email',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to_email, to_name, event_name, event_date, event_venue, order_id, ticket_codes, ticket_types, total_amount } = body;

        const result = await sendTicketConfirmationEmail({
            to_email: to_email || 'test@example.com',
            to_name: to_name || 'Test User',
            event_name: event_name || 'Test Event',
            event_date: event_date || new Date().toLocaleDateString(),
            event_venue: event_venue || 'Test Venue',
            order_id: order_id || 'TEST-ORDER-123',
            ticket_codes: ticket_codes || ['TKT-TEST001'],
            ticket_types: ticket_types || ['General Admission'],
            total_amount: total_amount || '₹500.00',
        });

        return NextResponse.json({
            success: result.success,
            message: result.success ? 'Test email sent successfully!' : 'Failed to send email',
            error: result.error,
        });
    } catch (error: any) {
        console.error('❌ Test email error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to test email',
            },
            { status: 500 }
        );
    }
}

