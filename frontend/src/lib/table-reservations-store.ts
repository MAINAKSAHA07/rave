// Shared in-memory store for table reservations
// In production, this should be replaced with Redis or a database
interface TableReservation {
  userId: string;
  eventId: string;
  reservedAt: number;
  expiresAt: number;
}

class TableReservationsStore {
  private reservations = new Map<string, TableReservation>();

  constructor() {
    // Cleanup expired reservations every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  reserve(tableId: string, userId: string, eventId: string, durationMs: number = 10 * 60 * 1000): boolean {
    const now = Date.now();
    const existing = this.reservations.get(tableId);

    // Check if already reserved by another user
    if (existing && existing.userId !== userId && existing.expiresAt > now) {
      return false; // Conflict
    }

    // Reserve the table
    this.reservations.set(tableId, {
      userId,
      eventId,
      reservedAt: now,
      expiresAt: now + durationMs,
    });
    return true;
  }

  release(tableId: string): void {
    this.reservations.delete(tableId);
  }

  releaseMultiple(tableIds: string[]): void {
    for (const tableId of tableIds) {
      this.reservations.delete(tableId);
    }
  }

  isReserved(tableId: string, excludeUserId?: string): boolean {
    const reservation = this.reservations.get(tableId);
    if (!reservation) return false;
    
    const now = Date.now();
    if (reservation.expiresAt <= now) {
      // Expired, remove it
      this.reservations.delete(tableId);
      return false;
    }

    // If excludeUserId is provided, don't count user's own reservations
    if (excludeUserId && reservation.userId === excludeUserId) {
      return false;
    }

    return true;
  }

  getReservedForEvent(eventId: string, userId?: string): string[] {
    const now = Date.now();
    const reserved: string[] = [];

    for (const [tableId, reservation] of this.reservations.entries()) {
      if (reservation.eventId === eventId && reservation.expiresAt > now) {
        if (!userId || reservation.userId === userId) {
          reserved.push(tableId);
        }
      }
    }

    return reserved;
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [tableId, reservation] of this.reservations.entries()) {
      if (reservation.expiresAt <= now) {
        this.reservations.delete(tableId);
      }
    }
  }
}

// Export singleton instance
export const tableReservationsStore = new TableReservationsStore();





