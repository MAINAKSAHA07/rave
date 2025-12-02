const { config } = require('dotenv');
const path = require('path');

// Load .env from root directory (parent of backoffice)
config({ path: path.resolve(__dirname, '../.env') });

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
    unoptimized: process.env.NODE_ENV === 'production', // Disable image optimization for static export if needed
  },
  env: {
    NEXT_PUBLIC_POCKETBASE_URL: process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8092',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig



