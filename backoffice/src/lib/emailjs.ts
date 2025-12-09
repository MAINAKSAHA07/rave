// EmailJS Configuration from environment variables
// Note: These are read at runtime to ensure environment variables are loaded
const getEmailJSConfig = () => ({
  SERVICE_ID: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
  TEMPLATE_ID_TICKET_CONFIRMATION: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_TICKET_CONFIRMATION || '',
  TEMPLATE_ID_PROMOTIONAL: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PROMOTIONAL || '',
  TEMPLATE_ID_STAFF_INVITATION: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_STAFF_INVITATION || '',
  TEMPLATE_ID_EVENT_REMINDER: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_EVENT_REMINDER || '',
  // Use private access token for server-side (if available)
  ACCESS_TOKEN: process.env.EMAILJS_ACCESS_TOKEN || '',
  PUBLIC_KEY: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '',
});

// EmailJS API endpoint
const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

export interface TicketConfirmationEmailParams {
  to_email: string;
  to_name: string;
  event_name: string;
  event_date: string;
  event_venue: string;
  order_id: string;
  ticket_codes: string[];
  ticket_types: string[];
  total_amount: string;
  qr_code_url?: string;
}

export interface PromotionalEmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  event_name?: string;
  event_date?: string;
  event_url?: string;
}

export interface StaffInvitationEmailParams {
  to_email: string;
  to_name: string;
  organizer_name: string;
  role: string;
  invitation_url?: string;
}

export interface EventReminderEmailParams {
  to_email: string;
  to_name: string;
  event_name: string;
  event_date: string;
  event_venue: string;
  event_url?: string;
  reminder_time: string; // e.g., "24 hours before"
}

/**
 * Generic function to send emails via EmailJS
 */
async function sendEmailJS(
  templateId: string,
  templateParams: any,
  templateName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getEmailJSConfig();
    
    if (!config.SERVICE_ID || !templateId || !config.PUBLIC_KEY) {
      console.error(`❌ EmailJS configuration missing for ${templateName}:`, {
        serviceId: !!config.SERVICE_ID,
        templateId: !!templateId,
        accessToken: !!config.ACCESS_TOKEN,
        publicKey: !!config.PUBLIC_KEY,
      });
      return { success: false, error: 'Email service not configured' };
    }

    const requestBody: any = {
      service_id: config.SERVICE_ID,
      template_id: templateId,
      user_id: config.PUBLIC_KEY,
      template_params: templateParams,
    };
    
    if (config.ACCESS_TOKEN) {
      requestBody.accessToken = config.ACCESS_TOKEN;
    }
    
    const response = await fetch(EMAILJS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS API error: ${response.status} - ${errorText}`);
    }

    console.log(`✅ ${templateName} email sent successfully`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Failed to send ${templateName} email:`, error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Send ticket purchase confirmation email
 */
export async function sendTicketConfirmationEmail(
  params: TicketConfirmationEmailParams
): Promise<{ success: boolean; error?: string }> {
  const config = getEmailJSConfig();
  const templateParams: any = {
    to_email: params.to_email,
    to_name: params.to_name,
    reply_to: params.to_email,
    email: params.to_email,
    user_email: params.to_email,
    event_name: params.event_name,
    event_date: params.event_date,
    event_venue: params.event_venue,
    order_id: params.order_id,
    ticket_codes: params.ticket_codes.join(', '),
    ticket_types: params.ticket_types.join(', '),
    total_amount: params.total_amount,
    qr_code_url: params.qr_code_url || '',
  };

  return sendEmailJS(
    config.TEMPLATE_ID_TICKET_CONFIRMATION,
    templateParams,
    'Ticket confirmation'
  );
}

/**
 * Send promotional email
 */
export async function sendPromotionalEmail(
  params: PromotionalEmailParams
): Promise<{ success: boolean; error?: string }> {
  const config = getEmailJSConfig();
  const templateParams: any = {
    to_email: params.to_email,
    to_name: params.to_name,
    reply_to: params.to_email,
    email: params.to_email,
    user_email: params.to_email,
    subject: params.subject,
    message: params.message,
    event_name: params.event_name || '',
    event_date: params.event_date || '',
    event_url: params.event_url || '',
  };

  return sendEmailJS(
    config.TEMPLATE_ID_PROMOTIONAL,
    templateParams,
    'Promotional'
  );
}

/**
 * Send staff invitation email
 */
export async function sendStaffInvitationEmail(
  params: StaffInvitationEmailParams
): Promise<{ success: boolean; error?: string }> {
  const config = getEmailJSConfig();
  
  // If no specific template, use promotional template
  const templateId = config.TEMPLATE_ID_STAFF_INVITATION || config.TEMPLATE_ID_PROMOTIONAL;
  
  const templateParams: any = {
    to_email: params.to_email,
    to_name: params.to_name,
    reply_to: params.to_email,
    email: params.to_email,
    user_email: params.to_email,
    organizer_name: params.organizer_name,
    role: params.role,
    invitation_url: params.invitation_url || '',
    subject: `Invitation to join ${params.organizer_name} as ${params.role}`,
    message: `You have been invited to join ${params.organizer_name} as a ${params.role}.`,
  };

  return sendEmailJS(templateId, templateParams, 'Staff invitation');
}

/**
 * Send event reminder email
 */
export async function sendEventReminderEmail(
  params: EventReminderEmailParams
): Promise<{ success: boolean; error?: string }> {
  const config = getEmailJSConfig();
  
  // If no specific template, use promotional template
  const templateId = config.TEMPLATE_ID_EVENT_REMINDER || config.TEMPLATE_ID_PROMOTIONAL;
  
  const templateParams: any = {
    to_email: params.to_email,
    to_name: params.to_name,
    reply_to: params.to_email,
    email: params.to_email,
    user_email: params.to_email,
    event_name: params.event_name,
    event_date: params.event_date,
    event_venue: params.event_venue,
    event_url: params.event_url || '',
    reminder_time: params.reminder_time,
    subject: `Reminder: ${params.event_name} - ${params.event_date}`,
    message: `This is a reminder that ${params.event_name} is happening ${params.reminder_time}.`,
  };

  return sendEmailJS(templateId, templateParams, 'Event reminder');
}

