import { Resend } from 'resend';
import Handlebars from 'handlebars';
import { getPocketBase } from './pocketbase';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailContext {
  [key: string]: any;
}

export async function getEmailTemplate(
  type: string,
  organizerId?: string
): Promise<EmailTemplate | null> {
  const pb = getPocketBase();

  // Try to get organizer-specific template first
  if (organizerId) {
    try {
      const template = await pb
        .collection('email_templates')
        .getFirstListItem(`type="${type}" && organizer_id="${organizerId}" && is_active=true`);
      return {
        subject: template.subject_template,
        body: template.body_template,
      };
    } catch (error) {
      // Fall through to global template
    }
  }

  // Get global default template
  try {
    const template = await pb
      .collection('email_templates')
      .getFirstListItem(`type="${type}" && organizer_id=null && is_active=true`);
    return {
      subject: template.subject_template,
      body: template.body_template,
    };
  } catch (error) {
    console.error(`Email template not found: ${type}`, error);
    return null;
  }
}

export async function renderEmailTemplate(
  template: EmailTemplate,
  context: EmailContext
): Promise<{ subject: string; html: string }> {
  const subjectTemplate = Handlebars.compile(template.subject);
  const bodyTemplate = Handlebars.compile(template.body);

  return {
    subject: subjectTemplate(context),
    html: bodyTemplate(context),
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<void> {
  const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'noreply@example.com';
  const fromName = process.env.RESEND_FROM_NAME || 'Rave Ticketing';

  // Validate Resend API key
  if (!process.env.RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY is not configured in environment variables');
    console.error('Email configuration error:', error.message);
    throw error;
  }

  // Resend requires the from email to be in format: "Name <email@domain.com>" or just "email@domain.com"
  // If using a verified domain, you can use just the email. Otherwise, use the format with name.
  const fromAddress = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  try {
    console.log(`[Email] Attempting to send email to ${to} from ${fromAddress}`);
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });
    
    // Resend returns errors in result.error, not as exceptions
    if (result.error) {
      const errorMsg = result.error.message || 'Unknown Resend error';
      const statusCode = (result.error as any).statusCode;
      console.error('[Email] Resend returned error:', result.error);
      
      if (statusCode === 403) {
        const domain = fromEmail.split('@')[1];
        throw new Error(
          `Resend domain verification error: The from email domain (${domain}) is not verified. ` +
          `Resend does not allow sending from Gmail, Yahoo, or other public email providers. ` +
          `Please verify your custom domain at https://resend.com/domains or use Resend's test email (onboarding@resend.dev) for testing.`
        );
      } else if (statusCode === 401) {
        throw new Error('Resend API error: Invalid API key. Please check your RESEND_API_KEY in .env');
      } else if (statusCode === 422) {
        throw new Error(`Resend API error: Invalid email format or domain. Details: ${errorMsg}`);
      }
      
      throw new Error(`Resend API error: ${errorMsg}`);
    }
    
    console.log(`[Email] Successfully sent email to ${to}. Message ID: ${result.data?.id || 'N/A'}`);
  } catch (error: any) {
    console.error('[Email] Failed to send email:', {
      to,
      from: fromAddress,
      error: error.message,
      statusCode: error.response?.status || (error as any)?.statusCode || (error as any)?.error?.statusCode,
      response: error.response?.data || (error as any)?.error,
      stack: error.stack,
    });
    
    // Re-throw with helpful message
    throw error;
  }
}

export async function sendTemplatedEmail(
  type: string,
  to: string,
  context: EmailContext,
  organizerId?: string
): Promise<void> {
  let template = await getEmailTemplate(type, organizerId);
  
  // If template not found, use default template
  if (!template) {
    console.warn(`Email template not found: ${type}, using default template`);
    template = getDefaultEmailTemplate(type, context);
  }

  const { subject, html } = await renderEmailTemplate(template, context);
  await sendEmail(to, subject, html);
}

function getDefaultEmailTemplate(type: string, context: EmailContext): EmailTemplate {
  if (type === 'ticket_confirmation') {
    const ticketsHtml = (context.tickets || []).map((ticket: any, idx: number) => {
      const qrCodeImg = ticket.qr_code 
        ? `<img src="${ticket.qr_code}" alt="QR Code" style="max-width: 200px; margin: 10px 0;" />`
        : `<p><a href="${ticket.qr_url}">View Ticket</a></p>`;
      
      return `
        <div style="border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 8px;">
          <h3>Ticket ${idx + 1}: ${ticket.type}</h3>
          ${ticket.seat ? `<p><strong>Seat:</strong> ${ticket.seat}</p>` : ''}
          <p><strong>Ticket Code:</strong> ${ticket.qr_url.split('/t/')[1]}</p>
          ${qrCodeImg}
        </div>
      `;
    }).join('');

    return {
      subject: `Your Tickets for ${context.event_name}`,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Your Tickets Are Ready!</h1>
          </div>
          <div class="content">
            <p>Dear ${context.user_name},</p>
            <p>Thank you for your purchase! Your tickets for <strong>${context.event_name}</strong> are confirmed.</p>
            <p><strong>Order Number:</strong> ${context.order_number}</p>
            <p><strong>Event:</strong> ${context.event_name}</p>
            <p><strong>Date:</strong> ${new Date(context.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Time:</strong> ${new Date(context.event_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Venue:</strong> ${context.venue_name}</p>
            <p><strong>Total Amount:</strong> ₹${(context.total_amount / 100).toFixed(2)}</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <h2>Your Tickets:</h2>
            ${ticketsHtml}
            <p style="margin-top: 30px;"><strong>Important:</strong> Please bring a valid ID and show your ticket QR code at the venue entrance.</p>
            <p>Best regards,<br>The Rave Ticketing Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
        </html>
      `,
    };
  }

  // Generic default template
  return {
    subject: 'Notification from Rave Ticketing',
    body: `<p>${JSON.stringify(context)}</p>`,
  };
}

// Helper to register common Handlebars helpers
export function registerEmailHelpers() {
  Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'INR') => {
    const major = amount / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
    }).format(major);
  });

  Handlebars.registerHelper('formatDate', (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  Handlebars.registerHelper('formatTime', (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });
}

// Initialize helpers
registerEmailHelpers();

/**
 * Send organizer approval email
 */
export async function sendOrganizerApprovalEmail(
  organizerEmail: string,
  organizerName: string,
  dashboardUrl: string
): Promise<void> {
  const subject = 'Your Organizer Application Has Been Approved!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #4338CA;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to Rave Ticketing Platform!</h1>
      </div>
      <div class="content">
        <p>Dear ${organizerName},</p>
        
        <p>Great news! Your organizer application has been <strong>approved</strong>.</p>
        
        <p>You can now start creating and managing events on our platform. Access your organizer dashboard to:</p>
        <ul>
          <li>Create and manage venues</li>
          <li>Create and publish events</li>
          <li>Set up ticket types and pricing</li>
          <li>View analytics and sales reports</li>
          <li>Manage your staff members</li>
        </ul>
        
        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="button">Go to Organizer Dashboard</a>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>The Rave Ticketing Team</p>
      </div>
      <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(organizerEmail, subject, html);
}

