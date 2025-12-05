try {
  const { config } = require('dotenv');
  const path = require('path');
  // Load .env from root directory (parent of backoffice)
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
    unoptimized: process.env.NODE_ENV === 'production', // Disable image optimization for static export if needed
  },
  env: {
    // Server-side only - not exposed to client
    POCKETBASE_URL: (() => {
      // Priority: AWS_POCKETBASE_URL > POCKETBASE_URL > NEXT_PUBLIC_POCKETBASE_URL > localhost
      if (process.env.AWS_POCKETBASE_URL) return process.env.AWS_POCKETBASE_URL;
      if (process.env.POCKETBASE_URL) return process.env.POCKETBASE_URL;
      if (process.env.NEXT_PUBLIC_POCKETBASE_URL) return process.env.NEXT_PUBLIC_POCKETBASE_URL;
      return 'http://localhost:8090';
    })(),
    BACKEND_URL: process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://13.201.90.240:3001',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  },
  output: 'standalone',
}

module.exports = nextConfig



