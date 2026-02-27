# Soulvyns MVP Rebuild Guide

**Simplified Architecture for Fastest Build**

This document provides a streamlined guide for rebuilding the Soulvyns MVP with the simplest working booking + payment + Teams meeting system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Database Setup (Supabase)](#database-setup-supabase)
4. [Client Authentication (Supabase Auth)](#client-authentication-supabase-auth)
5. [Counselor Authentication (Azure AD)](#counselor-authentication-azure-ad)
6. [Booking System](#booking-system)
7. [PayFast Payment Integration](#payfast-payment-integration)
8. [Microsoft Graph Teams Meeting](#microsoft-graph-teams-meeting)
9. [Implementation Phases](#implementation-phases)
10. [Environment Variables](#environment-variables)

---

## Architecture Overview

### Core Flow
```
Client Login (Supabase) → Select Counselor → Select Slot → Create Booking (pending_payment)
  ↓
PayFast Payment → Webhook Notification → Verify Payment → Create Teams Meeting → Confirm Booking
```

### Key Simplifications
- ✅ **Single Backend**: Next.js API routes (no separate Azure Functions)
- ✅ **Simple Database**: Supabase Postgres (no Cosmos DB)
- ✅ **Dual Auth**: Supabase for clients, Azure AD for counselors only
- ✅ **Payment-First**: Teams meeting created ONLY after payment confirmation
- ✅ **Minimal Features**: Core booking flow only, no extras

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: TailwindCSS
- **Client Auth**: Supabase Auth (email/password)
- **Counselor Auth**: Azure MSAL (organizational accounts)

### Backend
- **API**: Next.js API Routes (`/app/api/*`)
- **Database**: Supabase Postgres
- **Payments**: PayFast redirect flow + webhook
- **Meetings**: Microsoft Graph API (client credentials flow)

### Database
- **Provider**: Supabase Postgres
- **ORM**: Supabase JS Client (or direct SQL)

---

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database to provision
4. Copy project URL and anon key

### 2. Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Profile Table (extends Supabase Auth)
CREATE TABLE users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('client', 'counselor')),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Counselors Table
CREATE TABLE counselors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users_profile(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  azure_ad_id TEXT,
  ms_graph_user_email TEXT NOT NULL, -- Email for Graph API meeting creation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability Slots Table
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Bookings Table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'cancelled')),
  amount NUMERIC(10, 2) NOT NULL,
  meeting_url TEXT,
  payfast_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_counselor_id ON bookings(counselor_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_availability_slots_counselor_id ON availability_slots(counselor_id);
CREATE INDEX idx_availability_slots_is_booked ON availability_slots(is_booked);

-- Row Level Security (RLS) Policies
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users_profile
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users_profile
  FOR UPDATE USING (auth.uid() = id);

-- Public read access to counselors
CREATE POLICY "Public can read counselors" ON counselors
  FOR SELECT USING (true);

-- Counselors can manage their own availability
CREATE POLICY "Counselors can manage own availability" ON availability_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM counselors c
      WHERE c.id = availability_slots.counselor_id
      AND c.user_id = auth.uid()
    )
  );

-- Clients can read their own bookings
CREATE POLICY "Clients can read own bookings" ON bookings
  FOR SELECT USING (auth.uid() = client_id);

-- Counselors can read their own bookings
CREATE POLICY "Counselors can read own bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM counselors c
      WHERE c.id = bookings.counselor_id
      AND c.user_id = auth.uid()
    )
  );

-- Clients can create bookings
CREATE POLICY "Clients can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Supabase Client Setup

Install Supabase:
```bash
npm install @supabase/supabase-js
```

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

---

## Client Authentication (Supabase Auth)

### 1. Client Registration Page

Create `app/register/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'client',
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        router.push('/book');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border rounded">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
}
```

### 2. Client Login Page

Create `app/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/book');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border rounded">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

---

## Counselor Authentication (Azure AD)

### 1. Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Configure:
   - **Name**: `Soulvyns Counselor Login`
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: 
     - Platform: **Single-page application (SPA)**
     - URI: `http://localhost:3000/counselor/callback` (dev)
     - URI: `https://your-domain.com/counselor/callback` (prod)

4. **API permissions** → Add:
   - `User.Read` (Delegated)
   - `offline_access` (Delegated)
   - Click **Grant admin consent**

5. **Certificates & secrets** → Create client secret for Graph API:
   - Description: `Graph API Secret`
   - Copy secret value immediately

### 2. MSAL Setup

Install MSAL:
```bash
npm install @azure/msal-browser @azure/msal-react
```

Create `lib/msal.ts`:
```typescript
import { PublicClientApplication, Configuration } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || 'http://localhost:3000/counselor/callback',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
```

### 3. Counselor Login Page

Create `app/counselor/login/page.tsx`:
```typescript
'use client';

import { useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CounselorLoginPage() {
  const { instance, accounts } = useMsal();
  const router = useRouter();

  useEffect(() => {
    if (accounts.length > 0) {
      // Verify counselor exists in database
      verifyCounselor(accounts[0]);
    }
  }, [accounts]);

  const handleLogin = async () => {
    try {
      await instance.loginPopup({
        scopes: ['User.Read'],
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const verifyCounselor = async (account: any) => {
    // Call API to verify counselor email exists
    const response = await fetch('/api/counselors/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.username }),
    });

    if (response.ok) {
      router.push('/counselor/dashboard');
    } else {
      alert('You are not authorized as a counselor');
      instance.logout();
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border rounded">
      <h1 className="text-2xl font-bold mb-4">Counselor Login</h1>
      <button
        onClick={handleLogin}
        className="w-full bg-blue-500 text-white p-2 rounded"
      >
        Sign in with Microsoft
      </button>
    </div>
  );
}
```

### 4. MSAL Provider Setup

Wrap app in `app/layout.tsx`:
```typescript
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from '@/lib/msal';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <MsalProvider instance={msalInstance}>
          {children}
        </MsalProvider>
      </body>
    </html>
  );
}
```

---

## Booking System

### 1. Browse Counselors Page

Create `app/book/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Counselor {
  id: string;
  display_name: string;
  email: string;
}

export default function BookPage() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCounselors();
  }, []);

  const loadCounselors = async () => {
    const { data, error } = await supabase
      .from('counselors')
      .select('id, display_name, email');

    if (error) {
      console.error('Error loading counselors:', error);
    } else {
      setCounselors(data || []);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-4">Book a Session</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {counselors.map((counselor) => (
          <Link
            key={counselor.id}
            href={`/book/${counselor.id}`}
            className="p-4 border rounded hover:bg-gray-50"
          >
            <h2 className="font-semibold">{counselor.display_name}</h2>
            <p className="text-sm text-gray-600">{counselor.email}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### 2. Select Time Slot Page

Create `app/book/[id]/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export default function SelectSlotPage() {
  const params = useParams();
  const router = useRouter();
  const counselorId = params.id as string;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableSlots();
  }, [counselorId]);

  const loadAvailableSlots = async () => {
    const { data, error } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('counselor_id', counselorId)
      .eq('is_booked', false)
      .gte('start_time', new Date().toISOString())
      .order('start_time');

    if (error) {
      console.error('Error loading slots:', error);
    } else {
      setSlots(data || []);
    }
    setLoading(false);
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Create booking
    const response = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        counselorId,
        slotId: selectedSlot,
        amount: 500.00, // Set your price
      }),
    });

    const { bookingId, paymentUrl } = await response.json();

    if (paymentUrl) {
      window.location.href = paymentUrl;
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-4">Select Time Slot</h1>
      <div className="space-y-2 mb-6">
        {slots.map((slot) => (
          <button
            key={slot.id}
            onClick={() => setSelectedSlot(slot.id)}
            className={`w-full p-4 border rounded text-left ${
              selectedSlot === slot.id ? 'bg-blue-100 border-blue-500' : ''
            }`}
          >
            {new Date(slot.start_time).toLocaleString()}
          </button>
        ))}
      </div>
      <button
        onClick={handleBookSlot}
        disabled={!selectedSlot}
        className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-300"
      >
        Book Session (R500.00)
      </button>
    </div>
  );
}
```

### 3. Create Booking API Route

Create `app/api/bookings/create/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createPayFastPaymentUrl } from '@/lib/payfast';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { counselorId, slotId, amount } = body;

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: user.id,
        counselor_id: counselorId,
        slot_id: slotId,
        status: 'pending_payment',
        amount,
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 400 });
    }

    // Mark slot as booked
    await supabase
      .from('availability_slots')
      .update({ is_booked: true })
      .eq('id', slotId);

    // Get user profile for PayFast
    const { data: profile } = await supabase
      .from('users_profile')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Create PayFast payment URL
    const paymentUrl = await createPayFastPaymentUrl({
      bookingId: booking.id,
      amount,
      clientEmail: profile?.email || user.email || '',
      clientName: profile?.full_name || '',
    });

    return NextResponse.json({
      bookingId: booking.id,
      paymentUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## PayFast Payment Integration

### 1. PayFast Service

Create `lib/payfast.ts`:
```typescript
import crypto from 'crypto';

export interface PayFastPaymentParams {
  bookingId: string;
  amount: number;
  clientEmail: string;
  clientName: string;
}

export async function createPayFastPaymentUrl(params: PayFastPaymentParams): Promise<string> {
  const merchantId = process.env.PAYFAST_MERCHANT_ID!;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY!;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const environment = process.env.PAYFAST_ENV || 'sandbox';

  const baseUrl = environment === 'production'
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process';

  const paymentData: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: process.env.PAYFAST_RETURN_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/success`,
    cancel_url: process.env.PAYFAST_CANCEL_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/cancel`,
    notify_url: process.env.PAYFAST_NOTIFY_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/api/payfast/notify`,
    name_first: params.clientName.split(' ')[0] || '',
    name_last: params.clientName.split(' ').slice(1).join(' ') || '',
    email_address: params.clientEmail,
    m_payment_id: params.bookingId,
    amount: params.amount.toFixed(2),
    item_name: `Counseling Session - Booking ${params.bookingId}`,
  };

  // Generate signature
  const signature = generateSignature(paymentData, passphrase);
  paymentData.signature = signature;

  // Build URL
  const paramsString = Object.keys(paymentData)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(paymentData[key])}`)
    .join('&');

  return `${baseUrl}?${paramsString}`;
}

function generateSignature(data: Record<string, string>, passphrase?: string): string {
  // Remove signature and empty values
  const filtered: Record<string, string> = {};
  Object.keys(data).forEach((key) => {
    if (key !== 'signature' && data[key]) {
      filtered[key] = data[key];
    }
  });

  // Sort and create parameter string
  const paramString = Object.keys(filtered)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(filtered[key]).replace(/%20/g, '+')}`)
    .join('&');

  // Add passphrase if configured
  const fullString = passphrase ? `${paramString}&passphrase=${encodeURIComponent(passphrase)}` : paramString;

  // Generate MD5 hash
  return crypto.createHash('md5').update(fullString).digest('hex');
}

