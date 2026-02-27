# Step-by-Step Credential Retrieval Guide

This guide provides detailed, step-by-step instructions for retrieving all required credentials and secrets for the Soulvyns MVP.

## 📋 Quick Checklist

- [ ] Supabase credentials (3 items)
- [ ] Azure AD credentials (5 items)
- [ ] Microsoft Graph API credentials (3 items)
- [ ] PayFast credentials (7 items)
- [ ] Application configuration (1 item)

**Total: 19 credentials/secrets to retrieve**

---

## 1. Supabase Credentials

### What You Need:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`

### Step-by-Step Instructions:

#### Step 1: Create Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"**
3. Sign in with GitHub, Google, or email
4. If new, verify your email address

#### Step 2: Create New Project
1. Click **"New Project"** button (top right)
2. Fill in project details:
   - **Name**: `Soulvyns` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for MVP
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to provision

#### Step 3: Retrieve Credentials
1. Once project is ready, click on your project name
2. In the left sidebar, click **"Settings"** (gear icon)
3. Click **"API"** in the settings menu
4. You'll see three sections:

   **a) Project URL:**
   - Copy the **"Project URL"** value
   - This is your `NEXT_PUBLIC_SUPABASE_URL`
   - Example: `https://xxxxxxxxxxxxx.supabase.co`

   **b) Project API keys:**
   - Find **"anon public"** key
   - Click the **eye icon** to reveal it
   - Click **"Copy"** button
   - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ⚠️ This key is safe to use in frontend code

   **c) Service Role Key:**
   - Scroll down to **"service_role"** key
   - Click the **eye icon** to reveal it
   - Click **"Copy"** button
   - This is your `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ **CRITICAL**: Never expose this in frontend code - backend only!

#### Step 4: Save Credentials
Copy these values to your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **Supabase credentials complete!**

---

## 2. Azure AD Credentials (Counselor Authentication)

### What You Need:
1. `NEXT_PUBLIC_AZURE_CLIENT_ID`
2. `NEXT_PUBLIC_AZURE_TENANT_ID`
3. `NEXT_PUBLIC_AZURE_AUTHORITY`
4. `NEXT_PUBLIC_AZURE_REDIRECT_URI` (you set this)
5. `GRAPH_CLIENT_SECRET` (created later)

### Step-by-Step Instructions:

#### Step 1: Access Azure Portal
1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with your Microsoft account
3. If you don't have an Azure account:
   - Click **"Start free"** or **"Create a resource"**
   - Sign up for free Azure account (requires credit card, but free tier available)

#### Step 2: Navigate to Azure Active Directory
1. In the search bar at the top, type: **"Azure Active Directory"**
2. Click on **"Azure Active Directory"** from results
3. You should see your tenant overview page

#### Step 3: Create App Registration
1. In the left sidebar, click **"App registrations"**
2. Click **"+ New registration"** button (top left)
3. Fill in the form:
   - **Name**: `Soulvyns Counselor Login`
   - **Supported account types**: 
     - Select **"Accounts in this organizational directory only"**
   - **Redirect URI**:
     - Platform: Select **"Single-page application (SPA)"**
     - URI: `http://localhost:3000/counselor/callback`
4. Click **"Register"** button
5. Wait for the app to be created

#### Step 4: Retrieve Client ID and Tenant ID
1. You'll be redirected to the app's **"Overview"** page
2. Find these values:

   **a) Application (client) ID:**
   - Copy the **"Application (client) ID"** value
   - This is your `NEXT_PUBLIC_AZURE_CLIENT_ID`
   - Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

   **b) Directory (tenant) ID:**
   - Copy the **"Directory (tenant) ID"** value
   - This is your `NEXT_PUBLIC_AZURE_TENANT_ID`
   - Example: `12345678-1234-1234-1234-123456789012`

   **c) Authority URL:**
   - Format: `https://login.microsoftonline.com/{TENANT_ID}`
   - Replace `{TENANT_ID}` with your Directory (tenant) ID
   - This is your `NEXT_PUBLIC_AZURE_AUTHORITY`
   - Example: `https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012`

