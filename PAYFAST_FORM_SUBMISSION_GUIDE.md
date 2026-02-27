# PayFast Sandbox Payment Form Submission - Complete Guide

## ✅ Implementation Complete

This document describes the complete PayFast sandbox payment form submission implementation that mimics exactly the behavior of PayFast's sandbox test form ("Post on Sandbox" button).

---

## 📋 Features

### ✅ Complete PayFast Field Support

**Required Fields:**
- `merchant_id`: PayFast merchant ID
- `merchant_key`: PayFast merchant key
- `amount`: Payment amount (formatted as "500.00")
- `item_name`: Description of the service/item
- `m_payment_id`: Merchant payment ID (booking ID)
- `name_first`: Customer's first name
- `name_last`: Customer's last name
- `email_address`: Customer's email
- `return_url`: Redirect URL after successful payment
- `cancel_url`: Redirect URL if payment is cancelled
- `notify_url`: Webhook URL for payment notifications
- `signature`: MD5 hash signature (exact from API)

**Optional Fields:**
- `cell_number`: Customer's cell phone number
- `item_description`: Additional description
- `email_confirmation`: Send email confirmation (1 = yes, 0 = no)
- `payment_method`: Preferred payment method (eft, cc, etc.)
- `custom_integer_1` through `custom_integer_5`: Custom integers for tracking
- `custom_string_1` through `custom_string_5`: Custom strings for tracking

### ✅ Key Features

1. **POST Form Submission**: Uses POST method (required by PayFast, GET returns 400)
2. **Exact Booking Data**: Uses exact booking data from client (no alterations)
3. **URL Encoding**: Browser automatically handles URL encoding
4. **Same-Site Cookie Support**: Compatible with same-site/cross-site cookie settings
5. **Automatic Submission**: Form submits automatically when called
6. **Complete Field Support**: Includes all PayFast fields (required + optional)

---

## 📁 Files Modified/Created

### 1. `app/book/[id]/page.tsx` (Updated)
- Enhanced `handleBookSlot()` function with complete PayFast field support
- Updated `handleBookSlotClick()` to pass all booking data fields
- Includes all optional PayFast fields

### 2. `lib/payfastFormSubmit.ts` (New)
- Standalone utility function for PayFast form submission
- Can be imported and used anywhere in the application
- TypeScript interfaces for type safety
- Complete documentation

---

## 🚀 Usage

### In Booking Page (`app/book/[id]/page.tsx`)

The function is automatically called when user clicks "Book Session":

```typescript
// After booking is created via API
handleBookSlot({
  bookingId: bookingData.bookingId,
  amount: bookingData.amount,
  signature: bookingData.signature,
  clientEmail: bookingData.clientEmail,
  clientFirstName: bookingData.clientFirstName,
  clientLastName: bookingData.clientLastName,
  // Optional fields...
});
```

### As Standalone Utility

```typescript
import { submitPayFastSandboxForm } from '@/lib/payfastFormSubmit';

// Call when user clicks "Pay Now" button
submitPayFastSandboxForm({
  bookingId: '508dc4fc-5b51-42ac-95a0-6ffa26552fdb',
  amount: '500.00',
  signature: '1e9124822f39f09175e373851bfa6ea4',
  clientEmail: 'client@test.com',
  clientFirstName: 'John',
  clientLastName: 'Doe',
  // Optional fields...
});
```

---

## 🔧 Configuration

### PayFast Sandbox Settings

**Merchant Credentials:**
- `merchant_id`: `10045991`
- `merchant_key`: `2q99zezq11goo`

**Endpoints:**
- Sandbox URL: `https://sandbox.payfast.co.za/eng/process`
- Return URL: `https://unmature-simplistically-damaris.ngrok-free.dev/bookings/success`
- Cancel URL: `https://unmature-simplistically-damaris.ngrok-free.dev/bookings/cancel`
- Notify URL: `https://unmature-simplistically-damaris.ngrok-free.dev/api/payfast/notify`

### Environment Variables

Ensure `.env.local` contains:
```env
PAYFAST_MERCHANT_ID=10045991
PAYFAST_MERCHANT_KEY=2q99zezq11goo
PAYFAST_PASSPHRASE=SKYrim_3602000
PAYFAST_ENV=sandbox
NEXT_PUBLIC_BASE_URL=https://unmature-simplistically-damaris.ngrok-free.dev
```

---

## 🔄 Flow

1. **User Action**: User clicks "Book Session" button
2. **API Call**: Frontend calls `/api/bookings/create` with booking details
3. **Booking Creation**: API creates booking and generates PayFast signature
4. **Data Return**: API returns `bookingData` with signature and all fields
5. **Form Creation**: `handleBookSlot()` creates hidden HTML form
6. **Field Population**: Form populated with all PayFast fields
7. **Form Submission**: Form automatically submits via POST
8. **PayFast Redirect**: User redirected to PayFast sandbox payment page
9. **Payment Processing**: User completes payment on PayFast's secure page
10. **Redirect Back**: PayFast redirects to `return_url` or `cancel_url`

---

## ✅ Validation

### Booking Data Validation

- ✅ `bookingId` is required
- ✅ `signature` is required
- ✅ `amount` must be formatted as "500.00" (2 decimals)
- ✅ All required fields must be present

### Form Submission Validation

- ✅ Form method is POST (not GET)
- ✅ Form action points to PayFast sandbox URL
- ✅ All fields are properly URL-encoded
- ✅ Signature matches PayFast requirements
- ✅ No empty fields are included

---

## 🐛 Troubleshooting

### 400 Bad Request Error

**Possible Causes:**
1. Using GET instead of POST (fixed: using POST)
2. Missing required fields (fixed: all required fields included)
3. Incorrect signature (fixed: using exact signature from API)
4. URL encoding issues (fixed: browser handles automatically)

**Solution**: The implementation handles all these cases correctly.

### Form Not Submitting

**Check:**
1. Form is appended to DOM (`document.body.appendChild(form)`)
2. Form has correct method (`form.method = 'POST'`)
3. Form has correct action URL
4. All required fields are populated

### Signature Mismatch

**Check:**
1. Signature is exact from API (no alterations)
2. All fields match what was used to generate signature
3. Field values are not modified before submission

---

## 📝 Notes

1. **No Data Alteration**: Booking data is used exactly as provided from API
2. **Browser URL Encoding**: Browser automatically URL-encodes form values
3. **Same-Site Cookies**: Form uses `target="_self"` for proper cookie handling
4. **Automatic Cleanup**: Form is removed when page navigates to PayFast
5. **Error Handling**: Comprehensive error handling with detailed logging

---

## 🎯 Testing

### Local Testing Steps

1. Start dev server: `npm run dev`
2. Navigate to `/book/{counselorId}`
3. Select an available slot
4. Click "Book Session"
5. Verify form submits to PayFast sandbox
6. Complete test payment
7. Verify redirect to success/cancel page

### Expected Behavior

- ✅ Form submits without 400 errors
- ✅ User redirected to PayFast sandbox payment page
- ✅ Payment can be completed successfully
- ✅ User redirected back to success/cancel page
- ✅ Webhook notification sent to `notify_url`

---

## 📚 References

- PayFast Sandbox Documentation: https://sandbox.payfast.co.za
- PayFast Integration Guide: https://www.payfast.co.za/documentation/
- PayFast Test Form: https://sandbox.payfast.co.za/eng/process

---

**Status**: ✅ Ready for production testing
