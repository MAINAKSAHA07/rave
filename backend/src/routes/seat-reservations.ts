import express from 'express';
import { getPocketBase } from '../lib/pocketbase';
import {
  reserveSeats,
  releaseSeats,
  confirmSeats,
  getReservedSeats,
  isSeatReserved,
} from '../services/seatReservationService';

const router = express.Router();

// Reserve seats (called when user selects seats in checkout)
router.post('/reserve', async (req, res, next) => {
  try {
    const { seatIds, userId, eventId } = req.body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ error: 'seatIds array is required' });
    }

    if (!userId || !eventId) {
      return res.status(400).json({ error: 'userId and eventId are required' });
    }

    const result = await reserveSeats(seatIds, userId, eventId);

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to reserve seats',
        reserved: result.reserved,
        failed: result.failed,
      });
    }

    res.json({
      success: true,
      reserved: result.reserved,
      failed: result.failed,
      expiresIn: 600, // 10 minutes in seconds
    });
  } catch (error: any) {
    next(error);
  }
});

// Release seats (called when user cancels or timeout expires)
router.post('/release', async (req, res, next) => {
  try {
    const { seatIds } = req.body;

    if (!seatIds || !Array.isArray(seatIds)) {
      return res.status(400).json({ error: 'seatIds array is required' });
    }

    await releaseSeats(seatIds);

    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// Confirm seats (called when order is confirmed)
router.post('/confirm', async (req, res, next) => {
  try {
    const { seatIds } = req.body;

    if (!seatIds || !Array.isArray(seatIds)) {
      return res.status(400).json({ error: 'seatIds array is required' });
    }

    await confirmSeats(seatIds);

    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

// Get reserved seats for an event
router.get('/event/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.query;

    const reserved = getReservedSeats(eventId, userId as string | undefined);

    res.json({ reserved });
  } catch (error: any) {
    next(error);
  }
});

// Check if specific seats are reserved
router.post('/check', async (req, res, next) => {
  try {
    const { seatIds, eventId, userId } = req.body;

    if (!seatIds || !Array.isArray(seatIds) || !eventId) {
      return res.status(400).json({ error: 'seatIds array and eventId are required' });
    }

    const status: Record<string, boolean> = {};
    for (const seatId of seatIds) {
      status[seatId] = isSeatReserved(seatId, eventId, userId);
    }

    res.json({ status });
  } catch (error: any) {
    next(error);
  }
});

export default router;

