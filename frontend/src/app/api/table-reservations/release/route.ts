import { NextRequest, NextResponse } from 'next/server';
import { tableReservationsStore } from '@/lib/table-reservations-store';

export async function POST(request: NextRequest) {
  try {
    const { tableIds } = await request.json();

    if (!tableIds || !Array.isArray(tableIds)) {
      return NextResponse.json(
        { error: 'Table IDs are required' },
        { status: 400 }
      );
    }

    // Release reservations
    tableReservationsStore.releaseMultiple(tableIds);

    return NextResponse.json({
      success: true,
      message: 'Table reservations released',
    });
  } catch (error: any) {
    console.error('Table reservation release error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to release table reservations' },
      { status: 500 }
    );
  }
}

