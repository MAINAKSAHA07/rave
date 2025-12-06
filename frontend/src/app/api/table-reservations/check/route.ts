import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase';
import { tableReservationsStore } from '@/lib/table-reservations-store';

export async function POST(request: NextRequest) {
  try {
    const { tableIds, eventId, userId } = await request.json();

    if (!tableIds || !Array.isArray(tableIds)) {
      return NextResponse.json(
        { error: 'Table IDs are required' },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const pb = getPocketBase();
    const available: string[] = [];
    const unavailable: string[] = [];

    // Check each table
    for (const tableId of tableIds) {
      // Check if table is reserved by another user
      if (tableReservationsStore.isReserved(tableId, userId)) {
        unavailable.push(tableId);
        continue;
      }

      // Check if table is sold (via tickets)
      try {
        const tickets = await pb.collection('tickets').getFullList({
          filter: `event_id="${eventId}" && table_id="${tableId}" && status="issued"`,
        });
        if (tickets.length > 0) {
          unavailable.push(tableId);
          continue;
        }
      } catch (error) {
        console.error('Error checking tickets:', error);
      }

      available.push(tableId);
    }

    return NextResponse.json({
      available,
      unavailable,
    });
  } catch (error: any) {
    console.error('Check table availability error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check table availability' },
      { status: 500 }
    );
  }
}

