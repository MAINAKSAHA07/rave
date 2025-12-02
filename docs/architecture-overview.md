# Architecture Overview

## System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│   Port: 3000    │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐  ┌─────▼──────┐
│   Backend API   │  │ PocketBase │
│   (Node.js)     │  │ Port: 8092 │
│   Port: 3001    │  │            │
└────────┬────────┘  └────────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐  ┌────▼──────┐
│   Razorpay      │  │  Resend    │
│   (Payments)    │  │  (Emails)  │
└─────────────────┘  └────────────┘
```

## Data Flow

### Ticket Purchase Flow

1. Customer selects tickets on frontend
2. Frontend calls `/api/orders` (backend)
3. Backend validates order and creates pending order in PocketBase
4. Backend creates Razorpay order
5. Frontend opens Razorpay Checkout
6. Customer completes payment
7. Razorpay sends webhook to `/api/payments/webhook`
8. Backend confirms order, issues tickets, sends email
9. Customer receives confirmation email with QR codes

### Check-In Flow

1. Organizer staff logs in and selects event
2. Opens QR scanner interface
3. Scans ticket QR code
4. Frontend sends ticket code to `/api/checkin/scan`
5. Backend validates ticket and marks as checked-in
6. UI updates with success/error message

### Payout Flow

1. Event ends
2. Scheduled job runs daily (2 AM)
3. For events past end date + 2 days:
   - Calculate gross revenue
   - Calculate platform fees and GST
   - Create payout record in PocketBase
   - Mark as "scheduled"
4. Admin manually processes payout (NEFT/IMPS)
5. Admin updates payout status to "paid"

## Key Components

### Backend Service (`/backend`)

- **Routes**: Express.js routes for orders, payments, refunds, check-in
- **Services**: Business logic for orders, payouts
- **Jobs**: Scheduled tasks (cron) for reminders, payouts, reports
- **Lib**: Utilities for PocketBase, Razorpay, Resend

### Frontend (`/frontend`)

- **Pages**: Next.js pages for customers, organizers, admins
- **Components**: Reusable UI components
- **Lib**: PocketBase client, API client

### PocketBase (`/pocketbase`)

- **Collections**: All data models
- **Access Rules**: Role-based access control
- **Auth**: User authentication

## Security Considerations

1. **Authentication**: PocketBase handles user auth
2. **Authorization**: Access rules in PocketBase collections
3. **Payment Security**: Razorpay webhook signature verification
4. **API Security**: Backend validates all requests
5. **QR Codes**: Unique ticket codes prevent duplication

## Scalability

- **Horizontal Scaling**: Backend can run multiple instances
- **Database**: PocketBase can be scaled or migrated to PostgreSQL
- **File Storage**: PocketBase files can be migrated to S3
- **Caching**: Add Redis for frequently accessed data
- **CDN**: Use Cloudflare for static assets

## Monitoring

- **Logs**: PM2 logs for backend, Next.js logs for frontend
- **Errors**: Error tracking (Sentry recommended)
- **Metrics**: Track orders, revenue, check-ins
- **Alerts**: Set up alerts for failed payments, webhooks

