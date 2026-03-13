# Soulvyns on Vercel

Short checklist to run the app (PayFast, Teams, Supabase) on Vercel.

**Production URL:** [https://soulvyns-rebuild.vercel.app](https://soulvyns-rebuild.vercel.app)

For this deployment, set in Vercel:

- **`NEXT_PUBLIC_BASE_URL`** = `https://soulvyns-rebuild.vercel.app` (no trailing slash)
- **`NEXT_PUBLIC_AZURE_REDIRECT_URI`** = `https://soulvyns-rebuild.vercel.app/counselor/login` (or your callback path)

PayFast will then use:
- Return: `https://soulvyns-rebuild.vercel.app/bookings/success`
- Cancel: `https://soulvyns-rebuild.vercel.app/bookings/cancel`
- Notify: `https://soulvyns-rebuild.vercel.app/api/payfast/notify`

### Using PayFast sandbox on the live URL

You can run **PayFast sandbox** (test payments) while the site is on your **live Vercel URL**:

- **`NEXT_PUBLIC_BASE_URL`** = `https://soulvyns-rebuild.vercel.app` → return/cancel/notify point at your live site.
- **`PAYFAST_ENV`** = `sandbox` → payments go to PayFast’s test server (`sandbox.payfast.co.za`), no real money.

So: live URL for the app and webhooks, sandbox for payment processing. When you’re ready for real payments, change only **`PAYFAST_ENV`** to `production` (and use production merchant credentials).

---

## 1. Deploy the app

1. Push your code to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
3. Import the Soulvyns repo.
4. Leave **Framework Preset** as Next.js and **Root Directory** as `./`.
5. Click **Deploy**.  
   After the first build you’ll get a URL like `https://soulvyns-xxx.vercel.app` (or your custom domain).

---

## 2. Environment variables (Production)

In the project: **Settings** → **Environment Variables**. Add these for **Production** (and **Preview** if you use it).  
Use your **real** Vercel URL or custom domain for any “your-vercel-url” below (no trailing slash).

| Variable | Example / notes |
|----------|------------------|
| **Base URL (required for PayFast)** | |
| `NEXT_PUBLIC_BASE_URL` | `https://soulvyns-rebuild.vercel.app` (or custom domain) |
| **Supabase** | |
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Settings → API (anon public) |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API (service_role, keep secret) |
| **PayFast** | |
| `PAYFAST_MERCHANT_ID` | From PayFast dashboard |
| `PAYFAST_MERCHANT_KEY` | From PayFast dashboard |
| `PAYFAST_PASSPHRASE` | From PayFast dashboard |
| `PAYFAST_ENV` | `sandbox` = test payments on live URL; `production` = real payments |
| **Microsoft Graph (Teams)** | |
| `GRAPH_TENANT_ID` | Same as Azure AD tenant |
| `GRAPH_CLIENT_ID` | App (client) ID |
| `GRAPH_CLIENT_SECRET` | Client secret from Azure app |
| **Azure AD (counselor login)** | |
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Azure app client ID |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | Azure tenant ID |
| `NEXT_PUBLIC_AZURE_AUTHORITY` | `https://login.microsoftonline.com/{TENANT_ID}` |
| `NEXT_PUBLIC_AZURE_REDIRECT_URI` | `https://soulvyns-rebuild.vercel.app/counselor/login` (or your callback path) |
| **Email (optional)** | |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | From Azure Communication Service |
| `AZURE_EMAIL_FROM` | Verified sender email |
| **Seed (optional)** | |
| `SEED_SECRET` | Any long random string if you use the protected seed API |

Return/cancel/notify URLs for PayFast are built in code from `NEXT_PUBLIC_BASE_URL`:

- Return: `{NEXT_PUBLIC_BASE_URL}/bookings/success`
- Cancel: `{NEXT_PUBLIC_BASE_URL}/bookings/cancel`
- Notify: `{NEXT_PUBLIC_BASE_URL}/api/payfast/notify`

So **PayFast will only update bookings if `NEXT_PUBLIC_BASE_URL` is your live Vercel (or custom) URL**.

---

## 3. Redeploy after changing env

After adding or editing variables: **Deployments** → **⋯** on latest deployment → **Redeploy**.  
New env values are only applied on the next build.

---

## 4. Custom domain (optional)

1. **Settings** → **Domains** → add your domain (e.g. `app.soulvyns.co.za`).
2. Follow Vercel’s DNS instructions.
3. Set **Production** env:
   - `NEXT_PUBLIC_BASE_URL` = `https://app.soulvyns.co.za`
   - `NEXT_PUBLIC_AZURE_REDIRECT_URI` = `https://app.soulvyns.co.za/counselor/login`
4. Redeploy.

---

## 5. Seed data (optional)

To create test counselor, client, and slots on the hosted app, see **[PRODUCTION_SEED_AND_PAYFAST.md](./PRODUCTION_SEED_AND_PAYFAST.md)**.  
You’ll set `SEED_SECRET` in Vercel and call `POST /api/dev/seed` with that secret once.

---

## 6. Check that PayFast webhook runs

1. Do a test payment on the **live** URL (sandbox or production).
2. In Vercel: **Deployments** → latest → **Functions** or **Logs**.
3. Look for `[PAYFAST NOTIFY] PAYFAST webhook received` and `BOOKING marked paid`.  
   If those never appear, PayFast can’t reach your notify URL — double‑check `NEXT_PUBLIC_BASE_URL` and that the deployment used it (redeploy after changing it).

---

## Summary

- **Deploy** from Git; set **env vars** in Vercel (especially `NEXT_PUBLIC_BASE_URL` = your Vercel or custom URL).
- **Redeploy** after any env change.
- **PayFast** and “My Bookings” will only show paid/meeting link when the webhook hits your app, which only works if the base URL is the live site.
