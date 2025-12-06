# Rave - Event Ticketing Platform

A modern event ticketing platform for India with multi-currency support, built with PocketBase, Node.js, and Next.js.

<!-- Developed by mainak saha -->

## Architecture

- **Backend Database & Auth**: PocketBase (Port 8092)
- **Business Logic Service**: Node.js (Port 3001)
- **Customer Frontend**: Next.js (Port 3000)
- **Backoffice Frontend**: Next.js (Port 3001) - Organizer & Admin Dashboard
- **Payments**: Razorpay
- **Emails**: Resend
- **Analytics**: D3.js

## Project Structure

```
Rave/
├── backend/          # Node.js service (Port 3001)
├── frontend/         # Customer-facing Next.js app (Port 3000)
├── backoffice/       # Organizer/Admin Next.js app (Port 3001)
├── pocketbase/       # PocketBase schema and migrations
└── docs/            # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- PocketBase (download from https://pocketbase.io)
- Razorpay account
- Resend account

### Setup

1. Install dependencies:

```bash
npm ci
```

2. Set up PocketBase:

```bash
cd pocketbase
./pocketbase serve --http=127.0.0.1:8092
# Run migration: node run-migration.js
```

3. Configure environment variables (see `.env` file in root)
4. Run development servers:

```bash
npm run dev
```

This will start:

- Backend API on http://localhost:3001
- Customer frontend on http://localhost:3000
- Backoffice on http://localhost:3001

## Port Configuration

- **PocketBase**: 127.0.0.1:8090 (Docker) or 8092 (legacy)
- **Backend API**: localhost:3001
- **Customer Frontend**: localhost:3000
- **Backoffice**: localhost:3001

## Features

- Multi-currency support (default INR)
- GST-inclusive pricing and payouts
- General admission and seated events
- Organizer onboarding and management
- Role-based access (owner, organizer, marketer, volunteer)
- QR code check-in system
- Refund management
- Automated payouts (T+2 settlement)
- Email templates and reminders
- Analytics dashboards

## Documentation

See `/docs` for detailed documentation on:

- PocketBase schema
- API endpoints
- Deployment guide
- Development guide
