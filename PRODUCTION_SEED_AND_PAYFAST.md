# Production: Seeding Data & PayFast

---

## How to seed data (do this first)

The seed creates a test counselor, test client, and availability slots so you can try the site. Do these steps **in order**.

### Step 1: Deploy the latest code

- The seed-with-secret feature is already in the repo and has been pushed.
- In Vercel, a new deployment should start automatically from the latest push. Wait for it to finish (or trigger **Redeploy** on the latest deployment if you need to).

### Step 2: Add the seed secret in Vercel

1. Open your project in Vercel → **Settings** → **Environment Variables**.
2. Add a new variable:
   - **Name:** `SEED_SECRET`
   - **Value:** any long random string only you know (e.g. `mySecretSeed2024Prod` or use a password generator).
   - **Environment:** Production (and Preview if you want).
3. Save.

### Step 3: Redeploy so the new env is used

- After adding `SEED_SECRET`, Vercel needs to redeploy for it to be available.
- Go to **Deployments** → open the **⋯** menu on the latest deployment → **Redeploy** (or push an empty commit and let it auto-deploy).

### Step 4: Call the seed endpoint once

From your computer (PowerShell, Command Prompt, or Postman):

**Option A – PowerShell**

```powershell
$url = "https://soulvyns-rebuild-git-main-emivws-projects.vercel.app/api/dev/seed"
$secret = "PUT_YOUR_SEED_SECRET_HERE"
$body = @{ secret = $secret } | ConvertTo-Json
Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json"
```

Replace `PUT_YOUR_SEED_SECRET_HERE` with the exact value you set for `SEED_SECRET` in Vercel. Replace the `$url` with your actual Vercel domain if different.

**Option B – curl (if you have it)**

```bash
curl -X POST "https://soulvyns-rebuild-git-main-emivws-projects.vercel.app/api/dev/seed" \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"PUT_YOUR_SEED_SECRET_HERE\"}"
```

**Option B – Postman**

- Method: **POST**
- URL: `https://soulvyns-rebuild-git-main-emivws-projects.vercel.app/api/dev/seed`
- Headers: `Content-Type: application/json`
- Body (raw JSON): `{"secret": "PUT_YOUR_SEED_SECRET_HERE"}`

On success you get JSON with `success: true` and a summary of what was created.

### Step 5: Try the site

- **Client login:** client@test.com / TestPassword123!
- **Counselor login:** counselor@test.com / TestPassword123!

You can browse counselors, book a slot as the client, and test the flow. PayFast you can fix next once this works.

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
