/**
 * PocketBase Migration: Initial Schema
 * 
 * This migration creates all collections for the Rave ticketing platform.
 * Run this after initializing PocketBase.
 * 
 * Note: PocketBase doesn't have built-in migrations, so this is a reference script.
 * You'll need to create collections manually via the admin UI or use the PocketBase SDK.
 */

// This is a reference document. Actual implementation would use PocketBase Admin SDK
// or manual creation via the admin UI.

const collections = [
  {
    name: 'organizers',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true, unique: true },
      { name: 'phone', type: 'text', required: true },
      { name: 'gst_number', type: 'text' },
      { name: 'bank_account_number', type: 'text' },
      { name: 'bank_ifsc', type: 'text' },
      { name: 'bank_name', type: 'text' },
      { name: 'bank_account_holder_name', type: 'text' },
      { name: 'address', type: 'text' },
      { name: 'city', type: 'text' },
      { name: 'state', type: 'text' },
      { name: 'pincode', type: 'text' },
      { name: 'status', type: 'select', options: { values: ['pending', 'approved', 'rejected', 'blocked'] }, defaultValue: 'pending' },
      { name: 'approved_by', type: 'relation', options: { collectionId: '_pb_users_auth_', cascadeDelete: false } },
      { name: 'approved_at', type: 'date' },
      { name: 'logo', type: 'file', options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] } },
      { name: 'description', type: 'text' }
    ],
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['status'] },
      { fields: ['city'] }
    ]
  },
  {
    name: 'organizer_staff',
    type: 'base',
    schema: [
      { name: 'organizer_id', type: 'relation', required: true, options: { collectionId: 'organizers', cascadeDelete: true } },
      { name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true } },
      { name: 'role', type: 'select', required: true, options: { values: ['owner', 'organizer', 'marketer', 'volunteer'] } },
      { name: 'invited_by', type: 'relation', options: { collectionId: '_pb_users_auth_', cascadeDelete: false } },
      { name: 'status', type: 'select', options: { values: ['pending', 'active', 'removed'] }, defaultValue: 'pending' }
    ],
    indexes: [
      { fields: ['organizer_id'] },
      { fields: ['user_id'] },
      { fields: ['role'] },
      { fields: ['organizer_id', 'user_id'], unique: true }
    ]
  },
  {
    name: 'organizer_applications',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'phone', type: 'text', required: true },
      { name: 'gst_number', type: 'text' },
      { name: 'event_description', type: 'text', required: true },
      { name: 'status', type: 'select', options: { values: ['pending', 'approved', 'rejected'] }, defaultValue: 'pending' },
      { name: 'reviewed_by', type: 'relation', options: { collectionId: '_pb_users_auth_', cascadeDelete: false } },
      { name: 'reviewed_at', type: 'date' },
      { name: 'review_notes', type: 'text' }
    ],
    indexes: [
      { fields: ['status'] },
      { fields: ['email'] }
    ]
  },
  {
    name: 'venues',
    type: 'base',
    schema: [
      { name: 'organizer_id', type: 'relation', required: true, options: { collectionId: 'organizers', cascadeDelete: true } },
      { name: 'name', type: 'text', required: true },
      { name: 'address', type: 'text', required: true },
      { name: 'city', type: 'text', required: true },
      { name: 'state', type: 'text', required: true },
      { name: 'pincode', type: 'text', required: true },
      { name: 'capacity', type: 'number', required: true },
      { name: 'layout_type', type: 'select', required: true, options: { values: ['GA', 'SEATED'] } },
      { name: 'layout_image', type: 'file', options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] } },
      { name: 'latitude', type: 'number' },
      { name: 'longitude', type: 'number' }
    ],
    indexes: [
      { fields: ['organizer_id'] },
      { fields: ['city'] },
      { fields: ['layout_type'] }
    ]
  },
  {
    name: 'seats',
    type: 'base',
    schema: [
      { name: 'venue_id', type: 'relation', required: true, options: { collectionId: 'venues', cascadeDelete: true } },
      { name: 'section', type: 'text', required: true },
      { name: 'row', type: 'text', required: true },
      { name: 'seat_number', type: 'text', required: true },
      { name: 'label', type: 'text', required: true }
    ],
    indexes: [
      { fields: ['venue_id'] },
      { fields: ['venue_id', 'section', 'row', 'seat_number'], unique: true }
    ]
  },
  {
    name: 'events',
    type: 'base',
    schema: [
      { name: 'organizer_id', type: 'relation', required: true, options: { collectionId: 'organizers', cascadeDelete: true } },
      { name: 'venue_id', type: 'relation', required: true, options: { collectionId: 'venues', cascadeDelete: false } },
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'category', type: 'select', required: true, options: { values: ['concert', 'comedy', 'nightlife', 'workshop', 'sports', 'theatre', 'festival', 'other'] } },
      { name: 'start_date', type: 'date', required: true },
      { name: 'end_date', type: 'date', required: true },
      { name: 'status', type: 'select', options: { values: ['draft', 'published', 'cancelled'] }, defaultValue: 'draft' },
      { name: 'is_internal', type: 'bool', defaultValue: false },
      { name: 'cover_image', type: 'file', options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] } },
      { name: 'images', type: 'file', options: { maxSelect: 10, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] } },
      { name: 'city', type: 'text', required: true },
      { name: 'tags', type: 'json' }
    ],
    indexes: [
      { fields: ['organizer_id'] },
      { fields: ['venue_id'] },
      { fields: ['status'] },
      { fields: ['category'] },
      { fields: ['city'] },
      { fields: ['start_date'] },
      { fields: ['status', 'city', 'start_date'] }
    ]
  },
  {
    name: 'ticket_types',
    type: 'base',
    schema: [
      { name: 'event_id', type: 'relation', required: true, options: { collectionId: 'events', cascadeDelete: true } },
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'base_price_minor', type: 'number', required: true },
      { name: 'gst_rate', type: 'number', required: true },
      { name: 'gst_amount_minor', type: 'number', required: true },
      { name: 'final_price_minor', type: 'number', required: true },
      { name: 'currency', type: 'text', required: true, defaultValue: 'INR' },
      { name: 'initial_quantity', type: 'number', required: true },
      { name: 'remaining_quantity', type: 'number', required: true },
      { name: 'sales_start', type: 'date', required: true },
      { name: 'sales_end', type: 'date', required: true },
      { name: 'max_per_order', type: 'number', defaultValue: 10 },
      { name: 'max_per_user_per_event', type: 'number' }
    ],
    indexes: [
      { fields: ['event_id'] },
      { fields: ['sales_start', 'sales_end'] }
    ]
  },
  {
    name: 'orders',
    type: 'base',
    schema: [
      { name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: false } },
      { name: 'event_id', type: 'relation', required: true, options: { collectionId: 'events', cascadeDelete: false } },
      { name: 'order_number', type: 'text', required: true, unique: true },
      { name: 'status', type: 'select', required: true, options: { values: ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'partial_refunded'] } },
      { name: 'total_amount_minor', type: 'number', required: true },
      { name: 'currency', type: 'text', required: true, defaultValue: 'INR' },
      { name: 'razorpay_order_id', type: 'text' },
      { name: 'razorpay_payment_id', type: 'text' },
      { name: 'razorpay_signature', type: 'text' },
      { name: 'refunded_amount_minor', type: 'number', defaultValue: 0 },
      { name: 'attendee_name', type: 'text' },
      { name: 'attendee_email', type: 'email' },
      { name: 'attendee_phone', type: 'text' },
      { name: 'paid_at', type: 'date' }
    ],
    indexes: [
      { fields: ['user_id'] },
      { fields: ['event_id'] },
      { fields: ['status'] },
      { fields: ['order_number'], unique: true },
      { fields: ['razorpay_order_id'] }
    ]
  },
  {
    name: 'tickets',
    type: 'base',
    schema: [
      { name: 'order_id', type: 'relation', required: true, options: { collectionId: 'orders', cascadeDelete: true } },
      { name: 'event_id', type: 'relation', required: true, options: { collectionId: 'events', cascadeDelete: false } },
      { name: 'ticket_type_id', type: 'relation', required: true, options: { collectionId: 'ticket_types', cascadeDelete: false } },
      { name: 'seat_id', type: 'relation', options: { collectionId: 'seats', cascadeDelete: false } },
      { name: 'ticket_code', type: 'text', required: true, unique: true },
      { name: 'status', type: 'select', required: true, options: { values: ['pending', 'issued', 'checked_in', 'cancelled'] } },
      { name: 'checked_in_at', type: 'date' },
      { name: 'checked_in_by', type: 'relation', options: { collectionId: '_pb_users_auth_', cascadeDelete: false } }
    ],
    indexes: [
      { fields: ['order_id'] },
      { fields: ['event_id'] },
      { fields: ['ticket_type_id'] },
      { fields: ['seat_id'] },
      { fields: ['ticket_code'], unique: true },
      { fields: ['status'] },
      { fields: ['event_id', 'status'] }
    ]
  },
  {
    name: 'refunds',
    type: 'base',
    schema: [
      { name: 'order_id', type: 'relation', required: true, options: { collectionId: 'orders', cascadeDelete: false } },
      { name: 'organizer_id', type: 'relation', options: { collectionId: 'organizers', cascadeDelete: false } },
      { name: 'requested_by', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: false } },
      { name: 'amount_minor', type: 'number', required: true },
      { name: 'currency', type: 'text', required: true },
      { name: 'reason', type: 'text' },
      { name: 'status', type: 'select', required: true, options: { values: ['requested', 'approved', 'processing', 'completed', 'rejected', 'failed'] } },
      { name: 'razorpay_refund_id', type: 'text' },
      { name: 'approved_by', type: 'relation', options: { collectionId: '_pb_users_auth_', cascadeDelete: false } },
      { name: 'approved_at', type: 'date' },
      { name: 'processed_at', type: 'date' }
    ],
    indexes: [
      { fields: ['order_id'] },
      { fields: ['organizer_id'] },
      { fields: ['status'] },
      { fields: ['razorpay_refund_id'] }
    ]
  },
  {
    name: 'payouts',
    type: 'base',
    schema: [
      { name: 'organizer_id', type: 'relation', required: true, options: { collectionId: 'organizers', cascadeDelete: true } },
      { name: 'event_id', type: 'relation', options: { collectionId: 'events', cascadeDelete: false } },
      { name: 'amount_gross_minor', type: 'number', required: true },
      { name: 'platform_fees_minor', type: 'number', required: true },
      { name: 'gst_on_fees_minor', type: 'number', required: true },
      { name: 'amount_net_minor', type: 'number', required: true },
      { name: 'currency', type: 'text', required: true, defaultValue: 'INR' },
      { name: 'settlement_date', type: 'date', required: true },
      { name: 'status', type: 'select', required: true, options: { values: ['scheduled', 'processing', 'paid', 'failed'] } },
      { name: 'paid_at', type: 'date' },
      { name: 'payment_reference', type: 'text' },
      { name: 'notes', type: 'text' }
    ],
    indexes: [
      { fields: ['organizer_id'] },
      { fields: ['event_id'] },
      { fields: ['status'] },
      { fields: ['settlement_date'] }
    ]
  },
  {
    name: 'email_templates',
    type: 'base',
    schema: [
      { name: 'organizer_id', type: 'relation', options: { collectionId: 'organizers', cascadeDelete: true } },
      { name: 'type', type: 'select', required: true, options: { values: ['signup_verification', 'password_reset', 'ticket_confirmation', 'event_reminder', 'organizer_sales_daily', 'organizer_sales_weekly'] } },
      { name: 'subject_template', type: 'text', required: true },
      { name: 'body_template', type: 'text', required: true },
      { name: 'is_active', type: 'bool', defaultValue: true }
    ],
    indexes: [
      { fields: ['organizer_id'] },
      { fields: ['type'] },
      { fields: ['organizer_id', 'type'], unique: true }
    ]
  },
  {
    name: 'event_reminders',
    type: 'base',
    schema: [
      { name: 'event_id', type: 'relation', required: true, options: { collectionId: 'events', cascadeDelete: true } },
      { name: 'reminder_offset_hours', type: 'number', required: true },
      { name: 'is_enabled', type: 'bool', defaultValue: true },
      { name: 'last_sent_at', type: 'date' }
    ],
    indexes: [
      { fields: ['event_id'] },
      { fields: ['is_enabled'] }
    ]
  }
];

module.exports = { collections };

