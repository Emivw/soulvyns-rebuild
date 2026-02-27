# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying Soulvyns MVP to production using Vercel, Supabase, Azure AD, and PayFast.

---

## Prerequisites

- [ ] Vercel account ([vercel.com](https://vercel.com))
- [ ] Supabase project (production)
- [ ] Azure AD tenant with app registration
- [ ] PayFast merchant account (production)
- [ ] Domain name (optional but recommended)

---

## Step 1: Supabase Production Setup

### 1.1 Create Production Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project for production
3. Choose a region closest to your users
4. Set a strong database password
5. Wait for project provisioning

### 1.2 Deploy Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `sql/complete_schema.sql`
3. Paste and execute in SQL Editor
4. Verify tables are created:
   - `users_profile`
   - `counselors`
   - `availability_slots`
   - `bookings`

### 1.3 Get Production Credentials

1. Go to Settings → API
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

---

## Step 2: Azure AD Production Setup

### 2.1 Create Production App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **+ New registration**
4. Configure:
   - **Name**: `Soulvyns Production`
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: 
     - Platform: **Single-page application (SPA)**
     - URI: `https://your-domain.com/counselor/login`

### 2.2 Configure API Permissions

**Delegated Permissions** (for counselor login):
1. Go to **API permissions** → **+ Add a permission** → **Microsoft Graph**
2. Select **Delegated permissions**
3. Add: `User.Read`, `offline_access`
4. Click **Grant admin consent**

**Application Permissions** (for Teams meetings):
1. Still in **API permissions**
2. **+ Add a permission** → **Microsoft Graph**
3. Select **Application permissions**
4. Add: `OnlineMeetings.ReadWrite.All`, `Calendars.ReadWrite`
5. Click **Grant admin consent**

### 2.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **+ New client secret**
3. Description: `Production Graph API Secret`
4. Expires: 24 months (or your preference)
5. **⚠️ Copy secret value immediately** → `GRAPH_CLIENT_SECRET`

### 2.4 Get Production Credentials

From **Overview** page:
- **Application (client) ID** → `NEXT_PUBLIC_AZURE_CLIENT_ID` and `GRAPH_CLIENT_ID`
- **Directory (tenant) ID** → `NEXT_PUBLIC_AZURE_TENANT_ID` and `GRAPH_TENANT_ID`
- **Authority URL**: `https://login.microsoftonline.com/{TENANT_ID}` → `NEXT_PUBLIC_AZURE_AUTHORITY`
- **Redirect URI**: `https://your-domain.com/counselor/login` → `NEXT_PUBLIC_AZURE_REDIRECT_URI`

---

## Step 3: PayFast Production Setup

### 3.1 Configure Production Account

1. Log into [PayFast Dashboard](https://www.payfast.co.za/)
2. Complete account verification (if not already done)
3. Go to **Settings** → **Integration**

### 3.2 Get Production Credentials

- **Merchant ID** → `PAYFAST_MERCHANT_ID`
- **Merchant Key** → `PAYFAST_MERCHANT_KEY`
- **Passphrase** (if configured) → `PAYFAST_PASSPHRASE`

### 3.3 Configure Webhook URL

1. In PayFast Dashboard → **Settings** → **Integration**
2. Set **Notify URL**: `https://your-domain.com/api/payfast/notify`
3. Set **Return URL**: `https://your-domain.com/bookings/success`
4. Set **Cancel URL**: `https://your-domain.com/bookings/cancel`

**Important**: Webhook URL must be publicly accessible and use HTTPS.

---

## Step 4: Vercel Deployment

### 4.1 Prepare Repository

1. Ensure all code is committed to Git
2. Push to GitHub/GitLab/Bitbucket
3. Verify `.env.local` is in `.gitignore` (never commit secrets!)

### 4.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New Project**
3. Import your Git repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or your project root)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### 4.3 Configure Environment Variables

In Vercel project settings → **Environment Variables**, add all variables:

**Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Azure AD:**
```
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
NEXT_PUBLIC_AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
NEXT_PUBLIC_AZURE_REDIRECT_URI=https://your-domain.com/counselor/login
```

**Microsoft Graph:**
```
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
```

**PayFast:**
```
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_KEY=your-merchant-key
PAYFAST_PASSPHRASE=your-passphrase
PAYFAST_ENV=production
PAYFAST_RETURN_URL=https://your-domain.com/bookings/success
PAYFAST_CANCEL_URL=https://your-domain.com/bookings/cancel
PAYFAST_NOTIFY_URL=https://your-domain.com/api/payfast/notify
```

**Application:**
```
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NODE_ENV=production
```

**Important**: 
- Set all variables for **Production** environment
- Some variables (like `NEXT_PUBLIC_*`) should also be set for **Preview** if you want staging environments

### 4.4 Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Vercel will provide a deployment URL (e.g., `your-app.vercel.app`)
4. For custom domain, configure in **Settings** → **Domains**

---

## Step 5: Post-Deployment Verification

### 5.1 Verify Environment Variables

1. Check Vercel deployment logs for any missing variable errors
2. Verify all `NEXT_PUBLIC_*` variables are accessible
3. Verify server-side variables are not exposed in client bundle

### 5.2 Test Public Routes

- [ ] Homepage loads (`/`)
- [ ] Login page loads (`/login`)
- [ ] Register page loads (`/register`)
- [ ] Counselor login page loads (`/counselor/login`)

### 5.3 Test Authentication

- [ ] Client registration works
- [ ] Client login works
- [ ] Counselor Microsoft login works
- [ ] Logout works for both user types

### 5.4 Test Booking Flow

- [ ] Browse counselors (`/book`)
- [ ] Select time slot (`/book/[id]`)
- [ ] Create booking (redirects to PayFast)
- [ ] Complete test payment on PayFast
- [ ] Verify webhook received (check Vercel logs)
- [ ] Verify booking confirmed
- [ ] Verify Teams meeting created (if configured)

### 5.5 Verify Webhook

1. Check PayFast dashboard for webhook delivery status
2. Check Vercel function logs for webhook processing
3. Verify booking status updated in Supabase
4. Verify meeting URL saved (if Teams meeting created)

---

## Step 6: Security Checklist

### 6.1 Environment Variables

- [ ] `.env.local` not committed to Git
- [ ] `.env.example` has no real secrets
- [ ] Production environment variables set in Vercel
- [ ] Service role key only used server-side
- [ ] Graph client secret only used server-side

### 6.2 API Security

- [ ] Dev routes (`/api/dev/*`) disabled in production
- [ ] PayFast webhook signature verification working
- [ ] Authentication required for protected routes
- [ ] CORS configured correctly (if needed)

### 6.3 Database Security

- [ ] Row Level Security (RLS) policies active
- [ ] Service role key not exposed in frontend
- [ ] Database backups configured
- [ ] Connection strings secure

---

## Step 7: Monitoring & Maintenance

### 7.1 Set Up Monitoring

1. **Vercel Analytics**:
   - Enable in project settings
   - Monitor function execution times
   - Track error rates

2. **Error Tracking** (Recommended):
   - Set up Sentry or similar
   - Monitor API errors
   - Track client-side errors

3. **Logging**:
   - Monitor Vercel function logs
   - Set up log aggregation (optional)
   - Alert on critical errors

### 7.2 Regular Maintenance

- [ ] Monitor PayFast webhook delivery
- [ ] Check Supabase database performance
- [ ] Review Azure AD app permissions
- [ ] Rotate secrets regularly (every 90 days recommended)
- [ ] Monitor Teams meeting creation success rate

---

## Step 8: Domain Configuration

### 8.1 Add Custom Domain in Vercel

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `soulvyns.com`)
3. Follow DNS configuration instructions
4. Update environment variables with new domain

### 8.2 Update Redirect URIs

1. **Azure AD**: Update redirect URI to use custom domain
2. **PayFast**: Update webhook/return URLs to use custom domain
3. **Environment Variables**: Update `NEXT_PUBLIC_BASE_URL` and related URLs

---

## Troubleshooting

### Issue: Build fails in Vercel
**Check**:
- All environment variables are set
- TypeScript compilation passes locally
- Dependencies are in `package.json`

### Issue: Webhook not received
**Check**:
- Webhook URL is publicly accessible (HTTPS)
- PayFast notify URL configured correctly
- Vercel function logs for errors
- PayFast dashboard for delivery status

### Issue: Teams meeting not created
**Check**:
- Graph API credentials are correct
- Application permissions granted
- `ms_graph_user_email` matches Azure AD user
- Check function logs for Graph API errors

### Issue: Authentication fails
**Check**:
- Redirect URIs match exactly
- Environment variables are set correctly
- Azure AD app permissions granted
- Supabase credentials are correct

---

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] RLS policies active
- [ ] Dev routes disabled
- [ ] Custom domain configured
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Webhook URLs configured
- [ ] Test payment flow works
- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

## Rollback Plan

If issues occur after deployment:

1. **Revert Deployment**:
   - Go to Vercel → Deployments
   - Find last working deployment
   - Click "..." → "Promote to Production"

2. **Rollback Database**:
   - Use Supabase backups if needed
   - Or manually revert schema changes

3. **Update Environment Variables**:
   - Revert to previous values if needed
   - Redeploy after changes

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Azure AD Docs**: https://docs.microsoft.com/azure/active-directory/
- **PayFast Docs**: https://developers.payfast.co.za/
- **Next.js Docs**: https://nextjs.org/docs

---

**Last Updated**: February 18, 2026
