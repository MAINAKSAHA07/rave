# Email Templates

Email templates are stored in the `email_templates` collection in PocketBase. Templates use Handlebars syntax for variable substitution.

## Template Types

1. **signup_verification** - User signup verification
2. **password_reset** - Password reset link
3. **ticket_confirmation** - Ticket purchase confirmation
4. **event_reminder** - Event reminder (24h before)
5. **organizer_sales_daily** - Daily sales report for organizers
6. **organizer_sales_weekly** - Weekly sales report for organizers
7. **refund_completed** - Refund completion notification

## Default Templates

### Ticket Confirmation

**Subject:**
```
Your tickets for {{event_name}}
```

**Body:**
```html
<h1>Ticket Confirmation</h1>
<p>Hi {{user_name}},</p>
<p>Your tickets for <strong>{{event_name}}</strong> have been confirmed!</p>

<h2>Event Details</h2>
<ul>
  <li><strong>Event:</strong> {{event_name}}</li>
  <li><strong>Date:</strong> {{formatDate event_date}}</li>
  <li><strong>Time:</strong> {{formatTime event_time}}</li>
  <li><strong>Venue:</strong> {{venue_name}}</li>
</ul>

<h2>Your Tickets</h2>
{{#each tickets}}
  <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
    <p><strong>Type:</strong> {{this.type}}</p>
    {{#if this.seat}}
      <p><strong>Seat:</strong> {{this.seat}}</p>
    {{/if}}
    <p><strong>QR Code:</strong> <a href="{{this.qr_url}}">View Ticket</a></p>
  </div>
{{/each}}

<p><strong>Order Number:</strong> {{order_number}}</p>
<p><strong>Total Amount:</strong> {{formatCurrency total_amount currency}}</p>

<p>See you at the event!</p>
```

### Event Reminder

**Subject:**
```
Reminder: {{event_name}} is tomorrow!
```

**Body:**
```html
<h1>Event Reminder</h1>
<p>Hi {{user_name}},</p>
<p>This is a reminder that <strong>{{event_name}}</strong> is happening soon!</p>

<h2>Event Details</h2>
<ul>
  <li><strong>Date:</strong> {{formatDate event_date}}</li>
  <li><strong>Time:</strong> {{formatTime event_time}}</li>
  <li><strong>Venue:</strong> {{venue_name}}</li>
  <li><strong>Address:</strong> {{venue_address}}</li>
</ul>

<p>Don't forget to bring your tickets!</p>
```

### Organizer Sales Daily

**Subject:**
```
Daily Sales Report - {{organizer_name}}
```

**Body:**
```html
<h1>Daily Sales Report</h1>
<p>Hi {{organizer_name}},</p>
<p>Here's your sales summary for {{period}}:</p>

<h2>Summary</h2>
<ul>
  <li><strong>Total Revenue:</strong> {{formatCurrency total_revenue currency}}</li>
  <li><strong>Total Tickets Sold:</strong> {{total_tickets}}</li>
</ul>

<h2>Event Breakdown</h2>
{{#each events}}
  <div style="margin-bottom: 15px;">
    <p><strong>{{this.name}}</strong></p>
    <ul>
      <li>Revenue: {{formatCurrency this.revenue ../currency}}</li>
      <li>Tickets: {{this.tickets}}</li>
    </ul>
  </div>
{{/each}}
```

## Handlebars Helpers

Available helpers:
- `formatCurrency(amount, currency)` - Format currency
- `formatDate(date)` - Format date
- `formatTime(date)` - Format time

## Creating Templates

Templates can be created via:
1. PocketBase Admin UI
2. API calls to `email_templates` collection
3. Organizer dashboard (for organizer-specific templates)

Organizer-specific templates override global templates when `organizer_id` is set.

