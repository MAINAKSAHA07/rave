import express from 'express';
import { getPocketBase } from '../lib/pocketbase';
import { isValidTicketCode } from '../utils/ticketCode';

const router = express.Router();

// Check in ticket
router.post('/scan', async (req, res, next) => {
  try {
    const { ticketCode, eventId, checkedInBy } = req.body;
    const pb = getPocketBase();

    if (!isValidTicketCode(ticketCode)) {
      return res.status(400).json({ error: 'Invalid ticket code format' });
    }

    // Find ticket
    const tickets = await pb.collection('tickets').getFullList({
      filter: `ticket_code="${ticketCode}"`,
    });

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Validate event
    if (ticket.event_id !== eventId) {
      return res.status(400).json({ error: 'Ticket does not belong to this event' });
    }

    // Validate status
    if (ticket.status !== 'issued') {
      return res.status(400).json({
        error: `Ticket is ${ticket.status}, cannot check in`,
        status: ticket.status,
      });
    }

    // Check if already checked in
    if (ticket.status === 'checked_in') {
      return res.status(400).json({ error: 'Ticket already checked in', alreadyCheckedIn: true });
    }

    // Update ticket
    await pb.collection('tickets').update(ticket.id, {
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: checkedInBy,
    });

    // Get ticket details for response
    const ticketType = await pb.collection('ticket_types').getOne(ticket.ticket_type_id);
    const order = await pb.collection('orders').getOne(ticket.order_id);
    const user = await pb.collection('users').getOne(order.user_id);

    let seatInfo = null;
    if (ticket.seat_id) {
      const seat = await pb.collection('seats').getOne(ticket.seat_id);
      seatInfo = {
        section: seat.section,
        row: seat.row,
        label: seat.label,
      };
    }

    res.json({
      success: true,
      ticket: {
        code: ticket.ticket_code,
        type: ticketType.name,
        attendeeName: order.attendee_name || user.name,
        seat: seatInfo,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// Get check-in stats for event
router.get('/stats/:eventId', async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const eventId = req.params.eventId;

    const allTickets = await pb.collection('tickets').getFullList({
      filter: `event_id="${eventId}" && status="issued"`,
    });

    const checkedInTickets = await pb.collection('tickets').getFullList({
      filter: `event_id="${eventId}" && status="checked_in"`,
    });

    res.json({
      total: allTickets.length + checkedInTickets.length,
      checkedIn: checkedInTickets.length,
      remaining: allTickets.length,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

