# Soulvyns MVP

A booking and payment system for counseling sessions with Microsoft Teams integration.

## Features

- **Client Authentication**: Email/password registration and login via Supabase Auth
- **Counselor Authentication**: Microsoft Azure AD organizational login via MSAL
- **Booking System**: Browse counselors and select available time slots
- **Payment Processing**: PayFast integration for secure payments
- **Teams Meetings**: Automatic Microsoft Teams meeting creation after payment confirmation

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + TailwindCSS
- **Database**: Supabase Postgres
- **Client Auth**: Supabase Auth
- **Counselor Auth**: Azure AD (MSAL)
- **Payments**: PayFast
- **Meetings**: Microsoft Graph API

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([sign up here](https://supabase.com))
- Azure AD tenant (Azure Portal access)
- PayFast merchant account ([sign up here](https://www.payfast.co.za/))

### Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 15 and React
- Supabase client
- Azure MSAL libraries
- Microsoft Graph client
- TailwindCSS and TypeScript

### Step 2: Supabase Schema Setup

1. **Create a Supabase project**:
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the database to provision (2-3 minutes)
   - Copy your project URL and API keys from Settings → API

2. **Run the database schema**:
   - Open Supabase Dashboard → SQL Editor
   - Copy the entire contents of `sql/complete_schema.sql`
   - Paste and run it in the SQL Editor
   - Verify tables are created: `users_profile`, `counselors`, `availability_slots`, `bookings`

3. **Get your Supabase credentials**:
   - **Project URL**: Settings → API → Project URL
   - **Anon Key**: Settings → API → `anon` `public` key
   - **Service Role Key**: Settings → API → `service_role` key (⚠️ Keep this secret!)

### Step 3: Azure App Registration Requirements

1. **Create App Registration**:
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to **Azure Active Directory** → **App registrations**
   - Click **+ New registration**
   - Name: `Soulvyns Counselor Login`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI: Platform **Single-page application (SPA)**, URI: `http://localhost:3000/counselor/login`
   - Click **Register**

2. **Configure API Permissions**:
   - Go to **API permissions** → **+ Add a permission** → **Microsoft Graph**
   
   **Delegated permissions** (for counselor login):
   - `User.Read`
   - `offline_access`
   - Click **Grant admin consent**
   
   **Application permissions** (for Teams meeting creation):
   - `OnlineMeetings.ReadWrite.All`
   - `Calendars.ReadWrite`
   - Click **Grant admin consent**

3. **Create Client Secret**:
   - Go to **Certificates & secrets** → **+ New client secret**
   - Description: `Graph API Secret`
   - Expires: 24 months (recommended)
   - **⚠️ Copy the secret value immediately** (you won't see it again!)

4. **Get your Azure credentials**:
   - **Client ID**: Overview → Application (client) ID
   - **Tenant ID**: Overview → Directory (tenant) ID
   - **Authority**: `https://login.microsoftonline.com/{TENANT_ID}`
   - **Client Secret**: From step 3 above

### Step 4: PayFast Setup

1. **Create PayFast account**:
   - Go to [payfast.co.za](https://www.payfast.co.za/)
   - Sign up and complete account verification
   - For testing, you can use sandbox mode immediately

2. **Get PayFast credentials**:
   - Go to **Settings** → **Integration**
   - Copy **Merchant ID** and **Merchant Key**
   - Set up **Passphrase** (optional but recommended for security)
   - Note: For local testing, use sandbox credentials

3. **Configure PayFast URLs**:
   - Return URL: `http://localhost:3000/bookings/success`
   - Cancel URL: `http://localhost:3000/bookings/cancel`
   - Notify URL: `http://localhost:3000/api/payfast/notify`
   - ⚠️ For local webhook testing, use [ngrok](https://ngrok.com/) to expose your local server

### Step 5: Environment Variables

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in all credentials** in `.env.local`:
   - Supabase credentials (from Step 2)
   - Azure AD credentials (from Step 3)
   - PayFast credentials (from Step 4)
   - Application base URL: `http://localhost:3000`

3. **Verify `.env.local` is in `.gitignore`** (already configured):
   - Never commit `.env.local` to version control
   - Only commit `.env.example` with placeholders

### Step 6: Run Locally

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open your browser**:
   - Navigate to `http://localhost:3000`
   - You should see the home page

3. **Test the application**:
   - Register a new client account
   - Login as a client
   - Browse counselors (you'll need to add counselor records to the database)
   - Test booking flow

### Additional Setup Notes

- **Adding Test Counselors**: Insert records into the `counselors` table with:
  - `email`: Counselor's email
  - `ms_graph_user_email`: Must match Azure AD user email (for Teams meetings)
  - `display_name`: Counselor's display name

- **Adding Availability Slots**: Insert records into `availability_slots` table with:
  - `counselor_id`: Reference to counselor
  - `start_time` and `end_time`: Available time slots
  - `is_booked`: Set to `false` for available slots

- **Local Webhook Testing**: Use ngrok to expose your local server:
  ```bash
  ngrok http 3000
  ```
  Then update `PAYFAST_NOTIFY_URL` in `.env.local` with the ngrok URL

## Project Structure

```
soulvyns/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── book/              # Booking pages
│   ├── bookings/          # Booking management pages
│   ├── counselor/         # Counselor pages
│   ├── login/             # Client login
│   └── register/          # Client registration
├── lib/                   # Utility libraries
│   ├── supabaseClient.ts  # Frontend Supabase client
│   ├── supabaseAdmin.ts   # Backend Supabase client
│   ├── msalClient.ts      # MSAL configuration
│   ├── graphClient.ts     # Microsoft Graph API client
│   └── payfast.ts         # PayFast utilities
├── sql/                   # Database schema
│   └── complete_schema.sql  # Complete database schema
└── .env.example           # Environment variables template
```

## Environment Variables

See `.env.example` for all required environment variables. Detailed setup instructions are in `CREDENTIAL_RETRIEVAL_GUIDE.md`.

## Database Schema

The database schema includes:
- `users_profile`: User profiles with roles (client/counselor)
- `counselors`: Counselor information
- `availability_slots`: Available time slots for booking
- `bookings`: Booking records with payment and meeting information

Run `sql/complete_schema.sql` in your Supabase SQL Editor to set up the database.

## Authentication Flow

### Clients
1. Register with email/password
2. Login via Supabase Auth
3. Browse counselors and book sessions

### Counselors
1. Login with Microsoft organizational account
2. System verifies email exists in `counselors` table
3. Access counselor dashboard

## Booking Flow

1. Client selects a counselor
2. Client selects an available time slot
3. Booking created with status `pending_payment`
4. Client redirected to PayFast payment page
5. After payment confirmation:
   - PayFast webhook notifies the application
   - Booking status updated to `confirmed`
   - Microsoft Teams meeting created automatically
   - Meeting URL stored in booking record

## API Routes

- `POST /api/bookings/create` - Create a new booking
- `POST /api/payfast/notify` - PayFast webhook handler
- `POST /api/counselors/verify` - Verify counselor authorization

## Security Notes

- Never commit `.env.local` to version control
- `SUPABASE_SERVICE_ROLE_KEY` should only be used server-side
- PayFast webhook signature verification is implemented
- Row Level Security (RLS) policies are configured in Supabase

## Documentation

- `REBUILD_GUIDE.md` - Complete rebuild guide with architecture details
- `CREDENTIAL_RETRIEVAL_GUIDE.md` - Step-by-step credential setup
- `OUTSTANDING_CREDENTIALS.md` - Checklist of required credentials

## Troubleshooting

### Common Issues

1. **Supabase connection errors**: Verify environment variables are set correctly
2. **Azure AD login fails**: Check redirect URI matches exactly
3. **PayFast webhook not received**: Ensure webhook URL is publicly accessible (use ngrok for local testing)
4. **Teams meeting creation fails**: Verify Application permissions are granted in Azure AD

See `CREDENTIAL_RETRIEVAL_GUIDE.md` for detailed troubleshooting steps.

## License

Private project - All rights reserved
