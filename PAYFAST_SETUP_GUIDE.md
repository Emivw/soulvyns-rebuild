# PayFast Sandbox Integration Setup Guide

## ✅ Setup Complete!

This guide will help you complete the PayFast Sandbox integration setup for localhost testing.

---

## 📋 Prerequisites

1. **Node.js and npm** installed on your system
2. **Next.js project** running on `http://localhost:3000`

---

## 🚀 Step-by-Step Setup

### Step 1: Install CryptoJS

Run the following command in your project root:

```bash
npm install crypto-js @types/crypto-js
```

This installs:
- `crypto-js`: JavaScript library for cryptographic functions (MD5 hashing)
- `@types/crypto-js`: TypeScript type definitions

### Step 2: Verify Installation

Check that `crypto-js` is added to your `package.json`:

```json
{
  "dependencies": {
    "crypto-js": "^4.x.x"
  },
  "devDependencies": {
    "@types/crypto-js": "^4.x.x"
  }
}
```

### Step 3: Test the Integration

1. **Start your Next.js dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:3000/test-payfast
   ```

3. **Click "Test PayFast Payment"** button

4. **You should be redirected to PayFast Sandbox** payment page

---

## 📁 Files Created/Modified

### New Files:
- ✅ `lib/payfast.ts` - Canonical PayFast integration (signature generated server-side only via `generatePayFastSignature()`)
- ✅ `app/bookings/success/page.tsx` - Success redirect page
- ✅ `app/bookings/cancel/page.tsx` - Cancel redirect page
- ✅ `app/api/notify/route.ts` - Webhook notification handler
- ✅ `app/test-payfast/page.tsx` - Test page (calls `POST /api/bookings/payfast-form` for signed form)

---

## 🔧 Configuration

### PayFast Sandbox Credentials

The integration uses these default credentials:

```javascript
MERCHANT_ID: '10045991'
MERCHANT_KEY: '2q99zezq11goo'
PASSPHRASE: 'SKYrim_3602000'
```

### Callback URLs

The integration is configured for localhost:

```javascript
return_url: 'http://localhost:3000/success'
cancel_url: 'http://localhost:3000/cancel'
notify_url: 'http://localhost:3000/notify'
```

---

## 🧪 Testing

### Test Page

Visit: `http://localhost:3000/test-payfast`

This page provides:
- ✅ Integration status indicators
- ✅ Test payment button
- ✅ Configuration information
- ✅ Instructions

### Test Flow

1. Click "Test PayFast Payment" button
2. Form automatically submits to PayFast Sandbox
3. Complete payment on PayFast's secure page
4. Redirected back to `/success` or `/cancel`
5. Webhook notification sent to `/notify`

---

## 🔐 Cross-Site Cookie Handling

### Browser Settings

To avoid SameSite cookie issues:

1. **Chrome/Edge**: 
   - Go to `chrome://flags/#same-site-by-default-cookies`
   - Set to "Disabled" (for testing only)

2. **Firefox**:
   - Go to `about:config`
   - Set `network.cookie.sameSite.laxByDefault` to `false` (for testing only)

3. **Safari**:
   - Safari > Preferences > Privacy
   - Uncheck "Prevent cross-site tracking" (for testing only)

### Production Notes

⚠️ **Important**: These settings are for **localhost testing only**. In production:
- Use HTTPS
- Configure proper SameSite cookie policies
- Use ngrok or similar for webhook testing

---

## 📝 Usage Examples

### Basic Usage

```typescript
// Signature is server-side only. Use POST /api/bookings/payfast-form to get HTML form, or createPayFastPaymentData() from lib/payfast.
const handlePayment = async () => {
  const res = await fetch('/api/bookings/payfast-form', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 500, firstName: 'John', lastName: 'Doe', clientEmail: 'client@test.com' }) });
  const html = await res.text();
  const w = window.open('', '_blank'); w?.document.write(html); w?.document.close();
};
```

### Custom Integration

Use the test page at `/test-payfast` as reference: it POSTs to `/api/bookings/payfast-form` and opens the returned HTML in a new tab (form auto-submits to PayFast). Signature is generated only in `lib/payfast.ts` on the server.

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'crypto-js'"

**Solution**: Run `npm install crypto-js @types/crypto-js`

### Error: 400 Bad Request from PayFast

**Possible Causes**:
1. ✅ Using POST method (fixed in implementation)
2. ✅ Correct signature calculation (fixed in implementation)
3. ✅ Proper URL encoding (fixed in implementation)
4. ⚠️ Check browser console for detailed logs

**Solution**: Check browser console for PayFast error messages

### Form Not Submitting

**Check**:
1. CryptoJS is installed and imported correctly
2. Browser console shows no errors
3. Form is being created (check DOM)

**Solution**: Check browser console logs for detailed error messages

### SameSite Cookie Errors

**Solution**: 
- Disable SameSite restrictions in browser (for testing)
- Use ngrok for production-like testing
- Ensure proper cookie configuration

---

## 📚 API Reference

### `generatePayFastSignature(data)` (server-only, in `lib/payfast.ts`)

**Description**: Canonical PayFast signature generation. Use only on the server.

**Parameters**: `data: Record<string, string>` (payment params; passphrase from `process.env.PAYFAST_PASSPHRASE`)

**Returns**: `string` (MD5 hex signature)

**Example**: Called internally by `createPayFastPaymentData`, `createPayFastPaymentUrl`, and `POST /api/bookings/payfast-form`. Do not generate signatures on the client.

---

## 🔄 Payment Flow

1. **User Action**: User clicks payment button
2. **Form Creation**: Function creates hidden HTML form
3. **Signature Calculation**: MD5 signature calculated dynamically
4. **Form Population**: All PayFast fields added to form
5. **Form Submission**: Form automatically submits via POST
6. **PayFast Redirect**: User redirected to PayFast Sandbox
7. **Payment Processing**: User completes payment on PayFast
8. **Redirect Back**: User redirected to success/cancel URL
9. **Webhook Notification**: PayFast sends notification to notify URL

---

## ✅ Verification Checklist

- [ ] CryptoJS installed (`npm install crypto-js @types/crypto-js`)
- [ ] Dev server running (`npm run dev`)
- [ ] Test page accessible (`http://localhost:3000/test-payfast`)
- [ ] Success page accessible (`http://localhost:3000/success`)
- [ ] Cancel page accessible (`http://localhost:3000/cancel`)
- [ ] Notify endpoint accessible (`http://localhost:3000/api/notify`)
- [ ] Browser console shows no errors
- [ ] Payment form submits successfully
- [ ] Redirect to PayFast Sandbox works
- [ ] Redirect back from PayFast works

---

## 🎯 Next Steps

1. **Test Payment**: Use the test page to verify integration
2. **Customize**: Send desired booking data in the body of `POST /api/bookings/payfast-form`, or use `createPayFastPaymentData()` from `lib/payfast.ts`
3. **Integrate**: Add payment button to your booking flow
4. **Production**: Update URLs and credentials for production

---

## 📞 Support

- **PayFast Sandbox**: https://sandbox.payfast.co.za
- **PayFast Documentation**: https://www.payfast.co.za/documentation/
- **CryptoJS Documentation**: https://cryptojs.gitbook.io/

---

**Status**: ✅ Ready for testing!