#### Step 5: Configure Redirect URI
1. In the left sidebar, click **"Authentication"**
2. Under **"Single-page application"**, you should see your redirect URI
3. If not, click **"+ Add platform"** → **"Single-page application"**
4. Add: `http://localhost:3000/counselor/callback`
5. For production, add: `https://your-domain.com/counselor/callback`
6. Click **"Save"**

#### Step 6: Configure API Permissions (Delegated)
1. In the left sidebar, click **"API permissions"**
2. Click **"+ Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Delegated permissions"**
5. Search for and check these permissions:
   - `User.Read`
   - `offline_access`
6. Click **"Add permissions"**
7. Click **"Grant admin consent for [Your Organization]"**
8. Click **"Yes"** to confirm
9. Verify both permissions show **"Granted for [Your Organization]"** with green checkmarks

#### Step 7: Create Client Secret (for Graph API)
1. In the left sidebar, click **"Certificates & secrets"**
2. Under **"Client secrets"**, click **"+ New client secret"**
3. Fill in:
   - **Description**: `Graph API Secret`
   - **Expires**: Select **24 months** (or your preference)
4. Click **"Add"**
5. **⚠️ CRITICAL**: Copy the **"Value"** immediately
   - This is your `GRAPH_CLIENT_SECRET`
   - You won't be able to see it again!
   - Example: `abc123~XYZ789...`
6. Save this securely

#### Step 8: Configure Application Permissions (for Graph API)
1. Still in **"API permissions"** page
2. Click **"+ Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Application permissions"** (NOT Delegated)
5. Search for and check these permissions:
   - `OnlineMeetings.ReadWrite.All`
   - `Calendars.ReadWrite`
6. Click **"Add permissions"**
7. Click **"Grant admin consent for [Your Organization]"**
8. Click **"Yes"** to confirm
9. Verify both permissions show **"Granted for [Your Organization]"** with green checkmarks

#### Step 9: Save Azure AD Credentials
Copy these values to your `.env.local` file:
```env
NEXT_PUBLIC_AZURE_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
NEXT_PUBLIC_AZURE_TENANT_ID=12345678-1234-1234-1234-123456789012
NEXT_PUBLIC_AZURE_AUTHORITY=https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000/counselor/callback

GRAPH_TENANT_ID=12345678-1234-1234-1234-123456789012
GRAPH_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
GRAPH_CLIENT_SECRET=abc123~XYZ789...
```

✅ **Azure AD credentials complete!**

---

## 3. PayFast Credentials

### What You Need:
1. `PAYFAST_MERCHANT_ID`
2. `PAYFAST_MERCHANT_KEY`
3. `PAYFAST_PASSPHRASE` (optional but recommended)
4. `PAYFAST_ENV` (you set this: `sandbox` or `production`)
5. `PAYFAST_RETURN_URL` (you set this)
6. `PAYFAST_CANCEL_URL` (you set this)
7. `PAYFAST_NOTIFY_URL` (you set this)

### Step-by-Step Instructions:

#### Step 1: Create PayFast Account
1. Go to [https://www.payfast.co.za/](https://www.payfast.co.za/)
2. Click **"Sign Up"** or **"Register"** (top right)
3. Fill in registration form:
   - Email address
   - Password
   - Business details
4. Verify your email address
5. Complete account setup

#### Step 2: Complete Account Verification
1. Log into PayFast dashboard
2. You'll need to verify your account:
   - Provide business registration documents
   - Verify bank account details
   - Complete KYC (Know Your Customer) requirements
3. This may take 1-3 business days
4. For testing, you can use sandbox mode immediately

#### Step 3: Access Integration Settings
1. Once logged in, click on your account/profile (top right)
2. Navigate to **"Settings"** or **"Integration"**
3. Or go directly to: [https://www.payfast.co.za/user/settings/integration](https://www.payfast.co.za/user/settings/integration)

#### Step 4: Retrieve Merchant Credentials
1. On the Integration page, you'll see:

   **a) Merchant ID:**
   - Copy the **"Merchant ID"** value
   - This is your `PAYFAST_MERCHANT_ID`
   - Example: `10000100`

   **b) Merchant Key:**
   - Copy the **"Merchant Key"** value
   - This is your `PAYFAST_MERCHANT_KEY`
   - Example: `46f0cd694581a`

