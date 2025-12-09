try {
  const { config } = require('dotenv');
  const path = require('path');
  // Load .env from root directory (parent of frontend)
  config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {
  // dotenv not found or failed, ignore
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Support both local and AWS environments
    domains: (() => {
      const domains = ['localhost', '127.0.0.1'];
      // Add AWS server IP if provided
      if (process.env.SERVER_IP) {
        domains.push(process.env.SERVER_IP);
      }
      // Add PocketBase URL domain if it's a custom domain
      const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
      if (pbUrl) {
        try {
          const url = new URL(pbUrl);
          if (url.hostname && !domains.includes(url.hostname)) {
            domains.push(url.hostname);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
      return domains;
    })(),
    // Allow remote patterns for dynamic domains
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    // Server-side only - not exposed to client
    // Auto-detect AWS URL from NEXT_PUBLIC_POCKETBASE_URL if it contains AWS server IP
    AWS_POCKETBASE_URL: (() => {
      // If explicitly set, use it
      if (process.env.AWS_POCKETBASE_URL) return process.env.AWS_POCKETBASE_URL;
      // If NEXT_PUBLIC_POCKETBASE_URL points to AWS server, use it as AWS_POCKETBASE_URL
      if (process.env.NEXT_PUBLIC_POCKETBASE_URL && process.env.NEXT_PUBLIC_POCKETBASE_URL.includes('13.201.90.240')) {
        return process.env.NEXT_PUBLIC_POCKETBASE_URL;
      }
      return '';
    })(),
    POCKETBASE_URL: (() => {
      // Priority: AWS_POCKETBASE_URL > POCKETBASE_URL > NEXT_PUBLIC_POCKETBASE_URL > localhost
      if (process.env.AWS_POCKETBASE_URL) return process.env.AWS_POCKETBASE_URL;
      // Auto-detect AWS URL from NEXT_PUBLIC_POCKETBASE_URL
      if (process.env.NEXT_PUBLIC_POCKETBASE_URL && process.env.NEXT_PUBLIC_POCKETBASE_URL.includes('13.201.90.240')) {
        return process.env.NEXT_PUBLIC_POCKETBASE_URL;
      }
      if (process.env.POCKETBASE_URL) return process.env.POCKETBASE_URL;
      if (process.env.NEXT_PUBLIC_POCKETBASE_URL) return process.env.NEXT_PUBLIC_POCKETBASE_URL;
      return 'http://localhost:8090';
    })(),
    // PocketBase admin credentials (server-side only)
    // Priority: AWS-prefixed vars (for production) > regular vars (for local)
    POCKETBASE_ADMIN_EMAIL: process.env.AWS_POCKETBASE_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || '',
    POCKETBASE_ADMIN_PASSWORD: process.env.AWS_POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || '',
    // Also expose AWS-prefixed vars directly for code that checks them
    AWS_POCKETBASE_ADMIN_EMAIL: process.env.AWS_POCKETBASE_ADMIN_EMAIL || '',
    AWS_POCKETBASE_ADMIN_PASSWORD: process.env.AWS_POCKETBASE_ADMIN_PASSWORD || '',
    // Razorpay credentials (server-side only)
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
    // Public environment variables (exposed to client-side)
    NEXT_PUBLIC_POCKETBASE_URL: process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    // EmailJS configuration (public for client-side, but also used server-side)
    NEXT_PUBLIC_EMAILJS_SERVICE_ID: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
    NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_TICKET_CONFIRMATION: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_TICKET_CONFIRMATION || '',
    NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PROMOTIONAL: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PROMOTIONAL || '',
    NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '',
    // EmailJS private access token for server-side API calls (not exposed to client)
    EMAILJS_ACCESS_TOKEN: process.env.EMAILJS_ACCESS_TOKEN || '',
  },
  // Only use standalone output for production builds
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
}

module.exports = nextConfig

