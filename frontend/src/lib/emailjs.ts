// EmailJS Configuration from environment variables
// Note: These are read at runtime to ensure environment variables are loaded
const getEmailJSConfig = () => ({
  SERVICE_ID: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
  TEMPLATE_ID_TICKET_CONFIRMATION: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_TICKET_CONFIRMATION || '',
  TEMPLATE_ID_PROMOTIONAL: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PROMOTIONAL || '',
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

/**
 * Send ticket purchase confirmation email
 */
export async function sendTicketConfirmationEmail(
  params: TicketConfirmationEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get config at runtime to ensure environment variables are loaded
    const config = getEmailJSConfig();
    
    // Check if we have the required configuration
    if (!config.SERVICE_ID || !config.TEMPLATE_ID_TICKET_CONFIRMATION || !config.PUBLIC_KEY) {
      console.error('❌ EmailJS configuration missing:', {
        serviceId: !!config.SERVICE_ID,
        templateId: !!config.TEMPLATE_ID_TICKET_CONFIRMATION,
        accessToken: !!config.ACCESS_TOKEN,
        publicKey: !!config.PUBLIC_KEY,
      });
      return { success: false, error: 'Email service not configured. Need EMAILJS_ACCESS_TOKEN for server-side or NEXT_PUBLIC_EMAILJS_PUBLIC_KEY for client-side.' };
    }

    // EmailJS template parameters
    // Note: The recipient email must be configured in your EmailJS template settings
    // OR you can use these common parameter names that EmailJS recognizes
    const templateParams: any = {
      to_email: params.to_email,
      to_name: params.to_name,
      reply_to: params.to_email, // Some templates use reply_to for recipient
      email: params.to_email, // Alternative parameter name
      user_email: params.to_email, // Another alternative
      event_name: params.event_name,
      event_date: params.event_date,
      event_venue: params.event_venue,
      order_id: params.order_id,
      ticket_codes: params.ticket_codes.join(', '),
      ticket_types: params.ticket_types.join(', '),
      total_amount: params.total_amount,
      qr_code_url: params.qr_code_url || '',
    };

    console.log('📧 Sending ticket confirmation email via EmailJS:', {
      to: params.to_email,
      event: params.event_name,
      orderId: params.order_id,
    });

    // Use EmailJS REST API for server-side
    // For server-side: use public key as user_id and private key as accessToken
    // For client-side: use public key only
    // Note: EmailJS strict mode requires private key for server-side calls
    const requestBody: any = {
      service_id: config.SERVICE_ID,
      template_id: config.TEMPLATE_ID_TICKET_CONFIRMATION,
      user_id: config.PUBLIC_KEY, // Always use public key as user_id
      template_params: templateParams,
    };
    
    // Add private key if available (for server-side strict mode)
    if (config.ACCESS_TOKEN) {
      requestBody.accessToken = config.ACCESS_TOKEN;
      console.log('✅ Using private access token for server-side API call');
    } else {
      console.warn('⚠️ No private access token found - EmailJS may block server-side calls');
      console.warn('   EMAILJS_ACCESS_TOKEN:', process.env.EMAILJS_ACCESS_TOKEN ? 'SET' : 'NOT SET');
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

    const result = await response.json();
    console.log('✅ Ticket confirmation email sent successfully:', result);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to send ticket confirmation email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Send promotional email
 */
export async function sendPromotionalEmail(
  params: PromotionalEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get config at runtime to ensure environment variables are loaded
    const config = getEmailJSConfig();
    
    // Check if we have the required configuration
    if (!config.SERVICE_ID || !config.TEMPLATE_ID_PROMOTIONAL || !config.PUBLIC_KEY) {
      console.error('❌ EmailJS configuration missing:', {
        serviceId: !!config.SERVICE_ID,
        templateId: !!config.TEMPLATE_ID_PROMOTIONAL,
        accessToken: !!config.ACCESS_TOKEN,
        publicKey: !!config.PUBLIC_KEY,
      });
      return { success: false, error: 'Email service not configured. Need EMAILJS_ACCESS_TOKEN for server-side or NEXT_PUBLIC_EMAILJS_PUBLIC_KEY for client-side.' };
    }

    // EmailJS template parameters
    // Note: The recipient email must be configured in your EmailJS template settings
    // OR you can use these common parameter names that EmailJS recognizes
    const templateParams: any = {
      to_email: params.to_email,
      to_name: params.to_name,
      reply_to: params.to_email, // Some templates use reply_to for recipient
      email: params.to_email, // Alternative parameter name
      user_email: params.to_email, // Another alternative
      subject: params.subject,
      message: params.message,
      event_name: params.event_name || '',
      event_date: params.event_date || '',
      event_url: params.event_url || '',
    };

    console.log('📧 Sending promotional email via EmailJS:', {
      to: params.to_email,
      subject: params.subject,
    });

    // Use EmailJS REST API for server-side
    // For server-side: use public key as user_id and private key as accessToken
    // For client-side: use public key only
    // Note: EmailJS strict mode requires private key for server-side calls
    const requestBody: any = {
      service_id: config.SERVICE_ID,
      template_id: config.TEMPLATE_ID_PROMOTIONAL,
      user_id: config.PUBLIC_KEY, // Always use public key as user_id
      template_params: templateParams,
    };
    
    // Add private key if available (for server-side strict mode)
    if (config.ACCESS_TOKEN) {
      requestBody.accessToken = config.ACCESS_TOKEN;
      console.log('✅ Using private access token for server-side API call');
    } else {
      console.warn('⚠️ No private access token found - EmailJS may block server-side calls');
      console.warn('   EMAILJS_ACCESS_TOKEN:', process.env.EMAILJS_ACCESS_TOKEN ? 'SET' : 'NOT SET');
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

    const result = await response.json();
    console.log('✅ Promotional email sent successfully:', result);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to send promotional email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

