import { NextRequest, NextResponse } from 'next/server';
import { tableReservationsStore } from '@/lib/table-reservations-store';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId') || undefined;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Get all reservations for this event
    const reserved = tableReservationsStore.getReservedForEvent(eventId, userId);

    return NextResponse.json({
      reserved,
    });
  } catch (error: any) {
    console.error('Get reserved tables error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get reserved tables' },
      { status: 500 }
    );
  }
}

