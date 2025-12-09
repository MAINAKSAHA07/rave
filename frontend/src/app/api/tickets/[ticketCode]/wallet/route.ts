import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase';

/**
 * Generate Apple Wallet pass for a ticket
 * Note: This is a simplified version. Full Apple Wallet implementation requires:
 * - Apple Developer account
 * - Pass Type ID certificate
 * - Signing the .pkpass file
 * 
 * For now, we'll return a JSON that can be used with passbook.js or similar
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketCode: string } }
) {
  try {
    const { ticketCode } = params;
    
    if (!ticketCode) {
      return NextResponse.json({ error: 'Ticket code required' }, { status: 400 });
    }

    const pb = getPocketBase();
    
    // Get ticket with expanded relations
    const ticket = await pb.collection('tickets').getFirstListItem(
      `ticket_code="${ticketCode}"`,
      { expand: 'event_id,event_id.venue_id,ticket_type_id,order_id,order_id.user_id' }
    );

    if (!ticket || ticket.status !== 'issued' && ticket.status !== 'checked_in') {
      return NextResponse.json({ error: 'Ticket not found or not issued' }, { status: 404 });
    }

    const event = ticket.expand?.event_id;
    const venue = event?.expand?.venue_id;
    const order = ticket.expand?.order_id;
    const user = order?.expand?.user_id;

    // Format venue address
    let venueAddress = 'TBD';
    if (venue?.address) {
      const addressParts = [venue.address];
      if (venue.city) addressParts.push(venue.city);
      if (venue.state) addressParts.push(venue.state);
      if (venue.pincode) addressParts.push(venue.pincode);
      venueAddress = addressParts.join(', ');
    }

    // Format event date
    const eventDate = event?.start_date 
      ? new Date(event.start_date).toISOString()
      : new Date().toISOString();

    // Apple Wallet pass structure (simplified)
    // In production, this would need to be signed and packaged as .pkpass
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.rave.ticket', // Replace with your Pass Type ID
      serialNumber: ticket.ticket_code,
      teamIdentifier: 'YOUR_TEAM_ID', // Replace with your Apple Team ID
      organizationName: 'Rave Events',
      description: `Ticket for ${event?.name || 'Event'}`,
      logoText: 'Rave',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(20, 184, 166)',
      eventTicket: {
        primaryFields: [
          {
            key: 'event',
            label: 'EVENT',
            value: event?.name || 'Event'
          }
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'DATE',
            value: event?.start_date 
              ? new Date(event.start_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'TBD'
          },
          {
            key: 'venue',
            label: 'VENUE',
            value: venueAddress
          }
        ],
        auxiliaryFields: [
          {
            key: 'ticket',
            label: 'TICKET ID',
            value: ticket.ticket_code
          },
          {
            key: 'type',
            label: 'TYPE',
            value: ticket.expand?.ticket_type_id?.name || 'General'
          }
        ],
        backFields: [
          {
            key: 'order',
            label: 'Order Number',
            value: order?.order_number || 'N/A'
          },
          {
            key: 'name',
            label: 'Name',
            value: user?.name || user?.email || 'Guest'
          },
          {
            key: 'venue_full',
            label: 'Venue Address',
            value: venueAddress
          }
        ]
      },
      barcode: {
        message: ticket.ticket_code,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1'
      },
      relevantDate: eventDate
    };

    // For now, return JSON that can be used with passbook.js
    // In production, you'd need to:
    // 1. Sign the pass with your certificate
    // 2. Package it as a .pkpass file (zip with manifest.json, pass.json, and images)
    // 3. Return as application/vnd.apple.pkpass
    
    return NextResponse.json(passData, {
      headers: {
        'Content-Type': 'application/json',
        // For actual .pkpass file, use: 'Content-Type': 'application/vnd.apple.pkpass',
        // 'Content-Disposition': `attachment; filename="ticket-${ticketCode}.pkpass"`
      }
    });
  } catch (error: any) {
    console.error('Failed to generate wallet pass:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate wallet pass' },
      { status: 500 }
    );
  }
}

