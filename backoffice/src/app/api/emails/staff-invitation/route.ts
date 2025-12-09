import { NextRequest, NextResponse } from 'next/server';
import { sendStaffInvitationEmail } from '@/lib/emailjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to_email, to_name, organizer_name, role, invitation_url } = body;

        if (!to_email || !to_name || !organizer_name || !role) {
            return NextResponse.json(
                { error: 'Missing required fields: to_email, to_name, organizer_name, role' },
                { status: 400 }
            );
        }

        const result = await sendStaffInvitationEmail({
            to_email,
            to_name,
            organizer_name,
            role,
            invitation_url,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Invitation email sent successfully' });
    } catch (error: any) {
        console.error('❌ Staff invitation email error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send invitation email' },
            { status: 500 }
        );
    }
}

