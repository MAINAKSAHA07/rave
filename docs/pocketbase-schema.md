# PocketBase Schema Design

This document describes all collections, fields, indexes, and access rules for the Rave ticketing platform.

## Collections Overview

1. **users** - Customer accounts
2. **organizers** - Organizer accounts and details
3. **organizer_staff** - Staff members linked to organizers with roles
4. **organizer_applications** - Pending organizer applications
5. **venues** - Venue information
6. **seats** - Seat definitions for seated venues
7. **events** - Event information
8. **ticket_types** - Ticket type definitions per event
9. **orders** - Customer orders
10. **tickets** - Individual ticket records
11. **refunds** - Refund records
12. **payouts** - Payout records to organizers
13. **email_templates** - Email template configurations
14. **event_reminders** - Event reminder configurations

---

## Collection Details

### 1. users

**Description**: Customer accounts (extends PocketBase's built-in `users` collection)

**Fields**:
- `id` (text, auto) - Primary key
- `email` (email, required, unique)
- `emailVisibility` (bool, default: false)
- `username` (text, unique)
- `verified` (bool, default: false)
- `name` (text, required)
- `phone` (text, required)
- `avatar` (file)
- `role` (select: customer, admin, super_admin, default: customer)
- `blocked` (bool, default: false)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_users_email` on `email`
- `idx_users_phone` on `phone`
- `idx_users_role` on `role`

**Access Rules**:
- List: Authenticated users can list (filtered)
- View: Users can view own record; admins can view all
- Create: Public (signup)
- Update: Users can update own record; admins can update all
- Delete: Admin only

---

### 2. organizers

**Description**: Organizer accounts and business details

**Fields**:
- `id` (text, auto)
- `name` (text, required)
- `email` (email, required, unique)
- `phone` (text, required)
- `gst_number` (text, optional)
- `bank_account_number` (text, optional)
- `bank_ifsc` (text, optional)
- `bank_name` (text, optional)
- `bank_account_holder_name` (text, optional)
- `address` (text)
- `city` (text)
- `state` (text)
- `pincode` (text)
- `status` (select: pending, approved, rejected, blocked, default: pending)
- `approved_by` (relation: users, optional)
- `approved_at` (date, optional)
- `logo` (file)
- `description` (text)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_organizers_email` on `email`
- `idx_organizers_status` on `status`
- `idx_organizers_city` on `city`

**Access Rules**:
- List: Organizer staff can list own organizer; admins can list all
- View: Organizer staff can view own organizer; admins can view all
- Create: Public (via application form)
- Update: Organizer owner/organizer role; admins can update all
- Delete: Admin only

---

### 3. organizer_staff

**Description**: Staff members linked to organizers with roles

**Fields**:
- `id` (text, auto)
- `organizer_id` (relation: organizers, required)
- `user_id` (relation: users, required)
- `role` (select: owner, organizer, marketer, volunteer, required)
- `invited_by` (relation: users, optional)
- `invited_at` (date, auto)
- `status` (select: pending, active, removed, default: pending)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_organizer_staff_organizer` on `organizer_id`
- `idx_organizer_staff_user` on `user_id`
- `idx_organizer_staff_role` on `role`
- Unique: `(organizer_id, user_id)`

**Access Rules**:
- List: Organizer staff can list for own organizer; admins can list all
- View: Organizer staff can view for own organizer; admins can view all
- Create: Organizer owner/organizer role; admins
- Update: Organizer owner/organizer role; admins
- Delete: Organizer owner/organizer role (cannot remove owner); admins

---

### 4. organizer_applications

**Description**: Pending organizer applications

**Fields**:
- `id` (text, auto)
- `name` (text, required)
- `email` (email, required)
- `phone` (text, required)
- `gst_number` (text, optional)
- `event_description` (text, required)
- `status` (select: pending, approved, rejected, default: pending)
- `reviewed_by` (relation: users, optional)
- `reviewed_at` (date, optional)
- `review_notes` (text, optional)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_organizer_applications_status` on `status`
- `idx_organizer_applications_email` on `email`

**Access Rules**:
- List: Admins only
- View: Admins only
- Create: Public
- Update: Admins only
- Delete: Admins only

---

### 5. venues

**Description**: Venue information

**Fields**:
- `id` (text, auto)
- `organizer_id` (relation: organizers, required)
- `name` (text, required)
- `address` (text, required)
- `city` (text, required)
- `state` (text, required)
- `pincode` (text, required)
- `capacity` (number, required)
- `layout_type` (select: GA, SEATED, required)
- `layout_image` (file, optional)
- `latitude` (number, optional)
- `longitude` (number, optional)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_venues_organizer` on `organizer_id`
- `idx_venues_city` on `city`
- `idx_venues_layout_type` on `layout_type`

**Access Rules**:
- List: Public (for published events); Organizer staff can list own venues
- View: Public (for published events); Organizer staff can view own venues
- Create: Organizer owner/organizer role
- Update: Organizer owner/organizer role
- Delete: Organizer owner/organizer role (if no events use it)

---

### 6. seats

**Description**: Seat definitions for seated venues

**Fields**:
- `id` (text, auto)
- `venue_id` (relation: venues, required)
- `section` (text, required)
- `row` (text, required)
- `seat_number` (text, required)
- `label` (text, required) - Display label (e.g., "A1", "VIP-1")
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_seats_venue` on `venue_id`
- Unique: `(venue_id, section, row, seat_number)`

**Access Rules**:
- List: Organizer staff for venue's organizer; admins
- View: Organizer staff for venue's organizer; admins
- Create: Organizer owner/organizer role
- Update: Organizer owner/organizer role
- Delete: Organizer owner/organizer role (if not sold)

---

### 7. events

**Description**: Event information

**Fields**:
- `id` (text, auto)
- `organizer_id` (relation: organizers, required)
- `venue_id` (relation: venues, required)
- `name` (text, required)
- `description` (text)
- `category` (select: concert, comedy, nightlife, workshop, sports, theatre, festival, other, required)
- `start_date` (date, required)
- `end_date` (date, required)
- `status` (select: draft, published, cancelled, default: draft)
- `is_internal` (bool, default: false) - Platform-owned event
- `cover_image` (file)
- `images` (file, multiple)
- `city` (text, required)
- `tags` (json, optional) - Array of tags
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_events_organizer` on `organizer_id`
- `idx_events_venue` on `venue_id`
- `idx_events_status` on `status`
- `idx_events_category` on `category`
- `idx_events_city` on `city`
- `idx_events_start_date` on `start_date`
- Composite: `(status, city, start_date)` for listing

**Access Rules**:
- List: Public can list published events; Organizer staff can list own events
- View: Public can view published events; Organizer staff can view own events
- Create: Organizer owner/organizer role; admins (for internal events)
- Update: Organizer owner/organizer role; admins
- Delete: Organizer owner/organizer role (if no orders); admins

---

### 8. ticket_types

**Description**: Ticket type definitions per event

**Fields**:
- `id` (text, auto)
- `event_id` (relation: events, required)
- `name` (text, required) - e.g., "Early Bird", "VIP", "General"
- `description` (text, optional)
- `base_price_minor` (number, required) - Price in minor units (paise)
- `gst_rate` (number, required) - GST percentage (e.g., 18)
- `gst_amount_minor` (number, required) - GST amount in minor units
- `final_price_minor` (number, required) - Total price in minor units
- `currency` (text, required, default: INR)
- `initial_quantity` (number, required)
- `remaining_quantity` (number, required)
- `sales_start` (date, required)
- `sales_end` (date, required)
- `max_per_order` (number, default: 10)
- `max_per_user_per_event` (number, optional) - Override per-user limit for this type
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_ticket_types_event` on `event_id`
- `idx_ticket_types_sales` on `(sales_start, sales_end)`

**Access Rules**:
- List: Public can list for published events; Organizer staff can list for own events
- View: Public can view for published events; Organizer staff can view for own events
- Create: Organizer owner/organizer role; admins
- Update: Organizer owner/organizer role (cannot change price if orders exist); admins
- Delete: Organizer owner/organizer role (if no orders); admins

---

### 9. orders

**Description**: Customer orders

**Fields**:
- `id` (text, auto)
- `user_id` (relation: users, required)
- `event_id` (relation: events, required)
- `order_number` (text, required, unique) - Human-readable order number
- `status` (select: pending, paid, failed, cancelled, refunded, partial_refunded, required)
- `total_amount_minor` (number, required)
- `currency` (text, required, default: INR)
- `razorpay_order_id` (text, optional) - Razorpay order ID
- `razorpay_payment_id` (text, optional) - Razorpay payment ID
- `razorpay_signature` (text, optional) - Payment signature
- `refunded_amount_minor` (number, default: 0)
- `attendee_name` (text, optional)
- `attendee_email` (email, optional)
- `attendee_phone` (text, optional)
- `created` (date, auto)
- `updated` (date, auto)
- `paid_at` (date, optional)

**Indexes**:
- `idx_orders_user` on `user_id`
- `idx_orders_event` on `event_id`
- `idx_orders_status` on `status`
- `idx_orders_order_number` on `order_number`
- `idx_orders_razorpay_order` on `razorpay_order_id`

**Access Rules**:
- List: Users can list own orders; Organizer staff can list for own events; admins can list all
- View: Users can view own orders; Organizer staff can view for own events; admins can view all
- Create: Public (via backend service)
- Update: Backend service only (via webhook/auth)
- Delete: Admin only

---

### 10. tickets

**Description**: Individual ticket records

**Fields**:
- `id` (text, auto)
- `order_id` (relation: orders, required)
- `event_id` (relation: events, required)
- `ticket_type_id` (relation: ticket_types, required)
- `seat_id` (relation: seats, optional) - For seated events
- `ticket_code` (text, required, unique) - Unique ticket identifier
- `status` (select: pending, issued, checked_in, cancelled, required)
- `checked_in_at` (date, optional)
- `checked_in_by` (relation: users, optional) - Staff member who checked in
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_tickets_order` on `order_id`
- `idx_tickets_event` on `event_id`
- `idx_tickets_ticket_type` on `ticket_type_id`
- `idx_tickets_seat` on `seat_id`
- `idx_tickets_ticket_code` on `ticket_code`
- `idx_tickets_status` on `status`
- Composite: `(event_id, status)` for check-in queries

**Access Rules**:
- List: Users can list own tickets; Organizer staff can list for own events; admins can list all
- View: Users can view own tickets; Organizer staff can view for own events; admins can view all
- Create: Backend service only
- Update: Backend service (check-in); admins
- Delete: Admin only

---

### 11. refunds

**Description**: Refund records

**Fields**:
- `id` (text, auto)
- `order_id` (relation: orders, required)
- `organizer_id` (relation: organizers, optional) - Who requested (if organizer)
- `requested_by` (relation: users, required) - User who requested
- `amount_minor` (number, required)
- `currency` (text, required)
- `reason` (text, optional)
- `status` (select: requested, approved, processing, completed, rejected, failed, required)
- `razorpay_refund_id` (text, optional)
- `approved_by` (relation: users, optional)
- `approved_at` (date, optional)
- `processed_at` (date, optional)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_refunds_order` on `order_id`
- `idx_refunds_organizer` on `organizer_id`
- `idx_refunds_status` on `status`
- `idx_refunds_razorpay_refund` on `razorpay_refund_id`

**Access Rules**:
- List: Organizer staff can list for own events; admins can list all
- View: Organizer staff can view for own events; admins can view all
- Create: Organizer owner/organizer role; super admin
- Update: Admins (approval); backend service (processing)
- Delete: Admin only

---

### 12. payouts

**Description**: Payout records to organizers

**Fields**:
- `id` (text, auto)
- `organizer_id` (relation: organizers, required)
- `event_id` (relation: events, optional) - If per-event payout
- `amount_gross_minor` (number, required)
- `platform_fees_minor` (number, required)
- `gst_on_fees_minor` (number, required)
- `amount_net_minor` (number, required)
- `currency` (text, required, default: INR)
- `settlement_date` (date, required) - Event end + 2 days
- `status` (select: scheduled, processing, paid, failed, required)
- `paid_at` (date, optional)
- `payment_reference` (text, optional) - NEFT/IMPS reference
- `notes` (text, optional)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_payouts_organizer` on `organizer_id`
- `idx_payouts_event` on `event_id`
- `idx_payouts_status` on `status`
- `idx_payouts_settlement_date` on `settlement_date`

**Access Rules**:
- List: Organizer owner/organizer role; admins
- View: Organizer owner/organizer role; admins
- Create: Backend service only
- Update: Admins (status updates)
- Delete: Admin only

---

### 13. email_templates

**Description**: Email template configurations

**Fields**:
- `id` (text, auto)
- `organizer_id` (relation: organizers, optional) - null for global defaults
- `type` (select: signup_verification, password_reset, ticket_confirmation, event_reminder, organizer_sales_daily, organizer_sales_weekly, required)
- `subject_template` (text, required)
- `body_template` (text, required) - Handlebars template
- `is_active` (bool, default: true)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_email_templates_organizer` on `organizer_id`
- `idx_email_templates_type` on `type`
- Unique: `(organizer_id, type)` where organizer_id can be null

**Access Rules**:
- List: Organizer staff can list own templates; admins can list all
- View: Organizer staff can view own templates; admins can view all
- Create: Organizer owner/organizer role (for own); admins (for global)
- Update: Organizer owner/organizer role (for own); admins
- Delete: Admins only

---

### 14. event_reminders

**Description**: Event reminder configurations

**Fields**:
- `id` (text, auto)
- `event_id` (relation: events, required)
- `reminder_offset_hours` (number, required) - Hours before event start (e.g., 24)
- `is_enabled` (bool, default: true)
- `last_sent_at` (date, optional)
- `created` (date, auto)
- `updated` (date, auto)

**Indexes**:
- `idx_event_reminders_event` on `event_id`
- `idx_event_reminders_enabled` on `is_enabled`

**Access Rules**:
- List: Organizer staff for event's organizer; admins
- View: Organizer staff for event's organizer; admins
- Create: Organizer owner/organizer role
- Update: Organizer owner/organizer role
- Delete: Organizer owner/organizer role

---

## Access Rule Patterns

### Role-Based Access Summary

1. **Public (unauthenticated)**:
   - View published events, venues, ticket types
   - Create organizer applications
   - Create user accounts

2. **Customer (authenticated user)**:
   - View own orders, tickets
   - Update own profile

3. **Organizer Owner/Organizer**:
   - Full control of organizer account
   - Manage venues, events, ticket types
   - Manage staff (except removing owner)
   - View analytics and payouts
   - Request refunds
   - Manage email templates

4. **Organizer Marketer**:
   - View analytics
   - Edit event descriptions, images
   - Manage coupons (future)
   - Cannot change prices or issue refunds

5. **Organizer Volunteer**:
   - Only check-in interface access

6. **Admin**:
   - Approve/reject organizer applications
   - View all data
   - Block/unblock users and organizers
   - Approve refunds

7. **Super Admin**:
   - All admin capabilities
   - Force-cancel events
   - Force refunds
   - Override payout rules

---

## Notes

- All monetary values stored in minor units (paise for INR, cents for USD, etc.)
- Currency codes follow ISO 4217
- Dates stored in UTC
- File fields use PocketBase's file storage
- Relations use PocketBase's relation field type
- Access rules implemented via PocketBase's rule syntax

