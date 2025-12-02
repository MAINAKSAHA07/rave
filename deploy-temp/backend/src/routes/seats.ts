import express from 'express';
import { getPocketBase } from '../lib/pocketbase';
import { getReservedSeats } from '../services/seatReservationService';

const router = express.Router();

// Get available seats for an event
router.get('/event/:eventId/available', async (req, res, next) => {
  try {
    const pb = getPocketBase();
    const eventId = req.params.eventId;

    // Get event and venue
    const event = await pb.collection('events').getOne(eventId, {
      expand: 'venue_id',
    });

    const venue = event.expand?.venue_id || await pb.collection('venues').getOne(event.venue_id);

    if (venue.layout_type !== 'SEATED') {
      res.json({ available: [], reserved: [] });
      return;
    }

    // Get all seats for this venue
    const allSeats = await pb.collection('seats').getFullList({
      filter: `venue_id="${venue.id}"`,
      sort: 'section,row,seat_number',
    });

    // Get all sold/issued tickets for this event
    const soldTickets = await pb.collection('tickets').getFullList({
      filter: `event_id="${eventId}" && (status="issued" || status="checked_in")`,
    });

    const soldSeatIds = new Set(soldTickets.map((t: any) => t.seat_id).filter(Boolean));

    // Get reserved seats
    const reservedSeatIds = new Set(getReservedSeats(eventId));

    // Mark seats as available, sold, or reserved
    const seatsWithStatus = allSeats.map((seat: any) => ({
      id: seat.id,
      section: seat.section,
      row: seat.row,
      seat_number: seat.seat_number,
      label: seat.label,
      position_x: seat.position_x || null,
      position_y: seat.position_y || null,
      available: !soldSeatIds.has(seat.id) && !reservedSeatIds.has(seat.id),
      reserved: reservedSeatIds.has(seat.id),
      sold: soldSeatIds.has(seat.id),
    }));

    res.json({ seats: seatsWithStatus, isSeated: true });
    return;
  } catch (error: any) {
    next(error);
  }
});

// Update seat position
router.patch('/:seatId/position', async (req, res, next) => {
  try {
    const { seatId } = req.params;
    const { position_x, position_y } = req.body;
    const pb = getPocketBase();

    const updated = await pb.collection('seats').update(seatId, {
      position_x: position_x !== undefined ? parseFloat(position_x) : null,
      position_y: position_y !== undefined ? parseFloat(position_y) : null,
    });

    res.json(updated);
    return;
  } catch (error: any) {
    next(error);
  }
});

export default router;

