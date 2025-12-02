import express from 'express';
import { getPocketBase } from '../lib/pocketbase';

const router = express.Router();

// Public endpoint to get ticket by code (for QR code scanning)
router.get('/by-code/:ticketCode', async (req, res, next) => {
  try {
    const { ticketCode } = req.params;
    const pb = getPocketBase();

    // Use admin auth to bypass access rules for public ticket lookup
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Authenticate as admin to bypass access rules
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const tickets = await pb.collection('tickets').getFullList({
      filter: `ticket_code="${ticketCode}"`,
      expand: 'order_id.user_id,order_id,event_id,ticket_type_id,seat_id',
    });

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Return ticket data (without sensitive info)
    res.json({
      id: ticket.id,
      ticket_code: ticket.ticket_code,
      status: ticket.status,
      event_id: ticket.event_id,
      ticket_type_id: ticket.ticket_type_id,
      seat_id: ticket.seat_id,
      expand: {
        event_id: ticket.expand?.event_id,
        ticket_type_id: ticket.expand?.ticket_type_id,
        seat_id: ticket.expand?.seat_id,
        order_id: {
          order_number: ticket.expand?.order_id?.order_number,
          attendee_name: ticket.expand?.order_id?.attendee_name,
          attendee_email: ticket.expand?.order_id?.attendee_email,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    next(error);
  }
});

export default router;

