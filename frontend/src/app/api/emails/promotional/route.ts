import { NextRequest, NextResponse } from 'next/server';
import { sendPromotionalEmail } from '@/lib/emailjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to_email, to_name, subject, message, event_name, event_date, event_url } = body;

        if (!to_email || !to_name || !subject || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: to_email, to_name, subject, message' },
                { status: 400 }
            );
        }

        const result = await sendPromotionalEmail({
            to_email,
            to_name,
            subject,
            message,
            event_name,
            event_date,
            event_url,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
        console.error('❌ Promotional email error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send promotional email' },
            { status: 500 }
        );
    }
}

