# End-to-End Testing Guide

## Overview

This guide explains how to test the complete booking → payment → meeting pipeline using the development tools and test mode.

---

## Prerequisites

1. **Environment Setup**:
   - All environment variables configured in `.env.local`
   - Supabase database schema deployed
   - Development server running (`npm run dev`)

2. **For real Microsoft Graph (Teams) callbacks**:
   - In `.env.local`: `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`
   - The organizational user for Teams is **admin@soulvyns.co.za** (set as `ms_graph_user_email` for the test counselor in seed). This email must be a **real user** in your Azure AD / Entra tenant so Graph can create meetings.

3. **Access Development Tools**:
   - Navigate to `http://localhost:3000/dev`

---

## Step-by-Step Test Flow

### Step 1: Seed Test Data

1. Go to `http://localhost:3000/dev`
2. Click **"Seed Database"** button
3. Wait for confirmation message showing:
   - ✅ Counselor created: `counselor@test.com` (password: `TestPassword123!`)
   - ✅ Client created: `client@test.com` (password: `TestPassword123!`)
   - ✅ 2 availability slots created

**Expected Result**: Database populated with test data

---

### Step 2: Login as Client

1. Navigate to `http://localhost:3000/login`
2. Login with:
   - Email: `client@test.com`
   - Password: `TestPassword123!`
3. You should be redirected to `/book`

**Expected Result**: Successfully logged in and redirected to booking page

---

### Step 3: Browse Counselors

1. On `/book` page, you should see:
   - Counselor: **Dr. Jane Smith**
   - Email: `counselor@test.com`
2. Click on the counselor card

**Expected Result**: Redirected to `/book/[counselor-id]` showing available slots

---

### Step 4: Select Time Slot

1. You should see 2 available time slots (tomorrow and day after)
2. Click on one of the slots to select it
3. Click **"Book Session (R500.00)"** button

**Expected Result**: 
- Booking created with status `pending_payment`
- Redirected to PayFast payment page (sandbox)

**Check Console Logs**:
```
📝 [BOOKING CREATE] Request received
🔐 [BOOKING CREATE] Verifying user token...
✅ [BOOKING CREATE] Authenticated user: client@test.com
💾 [BOOKING CREATE] Creating booking record...
✅ [BOOKING CREATE] Booking created: [booking-id]
💳 [PAYFAST] Creating payment URL...
✅ [PAYFAST] Payment URL created
```

---

### Step 5: Test Payment Webhook (Simulation)

Instead of completing payment on PayFast (which requires real payment), use the test webhook:

1. **Get Booking ID**:
   - From the PayFast redirect URL (parameter `m_payment_id`)
   - Or check Supabase `bookings` table
   - Or check browser console logs

2. **Simulate Webhook**:
   - Go to `http://localhost:3000/dev`
   - Enter the booking ID in the "Test PayFast Webhook" section
   - Click **"Test Webhook"**

**Expected Result**:
- Booking status updated to `paid`
- PayFast payment ID saved
- **Real** Microsoft Graph is called to create a Teams meeting (if `GRAPH_*` env is set)
- Meeting URL saved to booking; **Join Meeting** appears on My Bookings

**Check Console Logs**:
```
🔔 [PAYFAST NOTIFY] Webhook received
📦 [PAYFAST NOTIFY] Received data: {...}
✅ [PAYFAST NOTIFY] Merchant ID verified
✅ [PAYFAST NOTIFY] Signature verified
✅ [PAYFAST NOTIFY] Booking marked paid
📅 [PAYFAST NOTIFY] Fetching slot details...
👥 [PAYFAST NOTIFY] Creating Teams meeting...
📅 [GRAPH API] Creating Teams meeting...
✅ [GRAPH API] Teams meeting created: [meeting-id]
✅ [PAYFAST NOTIFY] Meeting URL saved
```

---

### Step 6: Verify Results

1. **Check Booking Status**:
   - Go to `http://localhost:3000/bookings` (My Bookings)
   - Verify booking shows status: **Paid**
   - Verify **Join Meeting** link is present and clickable (if real Graph created the meeting)

2. **Check Database**:
   - Query `bookings` table in Supabase
   - Verify `status = 'paid'`
   - Verify `payfast_payment_id` is set
   - Verify `meeting_url` is set (if Teams meeting was created via real Graph)

3. **Check Counselor Dashboard**:
   - Login as counselor: `counselor@test.com` / `TestPassword123!`
   - Go to `/counselor/dashboard`
   - Verify booking appears in the list

---

## API Route Logging

All API routes now include comprehensive logging with emoji prefixes for easy identification:

### Log Prefixes:
- 📝 **BOOKING CREATE** - Booking creation endpoint
- 🔔 **PAYFAST NOTIFY** - PayFast webhook handler
- 🔍 **COUNSELOR VERIFY** - Counselor verification
- 📋 **COUNSELOR BOOKINGS** - Fetch counselor bookings
- 💳 **PAYFAST** - PayFast payment URL generation
- 📅 **GRAPH API** - Microsoft Graph API calls
- 🌱 **SEED** - Database seeding
- 🧪 **TEST WEBHOOK** - Webhook simulation