#### Step 5: Configure Passphrase (Recommended)
1. On the same Integration page
2. Find **"Passphrase"** section
3. Click **"Set Passphrase"** or **"Configure"**
4. Enter a secure passphrase (save this!)
5. Click **"Save"**
6. Copy the passphrase value
   - This is your `PAYFAST_PASSPHRASE`
   - ⚠️ Keep this secret!

#### Step 6: Set Environment
- For development/testing: `PAYFAST_ENV=sandbox`
- For production: `PAYFAST_ENV=production`

#### Step 7: Configure URLs
Set these URLs based on your application:

**For Local Development:**
```env
PAYFAST_RETURN_URL=http://localhost:3000/bookings/success
PAYFAST_CANCEL_URL=http://localhost:3000/bookings/cancel
PAYFAST_NOTIFY_URL=http://localhost:3000/api/payfast/notify
```

**For Production:**
```env
PAYFAST_RETURN_URL=https://your-domain.com/bookings/success
PAYFAST_CANCEL_URL=https://your-domain.com/bookings/cancel
PAYFAST_NOTIFY_URL=https://your-domain.com/api/payfast/notify
```

**⚠️ Important for Local Testing:**
- PayFast webhook (`PAYFAST_NOTIFY_URL`) must be publicly accessible
- Use ngrok or localtunnel for local development:
  ```bash
  # Using ngrok
  ngrok http 3000
  # Then use: https://your-ngrok-url.ngrok.io/api/payfast/notify
  ```

#### Step 8: Save PayFast Credentials
Copy these values to your `.env.local` file:
```env
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your-secure-passphrase
PAYFAST_ENV=sandbox
PAYFAST_RETURN_URL=http://localhost:3000/bookings/success
PAYFAST_CANCEL_URL=http://localhost:3000/bookings/cancel
PAYFAST_NOTIFY_URL=http://localhost:3000/api/payfast/notify
```

#### Step 9: Get Test Card & Use Sandbox (Step-by-Step)

**How to get and use the PayFast test card:**

