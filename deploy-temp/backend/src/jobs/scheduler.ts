import cron from 'node-cron';
import { getPocketBase } from '../lib/pocketbase';
import { sendTemplatedEmail } from '../lib/email';
import { processScheduledPayouts, generateDailyPayouts } from '../services/payoutService';

export function initializeScheduledJobs() {
  // Run payout processing daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled payout processing...');
    try {
      await generateDailyPayouts();
      await processScheduledPayouts();
      console.log('✓ Payout processing completed');
    } catch (error) {
      console.error('Payout processing failed:', error);
    }
  });

  // Run event reminders check every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Checking for event reminders...');
    try {
      await processEventReminders();
      console.log('✓ Event reminders processed');
    } catch (error) {
      console.error('Event reminders processing failed:', error);
    }
  });

  // Run organizer sales reports daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Sending organizer sales reports...');
    try {
      await sendOrganizerSalesReports('daily');
      console.log('✓ Daily sales reports sent');
    } catch (error) {
      console.error('Sales reports failed:', error);
    }
  });

  // Run weekly sales reports on Mondays at 9 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('Sending weekly organizer sales reports...');
    try {
      await sendOrganizerSalesReports('weekly');
      console.log('✓ Weekly sales reports sent');
    } catch (error) {
      console.error('Weekly sales reports failed:', error);
    }
  });
}

async function processEventReminders() {
  try {
    const pb = getPocketBase();
    const now = new Date();

    // Ensure we're authenticated as admin
    if (!pb.authStore.isAdmin) {
      // Re-authenticate as admin if needed
      const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
      const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
      if (adminEmail && adminPassword) {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
      }
    }

    // Get all active reminder configurations
    // Using admin auth, so we can access all records
    const reminders = await pb.collection('event_reminders').getFullList({
      filter: 'is_enabled=true',
      expand: 'event_id',
    });

    for (const reminder of reminders) {
      const event = await pb.collection('events').getOne(reminder.event_id);
      const eventStart = new Date(event.start_date);
      const reminderTime = new Date(eventStart.getTime() - reminder.reminder_offset_hours * 60 * 60 * 1000);

      // Check if reminder time has passed and not yet sent
      if (now >= reminderTime && (!reminder.last_sent_at || new Date(reminder.last_sent_at) < reminderTime)) {
        // Get all paid orders for this event
        const orders = await pb.collection('orders').getFullList({
          filter: `event_id="${event.id}" && status="paid"`,
          expand: 'user_id',
        });

        // Send reminder emails
        for (const order of orders) {
          const user = await pb.collection('users').getOne(order.user_id);
          const venue = await pb.collection('venues').getOne(event.venue_id);

          try {
            await sendTemplatedEmail(
              'event_reminder',
              user.email,
              {
                user_name: user.name,
                event_name: event.name,
                event_date: event.start_date,
                event_time: event.start_date,
                venue_name: venue.name,
                venue_address: venue.address,
              },
              event.organizer_id
            );
          } catch (error) {
            console.error(`Failed to send reminder to ${user.email}:`, error);
          }
        }

        // Update last sent time
        await pb.collection('event_reminders').update(reminder.id, {
          last_sent_at: now.toISOString(),
        });
      }
    }
  } catch (error: any) {
    // Log error but don't throw - scheduled jobs should be resilient
    console.error('Error in processEventReminders:', error.message || error);
    throw error; // Re-throw so the cron handler can log it
  }
}

async function sendOrganizerSalesReports(type: 'daily' | 'weekly') {
  const pb = getPocketBase();
  const now = new Date();
  const startDate = new Date(now);

  if (type === 'daily') {
    startDate.setDate(startDate.getDate() - 1);
  } else {
    startDate.setDate(startDate.getDate() - 7);
  }

  // Get all approved organizers
  const organizers = await pb.collection('organizers').getFullList({
    filter: 'status="approved"',
  });

  for (const organizer of organizers) {
    // Get organizer's events
    const events = await pb.collection('events').getFullList({
      filter: `organizer_id="${organizer.id}"`,
    });

    let totalRevenue = 0;
    let totalTickets = 0;
    const eventStats: any[] = [];

    for (const event of events) {
      const orders = await pb.collection('orders').getFullList({
        filter: `event_id="${event.id}" && status="paid" && created>="${startDate.toISOString()}"`,
      });

      const eventRevenue = orders.reduce((sum: number, order: any) => sum + order.total_amount_minor, 0);
      const eventTickets = orders.length; // Simplified

      if (eventRevenue > 0) {
        totalRevenue += eventRevenue;
        totalTickets += eventTickets;
        eventStats.push({
          name: event.name,
          revenue: eventRevenue,
          tickets: eventTickets,
        });
      }
    }

    if (totalRevenue > 0) {
      // Get organizer owner email
      const staff = await pb.collection('organizer_staff').getFullList({
        filter: `organizer_id="${organizer.id}" && role="owner"`,
      });

      if (staff.length > 0) {
        const owner = await pb.collection('users').getOne(staff[0].user_id);

        try {
          await sendTemplatedEmail(
            type === 'daily' ? 'organizer_sales_daily' : 'organizer_sales_weekly',
            owner.email,
            {
              organizer_name: organizer.name,
              period: type === 'daily' ? 'yesterday' : 'last week',
              total_revenue: totalRevenue,
              total_tickets: totalTickets,
              currency: 'INR',
              events: eventStats,
            },
            organizer.id
          );
        } catch (error) {
          console.error(`Failed to send sales report to ${owner.email}:`, error);
        }
      }
    }
  }
}