export function verifyPayFastSignature(data: Record<string, string>, receivedSignature: string): boolean {
  const signature = generateSignature(data, process.env.PAYFAST_PASSPHRASE);
  return signature === receivedSignature;
}
```

### 2. PayFast Notify Webhook

Create `app/api/payfast/notify/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPayFastSignature } from '@/lib/payfast';
import { createTeamsMeeting } from '@/lib/graph';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const notificationData: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      notificationData[key] = value.toString();
    });

    // Verify signature
    const isValid = verifyPayFastSignature(notificationData, notificationData.signature || '');
    if (!isValid) {
      return new NextResponse('Invalid signature', { status: 400 });
    }

    // Check payment status
    if (notificationData.payment_status !== 'COMPLETE') {
      return new NextResponse('OK', { status: 200 }); // Acknowledge but don't process
    }

    const bookingId = notificationData.m_payment_id;
    const supabase = createServerClient();

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        counselors!inner(ms_graph_user_email, display_name),
        users_profile!inner(email, full_name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new NextResponse('Booking not found', { status: 404 });
    }

    // Update booking status
    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payfast_payment_id: notificationData.pf_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    // Create Teams meeting
    try {
      const meeting = await createTeamsMeeting({
        organizerEmail: booking.counselors.ms_graph_user_email,
        attendeeEmail: booking.users_profile.email,
        subject: `Counseling Session - ${booking.counselors.display_name}`,
        startTime: new Date(booking.slot_id).toISOString(), // You'll need to get slot time
        durationMinutes: 60,
      });

      // Update booking with meeting URL
      await supabase
        .from('bookings')
        .update({ meeting_url: meeting.joinUrl })
        .eq('id', bookingId);
    } catch (meetingError) {
      console.error('Failed to create Teams meeting:', meetingError);
      // Continue - meeting can be created manually later
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('PayFast notify error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}
```

---

## Microsoft Graph Teams Meeting

### 1. Graph API Setup

Install Microsoft Graph:
```bash
npm install @microsoft/microsoft-graph-client @azure/identity
```

### 2. Graph Service

Create `lib/graph.ts`:
```typescript
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

let graphClient: Client | null = null;

function getGraphClient(): Client {
  if (graphClient) {
    return graphClient;
  }

  const credential = new ClientSecretCredential(
    process.env.GRAPH_TENANT_ID!,
    process.env.GRAPH_CLIENT_ID!,
    process.env.GRAPH_CLIENT_SECRET!
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  graphClient = Client.initWithMiddleware({ authProvider });
  return graphClient;
}

export interface CreateMeetingOptions {
  organizerEmail: string;
  attendeeEmail: string;
  subject: string;
  startTime: string; // ISO 8601
  durationMinutes: number;
}

export async function createTeamsMeeting(options: CreateMeetingOptions): Promise<{
  joinUrl: string;
  meetingId: string;
}> {
  const client = getGraphClient();

  // Get organizer user ID
  const organizer = await client
    .api(`/users/${options.organizerEmail}`)
    .get();

  const startDateTime = new Date(options.startTime);
  const endDateTime = new Date(startDateTime.getTime() + options.durationMinutes * 60 * 1000);

  // Create online meeting
  const meeting = await client
    .api(`/users/${organizer.id}/onlineMeetings`)
    .post({
      subject: options.subject,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      participants: {
        attendees: [
          {
            upn: options.attendeeEmail,
            role: 'attendee',
          },
        ],
        organizers: [
          {
            upn: options.organizerEmail,
            role: 'organizer',
          },
        ],
      },
    });

  return {
    joinUrl: meeting.joinUrl,
    meetingId: meeting.id,
  };
}
```

### 3. Azure AD App Permissions for Graph

In Azure Portal → App Registrations → Your App → API permissions:

Add **Application permissions** (not Delegated):
- `OnlineMeetings.ReadWrite.All`
- `Calendars.ReadWrite`

Click **Grant admin consent**.

---

## Implementation Phases

### Phase 1: Core Booking (2-4 days)
- [ ] Supabase setup + schema
- [ ] Client registration/login
- [ ] Counselor login (Azure AD)
- [ ] Browse counselors page
- [ ] Select time slot page
- [ ] Create booking API

### Phase 2: Payment Integration (1-2 days)
- [ ] PayFast service utility
- [ ] Create payment API endpoint
- [ ] PayFast notify webhook
- [ ] Payment success/cancel pages

### Phase 3: Teams Meeting (1-2 days)
- [ ] Microsoft Graph client setup
- [ ] Create Teams meeting function
- [ ] Integrate with PayFast webhook
- [ ] Test meeting creation

### Phase 4: Dashboards (1 day)
- [ ] Counselor dashboard (view bookings)
- [ ] Client booking history page

---

## Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Azure AD (Counselor Login)
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000/counselor/callback

# Microsoft Graph API
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret

# PayFast
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_KEY=your-merchant-key
PAYFAST_PASSPHRASE=your-passphrase
PAYFAST_ENV=sandbox
PAYFAST_RETURN_URL=http://localhost:3000/bookings/success
PAYFAST_CANCEL_URL=http://localhost:3000/bookings/cancel
PAYFAST_NOTIFY_URL=http://localhost:3000/api/payfast/notify

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Testing Checklist

### Client Flow
- [ ] Register new client account
- [ ] Login with client credentials
- [ ] Browse counselors
- [ ] Select available time slot
- [ ] Create booking (status: pending_payment)
- [ ] Redirect to PayFast
- [ ] Complete payment with test card
- [ ] Verify webhook received
- [ ] Verify booking status updated to confirmed
- [ ] Verify Teams meeting created
- [ ] Verify meeting URL in booking

### Counselor Flow
- [ ] Login with Microsoft account
- [ ] Verify counselor authorization
- [ ] View dashboard with bookings
- [ ] Verify meeting URLs accessible

---

## Key Simplifications

✅ **Single Backend**: Next.js API routes (no Azure Functions)  
✅ **Simple Database**: Supabase Postgres (no Cosmos DB)  
✅ **Dual Auth**: Supabase for clients, Azure AD for counselors  
✅ **Payment-First**: Teams meeting created ONLY after payment  
✅ **Minimal Features**: Core booking flow only  

---

## ⭐ Cursor Rebuild Prompt (Soulvyns MVP)

### Complete Implementation Reference

This section provides the exact implementation details, folder structure, and code needed to rebuild Soulvyns MVP from scratch.

---

### Cursor AI Prompt

**Copy-paste this prompt into Cursor:**

```
You are rebuilding an MVP web app called "Soulvyns".
The goal is to implement the simplest working booking + payment + Teams meeting system.

Tech Stack Requirements

Frontend: Next.js (App Router) + TypeScript
UI: TailwindCSS
Database: Supabase Postgres
Client authentication: Supabase Auth (email/password)
Counselor authentication: Microsoft Azure AD organizational login using MSAL
Payments: PayFast redirect flow + webhook notify endpoint
Teams meetings: Microsoft Graph API (client credentials flow)

Core Features
1. Authentication
Clients
- register/login with email/password using Supabase Auth
- stored as role = "client"

Counselors
- login using Microsoft Azure AD (organizational accounts)
- only allow counselor access if email exists in database table counselors

2. Booking System
- client selects counselor
- client selects available time slot
- create booking row with status = "pending_payment"
- lock slot as booked (or mark reserved)

3. PayFast Payment Flow
Create Payment Endpoint
- API route: POST /api/payfast/create-payment
- accepts: bookingId, amount
- generates PayFast signature
- returns payment redirect URL

PayFast Notify Endpoint (Webhook)
- API route: POST /api/payfast/notify
- verifies PayFast signature
- if payment_status === "COMPLETE":
  - update booking status = "confirmed"
  - call Microsoft Graph API to create Teams meeting
  - store meeting join URL in booking row

4. Microsoft Graph Teams Meeting Creation
- Implement helper service lib/graph.ts
- Use ClientSecretCredential with:
  - GRAPH_TENANT_ID
  - GRAPH_CLIENT_ID
  - GRAPH_CLIENT_SECRET
- Create online meeting for counselor user
- Return join URL and meeting id
- Save join URL into booking

5. Database Schema (Supabase SQL)
Create tables:
- users_profile
  - id uuid (same as Supabase auth uid)
  - role text ("client" or "counselor")
  - email text
  - full_name text
- counselors
  - id uuid primary key
  - user_id uuid references users_profile(id)
  - email text unique
  - display_name text
- availability_slots
  - id uuid primary key
  - counselor_id uuid references counselors(id)
  - start_time timestamptz
  - end_time timestamptz
  - is_booked boolean default false
- bookings
  - id uuid primary key
  - client_id uuid references users_profile(id)
  - counselor_id uuid references counselors(id)
  - slot_id uuid references availability_slots(id)
  - status text ("pending_payment", "confirmed", "cancelled")
  - amount numeric
  - meeting_url text nullable
  - payfast_payment_id text nullable
  - created_at timestamptz default now()

Pages Required
Public Pages
- / landing page
- /login client login
- /register client register

Client Pages
- /book browse counselors + select slot
- /bookings view booking history

Counselor Pages
- /counselor/login Microsoft login
- /counselor/dashboard list bookings

Implementation Rules
- Keep everything minimal and functional
- Use server-side API routes for PayFast + Graph calls
- Do not build extra features like notifications, refunds, admin panel
- Ensure PayFast signature validation is implemented correctly
- Teams meeting must only be created after payment confirmation
- Use environment variables for all secrets
- Provide clean modular folder structure

Environment Variables Needed
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_AZURE_CLIENT_ID=
NEXT_PUBLIC_AZURE_TENANT_ID=
NEXT_PUBLIC_AZURE_AUTHORITY=
NEXT_PUBLIC_AZURE_REDIRECT_URI=

GRAPH_TENANT_ID=
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=

PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
PAYFAST_ENV=sandbox
PAYFAST_RETURN_URL=
PAYFAST_CANCEL_URL=
PAYFAST_NOTIFY_URL=

Expected Output
Generate:
- working Next.js app with routes and UI
- Supabase schema SQL file
- PayFast service utility
- Microsoft Graph meeting utility
- booking/payment flow fully working end-to-end
```

---

## 📁 Exact Folder Structure

Here's the cleanest structure for Next.js App Router:

```
soulvyns/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   │
│   ├── login/
│   │   └── page.tsx
│   │
│   ├── register/
│   │   └── page.tsx
│   │
│   ├── book/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   │
│   ├── bookings/
│   │   ├── page.tsx
│   │   ├── success/
│   │   │   └── page.tsx
│   │   └── cancel/
│   │       └── page.tsx
│   │
│   ├── counselor/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   │
│   └── api/
│       ├── payfast/
│       │   ├── create-payment/
│       │   │   └── route.ts
│       │   └── notify/
│       │       └── route.ts
│       │
│       ├── bookings/
│       │   ├── create/
│       │   │   └── route.ts
│       │   └── list/
│       │       └── route.ts
│       │
│       └── counselors/
│           └── verify/
│               └── route.ts
│
├── components/
│   ├── PaymentButton.tsx
│   ├── CounselorLoginButton.tsx
│   └── Navbar.tsx
│
├── lib/
│   ├── supabaseClient.ts
│   ├── supabaseAdmin.ts
│   ├── msalClient.ts
│   ├── graphClient.ts
│   ├── payfast.ts
│   └── authHelpers.ts
│
├── sql/
│   └── complete_schema.sql
│
├── middleware.ts
│
├── .env.local
├── package.json
├── tsconfig.json
└── next.config.js
```

**Why this structure is perfect:**
- ✅ Everything important is in `/lib`
- ✅ All APIs are in `/app/api` (Next.js native)
- ✅ Schema is stored cleanly in `/sql/complete_schema.sql`
- ✅ Counselor auth is isolated (no messy overlap with client auth)

---

## 🗄️ Complete Supabase Schema (complete_schema.sql)

Create `sql/complete_schema.sql`:

```sql
-- ============================
-- SOULVYNS DATABASE SCHEMA
-- ============================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================
-- USERS PROFILE TABLE
-- ============================
create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client', 'counselor')),
  email text not null unique,
  full_name text,
  created_at timestamptz default now()
);

-- ============================
-- COUNSELORS TABLE
-- ============================
create table if not exists public.counselors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users_profile(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  ms_graph_user_email text not null, -- Email for Graph API meeting creation
  created_at timestamptz default now()
);

-- ============================
-- AVAILABILITY SLOTS
-- ============================
create table if not exists public.availability_slots (
  id uuid primary key default uuid_generate_v4(),
  counselor_id uuid not null references public.counselors(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_booked boolean default false,
  created_at timestamptz default now(),
  constraint valid_time_range check (end_time > start_time)
);

-- ============================
-- BOOKINGS TABLE
-- ============================
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.users_profile(id) on delete cascade,
  counselor_id uuid not null references public.counselors(id) on delete cascade,
  slot_id uuid not null references public.availability_slots(id) on delete cascade,

  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'cancelled')),

  amount numeric(10,2) not null,
  payfast_payment_id text,
  meeting_url text,
  payment_status text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================
-- INDEXES (important for speed)
-- ============================
create index if not exists idx_bookings_client_id on public.bookings(client_id);
create index if not exists idx_bookings_counselor_id on public.bookings(counselor_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_availability_counselor_id on public.availability_slots(counselor_id);
create index if not exists idx_availability_start_time on public.availability_slots(start_time);
create index if not exists idx_availability_is_booked on public.availability_slots(is_booked);

-- ============================
-- ROW LEVEL SECURITY
-- ============================
alter table public.users_profile enable row level security;
alter table public.counselors enable row level security;
alter table public.availability_slots enable row level security;
alter table public.bookings enable row level security;

-- ============================
-- BASIC RLS POLICIES
-- ============================

-- Users can read their own profile
create policy "Users can view own profile"
on public.users_profile
for select
using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
on public.users_profile
for update
using (auth.uid() = id);

-- Public can view counselors (for booking page)
create policy "Public can view counselors"
on public.counselors
for select
using (true);

-- Counselors can view their own counselor record
create policy "Counselors can view own record"
on public.counselors
for select
using (auth.uid() = user_id);

-- Public can view available slots
create policy "Public can view available slots"
on public.availability_slots
for select
using (is_booked = false);

-- Counselors can manage their own availability
create policy "Counselors can manage own availability"
on public.availability_slots
for all
using (
  auth.uid() in (
    select user_id from public.counselors where id = counselor_id
  )
);

-- Clients can view their bookings
create policy "Clients can view own bookings"
on public.bookings
for select
using (auth.uid() = client_id);

-- Counselors can view bookings assigned to them
create policy "Counselors can view their bookings"
on public.bookings
for select
using (
  auth.uid() in (
    select user_id from public.counselors where id = counselor_id
  )
);

-- Clients can create bookings
create policy "Clients can create bookings"
on public.bookings
for insert
with check (auth.uid() = client_id);

-- ============================
-- FUNCTION: Auto-create user profile on signup
-- ============================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users_profile (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Important note:** For webhook updates (PayFast notify), you will use the Supabase service role key, so it bypasses RLS.

---

## 🔐 Minimal MSAL Counselor Auth Implementation

### Install Dependencies

```bash
npm install @azure/msal-browser @azure/msal-react
```

### Create MSAL Client

**`lib/msalClient.ts`:**

```typescript
import { PublicClientApplication, Configuration } from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
    authority: process.env.NEXT_PUBLIC_AZURE_AUTHORITY!,
    redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI!,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ["User.Read"],
};
```

### Wrap Your App With MSAL Provider

**`app/layout.tsx`:**

```typescript
"use client";

import "./globals.css";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/msalClient";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MsalProvider instance={msalInstance}>
          {children}
        </MsalProvider>
      </body>
    </html>
  );
}
```

### Counselor Login Page

**`app/counselor/login/page.tsx`:**

```typescript
"use client";

import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msalClient";
import { useRouter } from "next/navigation";

export default function CounselorLoginPage() {
  const { instance } = useMsal();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      
      // Verify counselor exists in database
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        const response = await fetch('/api/counselors/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: accounts[0].username }),
        });

        if (response.ok) {
          router.push('/counselor/dashboard');
        } else {
          alert('You are not authorized as a counselor');
          instance.logout();
        }
      }
    } catch (err) {
      console.error("MSAL login error:", err);
      alert("Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 border rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Counselor Login</h1>
        <p className="text-gray-600 mb-6">
          Sign in using your organization Microsoft account.
        </p>

        <button
          onClick={handleLogin}
          className="bg-black text-white px-6 py-3 rounded-lg w-full hover:bg-gray-800 transition"
        >
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
```

### Counselor Dashboard (Minimal)

**`app/counselor/dashboard/page.tsx`:**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

export default function CounselorDashboard() {
  const { accounts } = useMsal();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (accounts.length > 0) {
      setEmail(accounts[0].username);
    }
  }, [accounts]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Counselor Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Logged in as: <span className="font-semibold">{email}</span>
      </p>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Upcoming Bookings</h2>
        <p className="text-gray-500">(Bookings list will load here)</p>
      </div>
    </div>
  );
}
```

### Counselor Verification API

**`app/api/counselors/verify/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('counselors')
      .select('id, email, display_name')
      .eq('email', email)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Counselor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, counselor: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 💳 PayFast Notify Verification (Correctly Implemented)

This is the part people mess up. PayFast requires:
- ✅ Rebuild parameter string in correct order
- ✅ URL encoding rules
- ✅ MD5 signature check
- ✅ Validate payment_status

### PayFast Utility

**`lib/payfast.ts`:**

```typescript
import crypto from "crypto";

export function generatePayFastSignature(
  data: Record<string, string>,
  passphrase?: string
): string {
  // Remove empty values and signature
  const filtered: Record<string, string> = {};
  Object.keys(data).forEach((key) => {
    if (key !== "signature" && data[key] !== "" && data[key] !== undefined) {
      filtered[key] = data[key];
    }
  });

  // Sort keys alphabetically
  const sortedKeys = Object.keys(filtered).sort();

  // Build parameter string with URL encoding
  const paramString = sortedKeys
    .map((key) => `${key}=${encodeURIComponent(filtered[key]).replace(/%20/g, "+")}`)
    .join("&");

  // Add passphrase if configured
  const fullString = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`
    : paramString;

  // Generate MD5 hash
  return crypto.createHash("md5").update(fullString).digest("hex");
}

