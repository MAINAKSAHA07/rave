# Resend Email Configuration Guide

## Issue: Emails Not Sending

If you're not receiving emails, it's likely because Resend doesn't allow sending from Gmail, Yahoo, or other public email providers.

## Solution Options

### Option 1: Use Resend's Test Email (For Development/Testing)

For testing purposes, you can use Resend's test email address:

1. Update your `.env` file:
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Rave Ticketing
```

2. Restart your backend server

**Note:** This is only for testing. For production, you need a verified domain.

### Option 2: Verify Your Custom Domain (Recommended for Production)

1. **Get a domain** (if you don't have one):
   - Purchase a domain from providers like Namecheap, GoDaddy, etc.
   - Example: `rave-tickets.com`

2. **Add domain to Resend**:
   - Go to https://resend.com/domains
   - Click "Add Domain"
   - Enter your domain name

3. **Verify your domain**:
   - Resend will provide DNS records to add
   - Add these records to your domain's DNS settings:
     - SPF record
     - DKIM records
     - DMARC record (optional but recommended)
   - Wait for verification (usually takes a few minutes)

4. **Update your `.env` file**:
```bash
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Rave Ticketing
```

5. **Restart your backend server**

### Option 3: Use a Subdomain

If you have a main domain, you can use a subdomain:

1. Add a subdomain in your DNS (e.g., `mail.rave-tickets.com`)
2. Verify it in Resend
3. Use `noreply@mail.rave-tickets.com` as your from email

## Testing Email Configuration

Run the test script to verify your configuration:

```bash
node scripts/test-resend.js your-email@example.com
```

This will:
- Check your Resend API key
- Test sending an email with a QR code
- Show any configuration errors

## Current Configuration

Check your current configuration:

```bash
grep RESEND .env
```

## Troubleshooting

### Error: "The gmail.com domain is not verified"
- **Solution:** Use a custom domain or Resend's test email (onboarding@resend.dev)

### Error: "Invalid API key"
- **Solution:** Check that your `RESEND_API_KEY` in `.env` is correct
- Get your API key from: https://resend.com/api-keys

### Error: "Domain not verified"
- **Solution:** Complete the domain verification process in Resend dashboard
- Make sure all DNS records are correctly added

## Quick Fix for Testing

To quickly test email functionality, update your `.env`:

```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

Then restart the backend and try sending a test email.

