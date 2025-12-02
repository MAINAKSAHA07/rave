import express from 'express';
import { sendEmail } from '../lib/email';
import QRCode from 'qrcode';

const router = express.Router();

// Test email endpoint (for debugging)
router.post('/test', async (req, res, next) => {
  try {
    const { to, subject, includeQR } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address (to) is required' });
    }

    // Generate a test QR code if requested
    let qrCodeHtml = '';
    if (includeQR) {
      const testQRUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/t/TEST123456`;
      const qrCodeDataUrl = await QRCode.toDataURL(testQRUrl);
      qrCodeHtml = `<img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 200px; margin: 10px 0;" />`;
    }

    const testSubject = subject || 'Test Email from Rave Ticketing';
    const testHtml = `
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
          <h1>🧪 Test Email</h1>
        </div>
        <div class="content">
          <p>This is a test email from the Rave Ticketing Platform.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          ${qrCodeHtml ? `<div><h3>Test QR Code:</h3>${qrCodeHtml}</div>` : ''}
          <p>If you received this email, your Resend configuration is working correctly!</p>
        </div>
        <div class="footer">
          <p>This is a test email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;

    await sendEmail(to, testSubject, testHtml);
    
    res.json({ 
      success: true, 
      message: `Test email sent to ${to}`,
      config: {
        fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
        fromName: process.env.RESEND_FROM_NAME || 'Rave Ticketing',
        hasApiKey: !!process.env.RESEND_API_KEY,
      }
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      message: error.message,
      details: error.response?.data || error,
      config: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL,
        fromName: process.env.RESEND_FROM_NAME,
      }
    });
  }
});

export default router;

