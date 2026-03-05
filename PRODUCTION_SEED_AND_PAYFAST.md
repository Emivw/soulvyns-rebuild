# Production: Seeding Data & PayFast

## 1. Seed data so clients can try the site

The seed creates a test counselor, test client, and availability slots. In **production** it only runs if you pass a secret.

### In Vercel

1. **Settings → Environment Variables**
   - Add: `SEED_SECRET` = any long random string you keep private (e.g. from a password generator).
   - Apply to **Production** (and Preview if you want).

2. **Trigger the seed once** (after deployment):
   - From your machine (or Postman), send a POST request to your **production** URL:
     ```http
     POST https://soulvyns-rebuild-git-main-emivws-projects.vercel.app/api/dev/seed
     Content-Type: application/json

     {"secret": "YOUR_SEED_SECRET_VALUE"}
     ```
   - Replace the URL with your actual Vercel domain and `YOUR_SEED_SECRET_VALUE` with the value you set for `SEED_SECRET`.
   - On success you get a JSON summary (counselor, client, slots). Test logins:
     - **Counselor:** counselor@test.com / TestPassword123!
     - **Client:** client@test.com / TestPassword123!

3. **Optional:** Remove or rotate `SEED_SECRET` after seeding if you don’t plan to run it again.

---

## 2. PayFast working on the live site

PayFast needs your **live base URL** and the same credentials you use locally (sandbox or production).

### Required in Vercel

| Variable | Example | Notes |
|----------|---------|--------|
| `NEXT_PUBLIC_BASE_URL` | `https://soulvyns-rebuild-git-main-emivws-projects.vercel.app` | No trailing slash. Used for return/cancel/notify URLs. |
| `PAYFAST_MERCHANT_ID` | (from .env.local) | Same as local. |
| `PAYFAST_MERCHANT_KEY` | (from .env.local) | Same as local. |
| `PAYFAST_PASSPHRASE` | (from .env.local) | Same as local. |
| `PAYFAST_ENV` | `sandbox` or `production` | `sandbox` for testing. |

PayFast will call:

- **Return:** `{NEXT_PUBLIC_BASE_URL}/bookings/success`
- **Cancel:** `{NEXT_PUBLIC_BASE_URL}/bookings/cancel`
- **Notify (webhook):** `{NEXT_PUBLIC_BASE_URL}/api/payfast/notify`

So **NEXT_PUBLIC_BASE_URL must be your real Vercel URL** (or custom domain). If it’s wrong or missing, payment may complete but the site won’t get the webhook and the booking won’t show as paid.

### After changing env vars

Redeploy (e.g. trigger a new deployment from the Vercel dashboard or push a commit) so the new values are used.

### If payment still fails

1. In Vercel → **Deployments** → latest → **Functions** / **Logs**, check:
   - `[payfast-form]` and `[PAYFAST NOTIFY]` logs for errors or wrong URLs.
2. Confirm in PayFast (sandbox) that your notify URL is reachable from the internet (no localhost).
3. Ensure `PAYFAST_PASSPHRASE` in Vercel matches the one in your PayFast dashboard (signature is validated with it).
