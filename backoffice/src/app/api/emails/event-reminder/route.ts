import { NextRequest, NextResponse } from 'next/server';
import { sendEventReminderEmail } from '@/lib/emailjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to_email, to_name, event_name, event_date, event_venue, event_url, reminder_time } = body;

        if (!to_email || !to_name || !event_name || !event_date || !reminder_time) {
            return NextResponse.json(
                { error: 'Missing required fields: to_email, to_name, event_name, event_date, reminder_time' },
                { status: 400 }
            );
        }

        const result = await sendEventReminderEmail({
            to_email,
            to_name,
            event_name,
            event_date,
            event_venue: event_venue || 'TBD',
            event_url,
            reminder_time,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Reminder email sent successfully' });
    } catch (error: any) {
        console.error('❌ Event reminder email error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send reminder email' },
            { status: 500 }
        );
    }
}

