import { getPocketBase } from '../lib/pocketbase';

export interface SeatReservation {
  seatId: string;
  userId: string;
  eventId: string;
  expiresAt: Date;
}

const RESERVATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// In-memory store for active reservations (could be moved to Redis in production)
const activeReservations = new Map<string, SeatReservation>();

// Cleanup expired reservations periodically
setInterval(() => {
  const now = new Date();
  for (const [seatId, reservation] of activeReservations.entries()) {
    if (reservation.expiresAt < now) {
      activeReservations.delete(seatId);
      console.log(`Released expired reservation for seat ${seatId}`);
    }
  }
}, 60000); // Check every minute

export async function reserveSeats(
  seatIds: string[],
  userId: string,
  eventId: string
): Promise<{ success: boolean; reserved: string[]; failed: string[] }> {
  const pb = getPocketBase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESERVATION_TIMEOUT_MS);

  const reserved: string[] = [];
  const failed: string[] = [];

  for (const seatId of seatIds) {
    // Check if seat is already reserved
    const existingReservation = activeReservations.get(seatId);
    if (existingReservation && existingReservation.expiresAt > now) {
      // Check if it's the same user (allow re-reservation)
      if (existingReservation.userId !== userId) {
        failed.push(seatId);
        continue;
      }
    }

    // Check if seat is already sold
    try {
      const soldTickets = await pb.collection('tickets').getFullList({
        filter: `seat_id="${seatId}" && event_id="${eventId}" && (status="issued" || status="checked_in")`,
      });

      if (soldTickets.length > 0) {
        failed.push(seatId);
        continue;
      }
    } catch (error) {
      console.error(`Error checking seat ${seatId}:`, error);
      failed.push(seatId);
      continue;
    }

    // Reserve the seat
    activeReservations.set(seatId, {
      seatId,
      userId,
      eventId,
      expiresAt,
    });

    reserved.push(seatId);
  }

  return { success: reserved.length > 0, reserved, failed };
}

export async function releaseSeats(seatIds: string[]): Promise<void> {
  for (const seatId of seatIds) {
    activeReservations.delete(seatId);
  }
}

export async function confirmSeats(seatIds: string[]): Promise<void> {
  // Remove reservations when seats are confirmed (tickets issued)
  await releaseSeats(seatIds);
}

export function getReservedSeats(eventId?: string, userId?: string): string[] {
  const now = new Date();
  const reserved: string[] = [];

  for (const [seatId, reservation] of activeReservations.entries()) {
    if (reservation.expiresAt > now) {
      if (eventId && reservation.eventId !== eventId) continue;
      if (userId && reservation.userId !== userId) continue;
      reserved.push(seatId);
    }
  }

  return reserved;
}

export function isSeatReserved(seatId: string, eventId: string, userId?: string): boolean {
  const reservation = activeReservations.get(seatId);
  if (!reservation) return false;

  const now = new Date();
  if (reservation.expiresAt <= now) {
    activeReservations.delete(seatId);
    return false;
  }

  if (reservation.eventId !== eventId) return false;
  if (userId && reservation.userId !== userId) return true; // Reserved by another user

  return false;
}
