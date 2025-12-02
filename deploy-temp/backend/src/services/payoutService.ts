import { getPocketBase } from '../lib/pocketbase';

const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '5');
const GST_RATE = parseFloat(process.env.DEFAULT_GST_RATE || '18');

export interface PayoutCalculation {
  grossAmount: number;
  platformFees: number;
  gstOnFees: number;
  netAmount: number;
  currency: string;
}

export function calculatePayout(grossAmount: number, currency: string = 'INR'): PayoutCalculation {
  const platformFees = Math.round((grossAmount * PLATFORM_FEE_PERCENTAGE) / 100);
  const gstOnFees = Math.round((platformFees * GST_RATE) / 100);
  const netAmount = grossAmount - platformFees - gstOnFees;

  return {
    grossAmount,
    platformFees,
    gstOnFees,
    netAmount,
    currency,
  };
}

export async function generatePayoutsForEvent(eventId: string) {
  const pb = getPocketBase();
  const event = await pb.collection('events').getOne(eventId);

  // Check if event has ended
  const eventEndDate = new Date(event.end_date);
  const now = new Date();
  if (now < eventEndDate) {
    throw new Error('Event has not ended yet');
  }

  // Calculate settlement date (T+2)
  const settlementDate = new Date(eventEndDate);
  settlementDate.setDate(settlementDate.getDate() + 2);

  // Check if payout already exists
  const existingPayouts = await pb.collection('payouts').getFullList({
    filter: `event_id="${eventId}"`,
  });

  if (existingPayouts.length > 0) {
    throw new Error('Payout already generated for this event');
  }

  // Get all paid orders for this event
  const orders = await pb.collection('orders').getFullList({
    filter: `event_id="${eventId}" && status="paid"`,
  });

  if (orders.length === 0) {
    throw new Error('No paid orders for this event');
  }

  // Calculate total gross revenue
  const grossAmount = orders.reduce((sum: number, order: any) => sum + order.total_amount_minor, 0);
  const currency = orders[0].currency;

  // Calculate payout
  const calculation = calculatePayout(grossAmount, currency);

  // Create payout record
  const payout = await pb.collection('payouts').create({
    organizer_id: event.organizer_id,
    event_id: eventId,
    amount_gross_minor: calculation.grossAmount,
    platform_fees_minor: calculation.platformFees,
    gst_on_fees_minor: calculation.gstOnFees,
    amount_net_minor: calculation.netAmount,
    currency: calculation.currency,
    settlement_date: settlementDate.toISOString(),
    status: 'scheduled',
  });

  return payout;
}

export async function processScheduledPayouts() {
  const pb = getPocketBase();
  const now = new Date();

  // Find payouts that are scheduled and past settlement date
  const payouts = await pb.collection('payouts').getFullList({
    filter: `status="scheduled" && settlement_date<="${now.toISOString()}"`,
  });

  for (const payout of payouts) {
    // Mark as processing
    await pb.collection('payouts').update(payout.id, {
      status: 'processing',
    });

    // In v1, actual transfer is manual
    // Here we just mark it as ready for manual processing
    // In production, integrate with Razorpay Payouts API or bank transfer API

    console.log(`Payout ${payout.id} ready for manual processing: ${payout.amount_net_minor / 100} ${payout.currency}`);
  }

  return payouts;
}

export async function generateDailyPayouts() {
  const pb = getPocketBase();
  const now = new Date();

  // Find events that ended recently (e.g., in the last 24 hours) and don't have a payout
  // Note: This is a simplified query. In production, you'd want a more robust way to find eligible events.
  // For now, we'll fetch all events that ended in the past and check if they have a payout.
  // A better approach would be to have a 'payout_status' on the event or a separate tracking collection.

  const endedEvents = await pb.collection('events').getFullList({
    filter: `end_date <= "${now.toISOString()}" && status="published"`,
  });

  let generatedCount = 0;

  for (const event of endedEvents) {
    try {
      // Check if payout exists
      const existingPayouts = await pb.collection('payouts').getList(1, 1, {
        filter: `event_id="${event.id}"`,
      });

      if (existingPayouts.totalItems === 0) {
        console.log(`Generating payout for event ${event.name} (${event.id})...`);
        await generatePayoutsForEvent(event.id);
        generatedCount++;
      }
    } catch (error: any) {
      if (error.message !== 'No paid orders for this event') {
        console.error(`Failed to generate payout for event ${event.id}:`, error);
      }
    }
  }

  return generatedCount;
}

