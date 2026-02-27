# Outstanding Secrets and Credentials - Soulvyns MVP

This document lists all required secrets, credentials, and configuration values needed to complete the Soulvyns MVP setup.

## Status Legend
- 🔴 **CRITICAL** - Required for core functionality
- 🟡 **IMPORTANT** - Required for specific features
- 🟢 **OPTIONAL** - Nice to have, not blocking

---

## Supabase Configuration

### Frontend Environment Variables (.env.local)

| Variable | Status | Description | Where to Get |
|----------|--------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 🔴 | Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 🔴 | Supabase anonymous/public key | Supabase Dashboard → Settings → API → anon/public key |

### Backend Environment Variables (.env.local)

| Variable | Status | Description | Where to Get |
|----------|--------|-------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 | Supabase service role key (server-side only) | Supabase Dashboard → Settings → API → service_role key |

**Current Status**: ⚠️ **NEEDS CONFIGURATION**

**Action Required**:
1. Create Supabase project at [supabase.com](https://supabase.com)
2. Wait for database provisioning
3. Copy Project URL and API keys from Settings → API
4. Add to `.env.local`
5. Run database schema SQL (see REBUILD_GUIDE.md)

---

## Azure Active Directory (Azure AD) Credentials

### Counselor Authentication (Frontend)

| Variable | Status | Description | Where to Get |
|----------|--------|-------------|--------------|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | 🔴 | Azure AD Application (client) ID | Azure Portal → App Registrations → Your App → Overview |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | 🔴 | Azure AD Directory (tenant) ID | Azure Portal → App Registrations → Your App → Overview |
| `NEXT_PUBLIC_AZURE_AUTHORITY` | 🔴 | Azure AD authority URL | Format: `https://login.microsoftonline.com/{TENANT_ID}` |
| `NEXT_PUBLIC_AZURE_REDIRECT_URI` | 🔴 | Redirect URI after Microsoft login | Your app URL (e.g., `http://localhost:3000/counselor/callback` or `/counselor/login` depending on implementation) |

**Current Status**: ⚠️ **NEEDS CONFIGURATION**

**Action Required**:
1. Create Azure AD App Registration in Azure Portal
2. Configure redirect URI: 
   - Platform: **Single-page application (SPA)**
   - URI: `http://localhost:3000/counselor/callback` (dev) or `http://localhost:3000/counselor/login` (depending on implementation)
   - URI: `https://your-domain.com/counselor/callback` (prod)
3. Add API permissions: `User.Read`, `offline_access` (Delegated)
4. Grant admin consent
5. Copy Client ID and Tenant ID
6. Set `NEXT_PUBLIC_AZURE_AUTHORITY` to `https://login.microsoftonline.com/{TENANT_ID}`
7. Add to `.env.local`

---

## Microsoft Graph API Credentials

### Backend Configuration (Server-Side Only)

| Variable | Status | Description | Where to Get |
|----------|--------|-------------|--------------|
| `GRAPH_TENANT_ID` | 🔴 | Azure AD Tenant ID (same as above) | Azure Portal → App Registrations → Your App → Overview |
| `GRAPH_CLIENT_ID` | 🔴 | Azure AD Application ID (same as above) | Azure Portal → App Registrations → Your App → Overview |
| `GRAPH_CLIENT_SECRET` | 🔴 | Client secret for Graph API authentication | Azure Portal → App Registrations → Your App → Certificates & secrets → Create new secret |

**Current Status**: ⚠️ **NEEDS CONFIGURATION**

**Action Required**:
1. In Azure Portal → App Registrations → Your App → Certificates & secrets
2. Click **New client secret**
3. Add description: `Graph API Secret`
4. Set expiration (recommended: 24 months)
5. **IMPORTANT**: Copy secret value immediately (won't be shown again)
6. Add to `.env.local`

### Required API Permissions

The following **Application permissions** (not Delegated) must be granted:

| Permission | Type | Status | Description |
|------------|------|--------|-------------|
| `OnlineMeetings.ReadWrite.All` | Application | 🔴 | Create Teams meetings on behalf of users |
| `Calendars.ReadWrite` | Application | 🔴 | Read and write user calendars |

**Action Required**:
1. Go to Azure Portal → App Registrations → Your App → API permissions
2. Click **Add a permission** → **Microsoft Graph**
3. Select **Application permissions** (not Delegated)
4. Add `OnlineMeetings.ReadWrite.All` and `Calendars.ReadWrite`
5. Click **Grant admin consent** for your organization
6. Verify permissions show "Granted for [Your Organization]"

---

## PayFast Payment Gateway Credentials

### Environment Variables

| Variable | Status | Description | Where to Get |
|----------|--------|-------------|--------------|
| `PAYFAST_MERCHANT_ID` | 🔴 | PayFast merchant ID | PayFast Dashboard → Settings → Integration → Merchant ID |
| `PAYFAST_MERCHANT_KEY` | 🔴 | PayFast merchant key | PayFast Dashboard → Settings → Integration → Merchant Key |
| `PAYFAST_PASSPHRASE` | 🟡 | PayFast passphrase (if configured) | PayFast Dashboard → Settings → Integration → Passphrase |
| `PAYFAST_ENV` | 🟡 | Environment: `sandbox` or `production` | Set to `sandbox` for testing |
| `PAYFAST_RETURN_URL` | 🔴 | URL to redirect after successful payment | Your app URL (e.g., `http://localhost:3000/bookings/success`) |
| `PAYFAST_CANCEL_URL` | 🔴 | URL to redirect after cancelled payment | Your app URL (e.g., `http://localhost:3000/bookings/cancel`) |
| `PAYFAST_NOTIFY_URL` | 🔴 | Webhook URL for payment notifications | Your API URL (e.g., `http://localhost:3000/api/payfast/notify`) |

**Current Status**: ⚠️ **NEEDS CONFIGURATION**

**Action Required**:
1. Create PayFast merchant account at [payfast.co.za](https://www.payfast.co.za/)
2. Complete account verification process
3. Navigate to Settings → Integration
4. Copy Merchant ID and Merchant Key
5. Configure passphrase (optional but recommended for security)
6. Add all values to `.env.local`

**PayFast Test Credentials** (for sandbox testing):
- Test Card Number: `5200 0000 0000 0007`
- CVV: Any 3 digits
- Expiry: Any future date
- Name: Any name

---

## Application Configuration

### Base URLs

| Variable | Status | Description | Example |
|----------|--------|-------------|---------|
| `NEXT_PUBLIC_BASE_URL` | 🔴 | Base URL of your application | `http://localhost:3000` (dev) or `https://your-domain.com` (prod) |

---

## Required NPM Packages

Install these packages for the MVP:

```bash
# Supabase
npm install @supabase/supabase-js

# Azure MSAL (Counselor Authentication)
npm install @azure/msal-browser @azure/msal-react

# Microsoft Graph API
npm install @microsoft/microsoft-graph-client @azure/identity

# Crypto (for PayFast signature generation - built-in Node.js)
# No installation needed - uses Node.js built-in 'crypto' module
```

---

## Database Schema Requirements

### Important Fields

The `counselors` table requires these specific fields:

| Field | Type | Status | Description |
|-------|------|--------|-------------|
| `ms_graph_user_email` | TEXT | 🔴 | Email address for Microsoft Graph API meeting creation (must match Azure AD user email) |

**Action Required**:
- When creating counselor records, ensure `ms_graph_user_email` matches the counselor's Azure AD organizational email
- This email is used to create Teams meetings on behalf of the counselor

---

## File Structure Requirements

### Required Library Files

The following files must be created in your `lib/` directory:

| File | Status | Purpose |
|------|--------|---------|
| `lib/supabaseClient.ts` | 🔴 | Frontend Supabase client (uses anon key) |
| `lib/supabaseAdmin.ts` | 🔴 | Backend Supabase client (uses service role key) |
| `lib/msalClient.ts` | 🔴 | MSAL configuration for counselor authentication |
| `lib/graphClient.ts` | 🔴 | Microsoft Graph API client for Teams meetings |
| `lib/payfast.ts` | 🔴 | PayFast signature generation and verification utilities |

**Important Notes**:
- `supabaseAdmin.ts` must NEVER be imported in frontend code
- Only use `supabaseAdmin` in API routes (`app/api/**`)
- Service role key bypasses RLS - use only server-side

---

## Complete Environment Variables Template

Create `.env.local` file in project root:

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# AZURE AD - COUNSELOR AUTHENTICATION
# ============================================
NEXT_PUBLIC_AZURE_CLIENT_ID=your-azure-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-azure-tenant-id
NEXT_PUBLIC_AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000/counselor/callback

# ============================================
# MICROSOFT GRAPH API (Server-Side Only)
# ============================================
GRAPH_TENANT_ID=your-azure-tenant-id
GRAPH_CLIENT_ID=your-azure-client-id
GRAPH_CLIENT_SECRET=your-graph-client-secret

# ============================================
# PAYFAST PAYMENT GATEWAY
# ============================================
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_KEY=your-merchant-key
PAYFAST_PASSPHRASE=your-passphrase-optional
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

## Setup Checklist

### Supabase Setup
- [ ] Create Supabase project
- [ ] Copy Project URL and API keys
- [ ] Run database schema SQL (from REBUILD_GUIDE.md)
- [ ] Test database connection
- [ ] Verify RLS policies are active

### Azure AD Setup
- [ ] Create Azure AD App Registration
- [ ] Configure redirect URI for counselor login (SPA platform)
- [ ] Set redirect URI: `http://localhost:3000/counselor/callback` (dev)
- [ ] Add Delegated permissions: `User.Read`, `offline_access`
- [ ] Grant admin consent for Delegated permissions
- [ ] Add Application permissions: `OnlineMeetings.ReadWrite.All`, `Calendars.ReadWrite`
- [ ] Grant admin consent for Application permissions
- [ ] Create client secret for Graph API
- [ ] Copy Client ID, Tenant ID, and Client Secret
- [ ] Set `NEXT_PUBLIC_AZURE_AUTHORITY` to `https://login.microsoftonline.com/{TENANT_ID}`
- [ ] Add all values to `.env.local`

### PayFast Setup
- [ ] Create PayFast merchant account
- [ ] Complete account verification
- [ ] Navigate to Settings → Integration
- [ ] Copy Merchant ID and Merchant Key
- [ ] Configure passphrase (optional)
- [ ] Test with sandbox environment
- [ ] Add all credentials to `.env.local`

### Application Setup
- [ ] Install required npm packages (see Required NPM Packages section)
- [ ] Create required library files (see File Structure Requirements section)
- [ ] Create `.env.local` file
- [ ] Add all environment variables
- [ ] Verify no secrets are committed to git (check `.gitignore`)
- [ ] Run Supabase schema SQL (from REBUILD_GUIDE.md)
- [ ] Create test counselor record with `ms_graph_user_email` field
- [ ] Test client registration/login
- [ ] Test counselor Microsoft login
- [ ] Test booking creation
- [ ] Test PayFast payment flow
- [ ] Test PayFast webhook
- [ ] Test Teams meeting creation

---

## Security Best Practices

### ⚠️ CRITICAL: Secret Management

1. **Never commit secrets to version control**
   - ✅ Add `.env.local` to `.gitignore`
   - ✅ Use `.env.example` for templates (without real values)
   - ✅ Never push `.env.local` to GitHub

2. **Environment Separation**
   - Use different Supabase projects for dev/staging/production
   - Use PayFast sandbox for development
   - Use separate Azure AD apps for dev/prod (recommended)

3. **Access Control**
   - Limit who has access to Supabase dashboard
   - Limit who has access to Azure Portal
   - Use Azure RBAC for resource access
   - Enable MFA for Azure Portal access

4. **Secret Rotation**
   - Rotate client secrets regularly (recommended: every 90 days)
   - Update PayFast credentials if compromised
   - Monitor Azure AD sign-in logs for suspicious activity

---

## Quick Reference: Where to Find Credentials

### Supabase Dashboard
- **URL**: https://app.supabase.com
- **Credentials**: Project Settings → API → Project URL, anon key, service_role key
- **Database**: SQL Editor → Run schema SQL

### Azure Portal
- **URL**: https://portal.azure.com
- **App Registration**: Azure Active Directory → App registrations → Your App
- **Client ID & Tenant ID**: Overview page
- **Client Secret**: Certificates & secrets → Create new secret
- **API Permissions**: API permissions → Add permissions → Microsoft Graph

### PayFast Dashboard
- **URL**: https://www.payfast.co.za/
- **Credentials**: Settings → Integration → Merchant ID, Merchant Key, Passphrase

---

## Troubleshooting

### Supabase Issues
- **Issue**: Connection refused
  - **Solution**: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- **Issue**: Invalid API key
  - **Solution**: Check you're using the correct key (anon for client, service_role for server)

### Azure AD Issues
- **Issue**: Redirect URI mismatch
  - **Solution**: Verify redirect URI matches exactly in Azure Portal
- **Issue**: Insufficient permissions
  - **Solution**: Grant admin consent for all API permissions
- **Issue**: Graph API fails
  - **Solution**: Verify Application permissions (not Delegated) are granted

### PayFast Issues
- **Issue**: Invalid signature
  - **Solution**: Verify merchant key and passphrase are correct. Check signature generation matches PayFast requirements (alphabetical sorting, URL encoding)
- **Issue**: Webhook not received
  - **Solution**: Ensure `PAYFAST_NOTIFY_URL` is publicly accessible (use ngrok for local testing)
- **Issue**: Amount mismatch error
  - **Solution**: Verify `amount_gross` from PayFast matches booking amount (check decimal precision)

### Microsoft Graph API Issues
- **Issue**: Meeting creation fails with "Insufficient privileges"
  - **Solution**: Verify Application permissions (not Delegated) are granted and admin consent provided
- **Issue**: Cannot find user by email
  - **Solution**: Ensure `ms_graph_user_email` in counselors table matches Azure AD user email exactly
- **Issue**: Meeting creation fails with "Invalid user"
  - **Solution**: Verify the organizer email exists in your Azure AD tenant

---

## Production Deployment

### Environment Variables for Production

When deploying to production (Vercel, Netlify, etc.), configure these environment variables in your hosting platform:

**Required Variables:**
- All `NEXT_PUBLIC_*` variables (publicly accessible)
- All server-side variables (Supabase service role, Graph API secret, PayFast credentials)

**Important:**
- Update `PAYFAST_ENV` to `production` when ready
- Update all URLs to production domains
- Use production PayFast merchant account
- Consider using Azure Key Vault for secrets in production

---

## Support and Documentation

- **Supabase**: https://supabase.com/docs
- **Azure AD**: https://docs.microsoft.com/azure/active-directory/
- **Microsoft Graph**: https://docs.microsoft.com/graph/
- **PayFast**: https://developers.payfast.co.za/
- **Next.js**: https://nextjs.org/docs

---

---

## Additional Implementation Notes

### Counselor Email Configuration

When setting up counselors in the database:

1. **Create counselor record** with:
   - `email`: The counselor's email (can be any email)
   - `ms_graph_user_email`: **MUST** match the counselor's Azure AD organizational email
   - `display_name`: Counselor's display name

2. **Example**:
   ```sql
   INSERT INTO counselors (email, ms_graph_user_email, display_name)
   VALUES (
     'counselor@example.com',
     'counselor@yourdomain.com', -- Must match Azure AD email
     'Dr. Jane Smith'
   );
   ```

### Redirect URI Configuration

**Important**: The redirect URI must match exactly between:
- Azure Portal App Registration → Authentication → Redirect URIs
- Your `.env.local` → `NEXT_PUBLIC_AZURE_REDIRECT_URI`

Common patterns:
- `/counselor/callback` - Used when MSAL redirects after authentication
- `/counselor/login` - Used if implementing redirect flow differently

**Check your implementation** in `lib/msalClient.ts` to see which pattern is used.

### PayFast Webhook Testing

For local development, use a tunneling service:

1. **Using ngrok**:
   ```bash
   ngrok http 3000
   ```
   Then set `PAYFAST_NOTIFY_URL=https://your-ngrok-url.ngrok.io/api/payfast/notify`

2. **Using localtunnel**:
   ```bash
   npx localtunnel --port 3000
   ```

3. **Update PayFast settings** in PayFast dashboard with the tunnel URL

---

**Last Updated**: February 17, 2026  
**Document Owner**: Development Team  
**Review Frequency**: Monthly