export function verifyPayFastSignature(
  data: Record<string, string>,
  receivedSignature: string,
  passphrase?: string
): boolean {
  const generatedSignature = generatePayFastSignature(data, passphrase);
  return generatedSignature === receivedSignature;
}
```

### Supabase Admin Client (Service Role Key)

**`lib/supabaseAdmin.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

⚠️ **Never expose service role key in frontend. This file is backend-only.**

### PayFast Notify Route (Webhook)

**`app/api/payfast/notify/route.ts`:**

```typescript
import { NextRequest } from "next/server";
import { verifyPayFastSignature } from "@/lib/payfast";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createTeamsMeeting } from "@/lib/graphClient";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};

    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    const receivedSignature = data.signature;
    if (!receivedSignature) {
      return new Response("Missing signature", { status: 400 });
    }

    // Verify merchant ID matches
    if (data.merchant_id !== process.env.PAYFAST_MERCHANT_ID) {
      return new Response("Merchant mismatch", { status: 400 });
    }

    // Remove signature for regeneration
    const signatureToVerify = data.signature;
    delete data.signature;

    // Verify signature
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    const isValid = verifyPayFastSignature(data, signatureToVerify, passphrase);

    if (!isValid) {
      console.error("PayFast signature mismatch", {
        receivedSignature: signatureToVerify,
        data,
      });
      return new Response("Invalid signature", { status: 400 });
    }

    const bookingId = data.m_payment_id;
    const paymentStatus = data.payment_status;

    if (!bookingId) {
      return new Response("Missing booking ID", { status: 400 });
    }

    // Get booking to verify amount
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("*, counselors!inner(ms_graph_user_email, display_name), users_profile!inner(email, full_name)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response("Booking not found", { status: 404 });
    }

    // Verify amount matches
    const expectedAmount = parseFloat(booking.amount).toFixed(2);
    const receivedAmount = parseFloat(data.amount_gross || "0").toFixed(2);
    
    if (expectedAmount !== receivedAmount) {
      console.error("Amount mismatch", { expectedAmount, receivedAmount });
      return new Response("Amount mismatch", { status: 400 });
    }

    // Only confirm on COMPLETE
    if (paymentStatus === "COMPLETE") {
      // Update booking status
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: paymentStatus,
          payfast_payment_id: data.pf_payment_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateError) {
        console.error("Database update error:", updateError);
        return new Response("Database update failed", { status: 500 });
      }

      // Create Teams meeting
      try {
        const slot = await supabaseAdmin
          .from("availability_slots")
          .select("start_time, end_time")
          .eq("id", booking.slot_id)
          .single();

        if (slot.data) {
          const meeting = await createTeamsMeeting({
            organizerEmail: booking.counselors.ms_graph_user_email,
            attendeeEmail: booking.users_profile.email,
            subject: `Counseling Session - ${booking.counselors.display_name}`,
            startTime: slot.data.start_time,
            endTime: slot.data.end_time,
          });

          // Update booking with meeting URL
          await supabaseAdmin
            .from("bookings")
            .update({ meeting_url: meeting.joinUrl })
            .eq("id", bookingId);
        }
      } catch (meetingError) {
        console.error("Failed to create Teams meeting:", meetingError);
        // Continue - meeting can be created manually later
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("PayFast notify error:", err);
    return new Response("Server error", { status: 500 });
  }
}
```

