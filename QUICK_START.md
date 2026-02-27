# PayFast Sandbox Integration - Quick Start

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependencies

```bash
npm install
```

This will install `crypto-js` and `@types/crypto-js` that were added to `package.json`.

### Step 2: Start Dev Server

```bash
npm run dev
```

### Step 3: Test Integration

1. Open browser: `http://localhost:3000/test-payfast`
2. Click "Test PayFast Payment" button
3. Complete payment on PayFast Sandbox
4. Verify redirect to success/cancel page

---

## ✅ What's Already Set Up

- ✅ CryptoJS configured in `package.json`
- ✅ PayFast: server-side signature in `lib/payfast.ts`; test via `app/test-payfast/page.tsx` (uses `/api/bookings/payfast-form`)
- ✅ Success page: `app/bookings/success/page.tsx`
- ✅ Cancel page: `app/bookings/cancel/page.tsx`
- ✅ Notify webhook: `app/api/notify/route.ts`
- ✅ URLs configured for localhost:3000

---

## 🔧 Configuration

**PayFast Sandbox Credentials:**
- Merchant ID: `10045991`
- Merchant Key: `2q99zezq11goo`
- Passphrase: `SKYrim_3602000`

**Callback URLs:**
- Return: `http://localhost:3000/success`
- Cancel: `http://localhost:3000/cancel`
- Notify: `http://localhost:3000/api/notify`

---

## 📝 Usage

### In Your Code

Use server-side signature only. Get a signed form from the API or from `createPayFastPaymentData()` in `lib/payfast.ts`. Example: `POST /api/bookings/payfast-form` with JSON body returns HTML with an auto-submitting form.

### Test Page

Visit `http://localhost:3000/test-payfast` to test; the page requests the form from the API (signature is generated on the server).

---

## 🐛 Troubleshooting

**npm not found?**
- Make sure Node.js is installed
- Run `npm install` in project root

**Module not found?**
- Run `npm install` to install dependencies
- Restart dev server

**400 Bad Request?**
- Check browser console for errors
- Verify signature calculation (logs show details)
- Ensure form is using POST method

**SameSite Cookie Issues?**
- For localhost testing, disable SameSite restrictions in browser
- Or use ngrok for production-like testing

---

## 📚 Full Documentation

See `PAYFAST_SETUP_GUIDE.md` for complete setup instructions.

---

**Status**: ✅ Ready to test!
