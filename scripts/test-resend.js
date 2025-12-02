require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Resend } = require('resend');
const QRCode = require('qrcode');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResend() {
  console.log('Testing Resend Configuration...\n');
  
  // Check configuration
  console.log('Configuration:');
  console.log('  RESEND_API_KEY:', process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('  RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'NOT SET');
  console.log('  RESEND_FROM_NAME:', process.env.RESEND_FROM_NAME || 'NOT SET');
  console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
  console.log('');

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in .env file');
    process.exit(1);
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    console.error('❌ RESEND_FROM_EMAIL is not set in .env file');
    process.exit(1);
  }

  const testEmail = process.argv[2] || process.env.RESEND_FROM_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME || 'Rave Ticketing';
  const fromAddress = `${fromName} <${fromEmail}>`;

  console.log(`Sending test email to: ${testEmail}`);
  console.log(`From: ${fromAddress}\n`);

  // Generate a test QR code
  const testQRUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/t/TEST123456`;
  const qrCodeDataUrl = await QRCode.toDataURL(testQRUrl);

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
        <h1>🧪 Resend Test Email</h1>
      </div>
      <div class="content">
        <p>This is a test email to verify Resend configuration.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <div>
          <h3>Test QR Code:</h3>
          <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 200px; margin: 10px 0;" />
          <p><strong>QR URL:</strong> ${testQRUrl}</p>
        </div>
        <p>If you received this email, your Resend configuration is working correctly! ✅</p>
      </div>
      <div class="footer">
        <p>This is a test email. Please do not reply.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: testEmail,
      subject: '🧪 Resend Test Email - Rave Ticketing',
      html: testHtml,
    });

    if (result.error) {
      console.error('❌ Email sending failed:');
      console.error('Error:', JSON.stringify(result.error, null, 2));
      
      if (result.error.statusCode === 403) {
        console.error('\n💡 IMPORTANT: The from email domain is not verified in Resend.');
        console.error('   Options:');
        console.error('   1. Verify your domain at: https://resend.com/domains');
        console.error('   2. Use Resend\'s test email: onboarding@resend.dev (for testing only)');
        console.error('   3. Use a custom domain you own and verify it in Resend');
      }
      process.exit(1);
    } else {
      console.log('✅ Email sent successfully!');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\n📧 Check your inbox at:', testEmail);
    }
  } catch (error) {
    console.error('❌ Failed to send email:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.response?.status === 403) {
      console.error('\n💡 Tip: The from email address needs to be verified in your Resend dashboard.');
      console.error('   Go to: https://resend.com/domains to verify your domain or email.');
    } else if (error.response?.status === 401) {
      console.error('\n💡 Tip: Check that your RESEND_API_KEY is correct in the .env file.');
    }
    
    process.exit(1);
  }
}

testResend();