### Log Levels:
- ✅ Success operations
- ⚠️ Warnings (non-critical issues)
- ❌ Errors (critical failures)
- ℹ️ Informational messages

---

## Troubleshooting

### Issue: Seed fails with "user already exists"
**Solution**: This is expected if you've seeded before. The seed route handles existing users gracefully.

### Issue: Booking creation fails
**Check**:
1. User is authenticated (check console logs)
2. Slot exists and is not booked
3. Counselor exists in database
4. Environment variables are set

### Issue: Webhook simulation fails
**Check**:
1. Booking ID is correct
2. Booking exists in database
3. PayFast environment variables are set
4. Check console logs for specific error

### Issue: Teams meeting not created
**Check**:
1. Microsoft Graph API credentials are configured
2. `ms_graph_user_email` in counselors table matches Azure AD user
3. Graph API permissions are granted
4. Check console logs for Graph API errors

### Issue: No console logs visible
**Solution**: 
- Check server terminal (not browser console)
- Logs appear in the terminal where `npm run dev` is running
- Ensure you're looking at the correct terminal window

---

## Manual Testing Checklist

- [ ] Seed database successfully
- [ ] Login as client
- [ ] Browse counselors
- [ ] Select time slot
- [ ] Create booking (status: pending_payment)
- [ ] Simulate PayFast webhook
- [ ] Verify booking status changed to confirmed
- [ ] Verify PayFast payment ID saved
- [ ] Verify Teams meeting created (if configured)
- [ ] Verify meeting URL saved to booking
- [ ] View booking in client dashboard
- [ ] View booking in counselor dashboard

---

## Production Testing

For production testing with real PayFast:

1. **Use Production PayFast Account**:
   - Update `PAYFAST_ENV=production` in `.env.local`
   - Use production merchant credentials

2. **Configure Webhook URL**:
   - Use publicly accessible URL (not localhost)
   - Update `PAYFAST_NOTIFY_URL` in PayFast dashboard
   - Use ngrok or similar for local testing

3. **Test Real Payment Flow**:
   - Complete actual payment on PayFast
   - Verify webhook is received
   - Check booking confirmation

---

## Development Tools

### `/dev` Page Features:
- **Database Seed**: One-click test data creation
- **Webhook Simulator**: Test payment webhook without real payment
- **Instructions**: Step-by-step testing guide

### API Endpoints:
- `POST /api/dev/seed` - Seed database
- `POST /api/dev/test-webhook` - Simulate PayFast webhook

**Security**: Both endpoints are disabled in production (`NODE_ENV === 'production'`)

---

## Teams integration tests

The Microsoft Graph / Teams meeting flow is covered by **unit tests** that mock the Graph API (no real credentials or API calls).

### Run Teams unit tests

```bash
npm test
# or only the Teams test file:
npx vitest run lib/graphClient.test.ts
```

**What is tested (mocked):**

- `createTeamsMeeting` returns `joinUrl` and `meetingId` when the mocked Graph API succeeds
- Organizer is fetched by email; online meeting is created with the correct subject, start/end times, and participants (attendee + organizer)
- Errors when organizer lookup fails, when meeting creation fails, or when Graph env vars are missing

### Real Microsoft Graph and full user journey

The app uses **real** Microsoft Graph callbacks (no mocks in production). To test the full user journey with real Teams:

1. **Prerequisites**
   - Set `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET` in `.env.local`.
   - Ensure **admin@soulvyns.co.za** is a real user in that tenant (seed sets this as the test counselor’s `ms_graph_user_email`).
   - **If you see “Insufficient privileges to complete the operation”**: the app needs Graph **application permissions** (`OnlineMeetings.ReadWrite.All`, `User.Read.All`) and an **application access policy** so it can create meetings on behalf of the organizer. See **[docs/GRAPH_TEAMS_SETUP.md](docs/GRAPH_TEAMS_SETUP.md)** for step-by-step setup (Azure API permissions + PowerShell policy).

2. **Verify Graph only (optional)**
   - Go to `http://localhost:3000/dev`.
   - In **Test Microsoft Graph (Teams)**, click **Create test meeting (admin@soulvyns.co.za / emiya.vanwyk@gmail.com)**.
   - You should get a **Join URL**. Open it to confirm a real Teams meeting was created.

3. **Full user journey**
   - Seed database → log in as client → book a slot (booking is created, status `pending_payment`).
   - Copy the booking ID (from PayFast redirect URL or Supabase).
   - On `/dev`, paste the booking ID and click **Test Webhook**. This calls the real PayFast notify handler, which:
     - Marks the booking as `paid`
     - Calls **real** `createTeamsMeeting` (Microsoft Graph)
     - Saves the meeting URL to the booking
   - Open **My Bookings** (as the client). The booking should show **Paid** and a clickable **Join Meeting** link.

4. **Alternative: create meeting for existing booking**
   - On `/dev`, enter a booking ID and click **Create meeting for booking above** in the Graph section. This creates a real Teams meeting and saves the link to that booking (without going through the webhook).

---

## Next Steps

After successful testing:
1. Remove or secure `/dev` route for production
2. Set up proper error monitoring (e.g., Sentry)
3. Configure production webhook URLs
4. Test with real PayFast payments
5. Verify Teams meeting creation in production

---

**Last Updated**: February 18, 2026
