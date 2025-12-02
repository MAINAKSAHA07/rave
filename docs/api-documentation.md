# API Documentation

## Backend API Endpoints

Base URL: `http://localhost:3001/api`

### Orders

#### Create Order
```
POST /orders
Body: {
  userId: string;
  eventId: string;
  ticketItems: Array<{
    ticketTypeId: string;
    quantity: number;
    seatIds?: string[];
  }>;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
}
```

#### Get Order
```
GET /orders/:orderId
```

#### Get User Orders
```
GET /orders/user/:userId
```

### Payments

#### Razorpay Webhook
```
POST /payments/webhook
Body: Razorpay webhook payload
```

### Refunds

#### Request Refund
```
POST /refunds
Body: {
  orderId: string;
  amountMinor: number;
  reason?: string;
  requestedBy: string;
}
```

#### Approve Refund
```
POST /refunds/:refundId/approve
Body: {
  approvedBy: string;
}
```

### Check-In

#### Scan Ticket
```
POST /checkin/scan
Body: {
  ticketCode: string;
  eventId: string;
  checkedInBy: string;
}
```

#### Get Check-In Stats
```
GET /checkin/stats/:eventId
```

### Admin

#### Approve Organizer Application
```
POST /admin/organizers/:applicationId/approve
Body: {
  approvedBy: string;
}
```

## PocketBase Collections

All PocketBase collections are accessible via the PocketBase REST API:
- Base URL: `http://127.0.0.1:8092/api/collections`

See `/docs/pocketbase-schema.md` for collection details.

