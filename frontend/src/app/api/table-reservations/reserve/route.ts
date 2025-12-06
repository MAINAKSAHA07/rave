import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase';
import { tableReservationsStore } from '@/lib/table-reservations-store';

export async function POST(request: NextRequest) {
  try {
    const { tableIds, userId, eventId } = await request.json();

    if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
      return NextResponse.json(
        { error: 'Table IDs are required' },
        { status: 400 }
      );
    }

    if (!userId || !eventId) {
      return NextResponse.json(
        { error: 'User ID and Event ID are required' },
        { status: 400 }
      );
    }

    const pb = getPocketBase();
    const reserved: string[] = [];
    const conflicts: string[] = [];

    // Check each table for conflicts
    for (const tableId of tableIds) {
      // Check if table is already reserved by another user
      if (tableReservationsStore.isReserved(tableId, userId)) {
        conflicts.push(tableId);
        continue;
      }

      // Check if table is sold (via tickets)
      try {
        const tickets = await pb.collection('tickets').getFullList({
          filter: `event_id="${eventId}" && table_id="${tableId}" && status="issued"`,
        });
        if (tickets.length > 0) {
          conflicts.push(tableId);
          continue;
        }
      } catch (error) {
        console.error('Error checking tickets:', error);
      }

      // Reserve the table
      const success = tableReservationsStore.reserve(tableId, userId, eventId);
      if (success) {
        reserved.push(tableId);
      } else {
        conflicts.push(tableId);
      }
    }

    return NextResponse.json({
      success: true,
      reserved,
      conflicts,
    });
  } catch (error: any) {
    console.error('Table reservation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reserve tables' },
      { status: 500 }
    );
  }
}

