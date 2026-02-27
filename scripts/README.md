# Soulvyns Automated Testing Scripts

This directory contains scripts for automated end-to-end testing of the Soulvyns MVP.

## Scripts

### `auto-seed-and-book-browser.js`
**Browser Console Version** - Recommended for quick testing

Copy and paste this script into your browser console at `http://localhost:3000` after starting the dev server.

**Usage:**
1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000` in your browser
3. Open browser console (F12)
4. Copy the entire contents of `auto-seed-and-book-browser.js`
5. Paste into console and press Enter
6. When prompted, enter:
   - `NEXT_PUBLIC_SUPABASE_URL` (from `.env.local`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from `.env.local`)

**What it does:**
1. ✅ Seeds database with test counselor, client, and slots
2. ✅ Authenticates as test client (client@test.com)
3. ✅ Fetches available slots
4. ✅ Creates a booking
5. ✅ Simulates PayFast payment webhook
6. ✅ Confirms booking and creates Teams meeting

## Test Credentials

After seeding, you can use these credentials:

- **Client**: `client@test.com` / `TestPassword123!`
- **Counselor**: `counselor@test.com` / `TestPassword123!`

## API Routes Used

- `POST /api/dev/seed` - Seeds test data
- `GET /api/availability` - Gets available slots
- `POST /api/bookings/create` - Creates booking (requires auth)
- `POST /api/dev/test-webhook` - Simulates PayFast webhook

## Troubleshooting

### "Seed failed"
- Check that Supabase credentials are correct in `.env.local`
- Ensure database schema is set up (run `sql/complete_schema.sql`)

### "Authentication failed"
- Verify test client was created during seed
- Check Supabase anon key is correct

### "No available slots found"
- Run seed again to create fresh slots
- Check that slots weren't already booked

### "Booking creation failed"
- Ensure you're authenticated (browser version handles this automatically)
- Check that slot is still available
- Verify PayFast credentials in `.env.local`