### Security Enhancements

The PayFast notify handler includes:
- ✅ Signature verification
- ✅ Merchant ID validation
- ✅ Amount verification (prevents tampering)
- ✅ Booking existence check
- ✅ Teams meeting creation only after payment confirmation

---

## 📝 Complete .env.local Template

**`.env.local`:**

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx

# ============================================
# AZURE AD - COUNSELOR AUTHENTICATION
# ============================================
NEXT_PUBLIC_AZURE_CLIENT_ID=xxxx
NEXT_PUBLIC_AZURE_TENANT_ID=xxxx
NEXT_PUBLIC_AZURE_AUTHORITY=https://login.microsoftonline.com/xxxx
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000/counselor/login

# ============================================
# MICROSOFT GRAPH API (Server-Side Only)
# ============================================
GRAPH_TENANT_ID=xxxx
GRAPH_CLIENT_ID=xxxx
GRAPH_CLIENT_SECRET=xxxx

# ============================================
# PAYFAST PAYMENT GATEWAY
# ============================================
PAYFAST_MERCHANT_ID=xxxx
PAYFAST_MERCHANT_KEY=xxxx
PAYFAST_PASSPHRASE=xxxx
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

## 🚀 Recommended Build Order

If you want Soulvyns to be bulletproof fast, build in this order:

1. **Schema + Supabase Auth (Clients)** ✅
   - Set up Supabase project
   - Run schema SQL
   - Implement client registration/login
   - Test authentication flow

2. **Counselor MSAL Login** ✅
   - Set up Azure AD app registration
   - Implement MSAL client
   - Create counselor login page
   - Add counselor verification API

3. **Booking Creation + Slot Locking** ✅
   - Create browse counselors page
   - Implement slot selection
   - Create booking API endpoint
   - Test booking creation flow

4. **PayFast Redirect + Notify Verification** ✅
   - Implement PayFast signature generation
   - Create payment redirect endpoint
   - Implement PayFast notify webhook
   - Test payment flow with sandbox

5. **Graph Teams Meeting Creation After Payment** ✅
   - Set up Microsoft Graph client
   - Implement Teams meeting creation
   - Integrate with PayFast webhook
   - Test end-to-end flow

**This order avoids "half built broken pieces" and ensures each component works before moving to the next.**

---

## Next Steps After MVP

1. Email notifications (booking confirmation, meeting links)
2. Counselor availability management UI
3. Booking cancellation flow
4. Payment retry logic
5. Admin dashboard

---

**This guide provides the fastest path to a working MVP. Focus on core functionality first, add features later.**