1. **Log into the PayFast Sandbox**
   - Go to [https://sandbox.payfast.co.za](https://sandbox.payfast.co.za)
   - Use the **same email and password** as your main PayFast account
   - If you don’t have an account yet, sign up at [https://www.payfast.co.za](https://www.payfast.co.za) first, then use those details to log into the sandbox

2. **Get your sandbox credentials**
   - After logging in, you’ll see your **sandbox** Merchant ID, Merchant Key, and (if set) Salt Passphrase
   - Use these **only** for testing (they’re different from live credentials)
   - In your app, point payments to the sandbox by using `PAYFAST_ENV=sandbox` and the sandbox Merchant ID/Key (or your live credentials if you’re testing with the live account in sandbox mode—see note below)

3. **Use the official test card**
   - PayFast’s sandbox accepts this **test card**:
     - **Card number**: `5200 0000 0000 0007`
     - **CVV**: any 3 digits (e.g. `123`)
     - **Expiry**: any future date (e.g. `12/28`)
     - **Name**: any name (e.g. `Test User`)
   - No real money is charged in the sandbox

4. **Where to confirm the test card**
   - Sandbox login: [https://sandbox.payfast.co.za](https://sandbox.payfast.co.za)
   - Developer docs: [https://developers.payfast.co.za](https://developers.payfast.co.za) (check the “Custom Integration” / testing section for any updated test card info)
   - Support/knowledge base: [https://support.payfast.co.za](https://support.payfast.co.za) (search for “sandbox” or “test card”)

5. **Run a test payment**
   - Set `PAYFAST_ENV=sandbox` in `.env.local`
   - Ensure your form/checkout posts to `https://sandbox.payfast.co.za/eng/process`
   - Complete a payment using the test card above
   - Check your notify/return URLs and sandbox dashboard to confirm the payment

**Note:** You can either create a separate sandbox account at sandbox.payfast.co.za (and use those sandbox Merchant ID/Key) or use your live Merchant ID/Key with `PAYFAST_ENV=sandbox` so the app uses the sandbox URL; in both cases use the test card only on the sandbox payment page.

✅ **PayFast credentials complete!**

---

## 4. Application Configuration

### What You Need:
1. `NEXT_PUBLIC_BASE_URL`

### Step-by-Step Instructions:

#### Step 1: Set Base URL
This is simply your application's base URL:

**For Local Development:**
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**For Production:**
```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

✅ **Application configuration complete!**

---

## 📝 Complete .env.local Template

Once you've retrieved all credentials, your `.env.local` file should look like this:

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE2NDAwMDAwMDB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDAwMDAwMDAsImV4cCI6MTY0MDAwMDAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# AZURE AD - COUNSELOR AUTHENTICATION
# ============================================
NEXT_PUBLIC_AZURE_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
NEXT_PUBLIC_AZURE_TENANT_ID=12345678-1234-1234-1234-123456789012
NEXT_PUBLIC_AZURE_AUTHORITY=https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000/counselor/callback

# ============================================
# MICROSOFT GRAPH API (Server-Side Only)
# ============================================
GRAPH_TENANT_ID=12345678-1234-1234-1234-123456789012
GRAPH_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
GRAPH_CLIENT_SECRET=abc123~XYZ789abcdefghijklmnopqrstuvwxyz

# ============================================
# PAYFAST PAYMENT GATEWAY
# ============================================
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your-secure-passphrase-here
PAYFAST_ENV=sandbox
PAYFAST_RETURN_URL=http://localhost:3000/bookings/success
PAYFAST_CANCEL_URL=http://localhost:3000/bookings/cancel
PAYFAST_NOTIFY_URL=http://localhost:3000/api/payfast/notify

# ============================================
# APPLICATION CONFIGURATION
# ============================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## ✅ Verification Checklist

After retrieving all credentials, verify:

- [ ] All Supabase credentials are copied correctly
- [ ] Azure AD app registration is created
- [ ] All API permissions are granted with admin consent
- [ ] Client secret is saved securely (can't retrieve again!)
- [ ] PayFast merchant account is verified
- [ ] All URLs are set correctly for your environment
- [ ] `.env.local` file is created in project root
- [ ] `.env.local` is added to `.gitignore` (never commit secrets!)

---

## 🚨 Security Reminders

1. **Never commit `.env.local` to git**
   - Verify it's in `.gitignore`
   - Use `.env.example` for templates (without real values)

2. **Service Role Key**
   - Only use `SUPABASE_SERVICE_ROLE_KEY` in backend code
   - Never expose in frontend

3. **Client Secrets**
   - Azure AD client secret can't be retrieved after creation
   - Save it securely immediately

4. **PayFast Passphrase**
   - Keep passphrase secret
   - Don't share credentials

5. **Production vs Development**
   - Use different credentials for production
   - Use sandbox/test mode for development

---

## 🆘 Troubleshooting

### Can't find Azure AD?
- Make sure you have an Azure subscription (free tier is fine)
- Check you're signed into the correct Microsoft account

### PayFast account not verified?
- You can still use sandbox mode for testing
- Complete verification for production use

### Webhook URL not accessible?
- Use ngrok or localtunnel for local development
- Ensure production URL is publicly accessible

### Missing API permissions?
- Make sure you clicked "Grant admin consent"
- Check permissions show green checkmarks

---

## 📞 Support Links

- **Supabase**: [https://supabase.com/docs](https://supabase.com/docs)
- **Azure Portal**: [https://portal.azure.com](https://portal.azure.com)
- **PayFast Docs**: [https://developers.payfast.co.za/](https://developers.payfast.co.za/)
- **Microsoft Graph**: [https://docs.microsoft.com/graph](https://docs.microsoft.com/graph)

---

**Last Updated**: February 17, 2026  
**Estimated Time**: 30-60 minutes to retrieve all credentials
