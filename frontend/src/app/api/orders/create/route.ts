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
        console.log('📦 Order creation request received:', {
            userId: body.userId,
            eventId: body.eventId,
            ticketItemsCount: body.ticketItems?.length,
            paymentMethod: body.paymentMethod,
            hasAttendeeName: !!body.attendeeName,
            hasAttendeeEmail: !!body.attendeeEmail,
            hasAttendeePhone: !!body.attendeePhone,
        });
        const { userId, eventId, ticketItems, attendeeName, attendeeEmail, attendeePhone, paymentMethod = 'razorpay' } = body;

        if (!userId || !eventId || !ticketItems || ticketItems.length === 0) {
            console.error('❌ Missing required fields:', {
                userId: !!userId,
                eventId: !!eventId,
                ticketItems: ticketItems?.length || 0,
            });
            return NextResponse.json({ error: 'Missing required fields: userId, eventId, or ticketItems' }, { status: 400 });
        }

        const pb = getPocketBase();

        // Validate admin credentials are configured
        // Priority: AWS-prefixed vars (for production) > regular vars (for local)
        const adminEmail = process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const adminPassword = process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.error('❌ PocketBase admin credentials not configured');
            console.error('   Required: AWS_POCKETBASE_ADMIN_EMAIL and AWS_POCKETBASE_ADMIN_PASSWORD (production)');
            console.error('   OR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (local)');
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
            const salesStart = new Date(ticketType.sales_start);
            const salesEnd = new Date(ticketType.sales_end);
            
            console.log(`📅 Checking sales window for ${ticketType.name}:`, {
                sales_start: ticketType.sales_start,
                sales_end: ticketType.sales_end,
                now: now.toISOString(),
                salesStart: salesStart.toISOString(),
                salesEnd: salesEnd.toISOString(),
                isBeforeStart: salesStart > now,
                isAfterEnd: salesEnd < now,
            });
            
            if (salesStart > now) {
                errors.push(`Ticket type ${ticketType.name} sales have not started yet. Sales start: ${salesStart.toLocaleString()}`);
            } else if (salesEnd < now) {
                errors.push(`Ticket type ${ticketType.name} sales have ended. Sales ended: ${salesEnd.toLocaleString()}`);
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

        const orderData: any = {
            user_id: userId,
            event_id: eventId,
            order_number: orderNumber,
            status: 'pending',
            total_amount_minor: totalAmount,
            currency: currency || 'INR',
            attendee_name: attendeeName,
            attendee_email: attendeeEmail,
            attendee_phone: attendeePhone,
            payment_method: paymentMethod,
        };

        // Add optional fields if they exist in schema (for backward compatibility)
        // These fields might not exist in older database schemas
        if (totalBaseAmount !== undefined && totalBaseAmount !== null) {
            orderData.base_amount_minor = totalBaseAmount;
        }
        if (totalGstAmount !== undefined && totalGstAmount !== null) {
            orderData.gst_amount_minor = totalGstAmount;
        }

        let order;
        try {
            console.log('📦 Creating order with data:', JSON.stringify(orderData, null, 2));
            order = await pb.collection('orders').create(orderData);
            console.log('✅ Order created successfully:', order.id);
        } catch (createError: any) {
            console.error('❌ Failed to create order:', createError);
            console.error('   Order data:', JSON.stringify(orderData, null, 2));
            console.error('   Error response:', JSON.stringify(createError.response?.data, null, 2));
            console.error('   Error status:', createError.status);
            console.error('   Error message:', createError.message);
            
            // If it's a schema validation error, try without optional fields
            if (createError.response?.data) {
                const errorData = createError.response.data;
                const hasFieldErrors = Object.keys(errorData).some(key => 
                    key === 'base_amount_minor' || key === 'gst_amount_minor'
                );
                
                if (hasFieldErrors) {
                    console.warn('⚠️  Retrying order creation without optional GST fields...');
                    const fallbackOrderData = { ...orderData };
                    delete fallbackOrderData.base_amount_minor;
                    delete fallbackOrderData.gst_amount_minor;
                    
                    try {
                        order = await pb.collection('orders').create(fallbackOrderData);
                        console.log('✅ Order created successfully without GST fields');
                    } catch (fallbackError: any) {
                        throw createError; // Throw original error if fallback also fails
                    }
                } else {
                    // Return the actual validation error
                    const errorFields = Object.keys(errorData);
                    const errorMessages = Object.values(errorData).flat();
                    const errorMessage = Array.isArray(errorMessages[0]) 
                        ? errorMessages[0].join(', ') 
                        : errorMessages.join(', ');
                    return NextResponse.json({ 
                        error: `Validation failed: ${errorMessage}`,
                        fields: errorFields,
                        details: process.env.NODE_ENV === 'development' ? errorData : undefined
                    }, { status: 400 });
                }
            } else {
                return NextResponse.json({ 
                    error: createError.message || 'Failed to create order',
                    details: process.env.NODE_ENV === 'development' ? createError.stack : undefined
                }, { status: createError.status || 500 });
            }
        }

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
        try {
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

                    // Add table_id if tableIds are provided
                    if (item.tableIds && item.tableIds[i]) {
                        ticketData.table_id = item.tableIds[i];
                    }

                    try {
                        const ticket = await pb.collection('tickets').create(ticketData);
                        tickets.push(ticket);
                    } catch (ticketError: any) {
                        console.error(`❌ Failed to create ticket ${i + 1} for item:`, item);
                        console.error('   Ticket data:', JSON.stringify(ticketData, null, 2));
                        console.error('   Error:', ticketError.message || ticketError);
                        
                        // If ticket creation fails, try to clean up the order
                        try {
                            await pb.collection('orders').delete(order.id);
                        } catch (deleteError) {
                            console.error('Failed to delete order after ticket creation error:', deleteError);
                        }
                        
                        throw new Error(`Failed to create ticket: ${ticketError.message || 'Unknown error'}`);
                    }
                }
            }
        } catch (ticketCreationError: any) {
            // Re-throw with context
            throw new Error(`Ticket creation failed: ${ticketCreationError.message || ticketCreationError}`);
        }

        return NextResponse.json({
            order,
            razorpayOrder,
            tickets
        });

    } catch (error: any) {
        console.error('❌ Order creation error:', error);
        console.error('   Error type:', error.constructor?.name);
        console.error('   Error message:', error.message);
        console.error('   Error status:', error.status);
        console.error('   Error URL:', error.url);
        if (error.response) {
            console.error('   Error response:', JSON.stringify(error.response, null, 2));
        }
        if (error.stack) {
            console.error('   Error stack:', error.stack);
        }
        
        // Provide more detailed error information
        let errorMessage = 'Failed to create order';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.response?.message) {
            errorMessage = error.response.message;
        }
        
        // Include error details for better debugging
        const errorDetails: any = {
            message: errorMessage,
        };
        
        // Add additional context if available
        if (error.status) {
            errorDetails.status = error.status;
        }
        if (error.url) {
            errorDetails.url = error.url;
        }
        if (error.response?.data) {
            errorDetails.data = error.response.data;
        }
        
        // In production, include safe error details (no stack traces)
        if (process.env.NODE_ENV === 'production') {
            errorDetails.type = error.constructor?.name;
        } else {
            // In development, include full details
            errorDetails.type = error.constructor?.name;
            errorDetails.stack = error.stack;
            errorDetails.fullError = error;
        }
        
        return NextResponse.json({ 
            error: errorMessage,
            details: errorDetails
        }, { status: 500 });
    }
}
