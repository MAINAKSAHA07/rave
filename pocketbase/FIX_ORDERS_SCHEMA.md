# Fix Orders Collection Schema

The orders collection needs the following fields to be added if they don't exist:

## Required Fields to Add

1. **base_amount_minor** (Number, Optional)
   - Type: `number`
   - Required: `false`
   - Description: Base amount before GST in smallest currency unit (paise)

2. **gst_amount_minor** (Number, Optional)
   - Type: `number`
   - Required: `false`
   - Description: GST amount in smallest currency unit (paise)

3. **payment_method** (Select, Optional)
   - Type: `select`
   - Required: `false`
   - Options: `['razorpay', 'cash']`
   - Max Select: `1`

## How to Fix

### Option 1: Using PocketBase Admin UI

1. Go to your PocketBase admin UI: `http://13.201.90.240:8092/_/`
2. Navigate to **Collections** → **orders**
3. Click on **Fields** tab
4. For each missing field above:
   - Click **Add new field**
   - Enter the field name
   - Select the field type
   - Configure the options as specified above
   - Click **Save**

### Option 2: Using the Script

Run the fix script (make sure your `.env` has correct admin credentials):

```bash
node pocketbase/fix-orders-schema-complete.js
```

Make sure your `.env` file has:
```bash
POCKETBASE_URL=http://13.201.90.240:8092
POCKETBASE_ADMIN_EMAIL=your_admin_email
POCKETBASE_ADMIN_PASSWORD=your_admin_password
```

### Option 3: Manual SQL/API

If you have direct database access, you can add these fields via PocketBase Admin API or directly in the database.

## Verification

After adding the fields, verify by:

1. Check the orders collection schema in PocketBase admin UI
2. Try creating an order through the application
3. Check server logs for any schema-related errors

## Current Status

The application code has been updated to handle missing fields gracefully:
- If `base_amount_minor` or `gst_amount_minor` fields don't exist, the order will be created without them
- The code will automatically retry without these fields if schema validation fails
- Better error messages are now logged to help identify schema issues
