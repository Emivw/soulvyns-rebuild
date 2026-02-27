// 🌟 SOULVYNS DEV AUTO SEED + BOOKING + PAYMENT SIMULATION (Browser Version) 🌟
// 
// Copy and paste this entire script into your browser console at http://localhost:3000
// Make sure you have the Supabase anon key available (from .env.local)
//
// This version works entirely in the browser and uses the Supabase client library

(async () => {
  const BASE_URL = window.location.origin;
  
  try {
    console.log('🚀 Starting automated seed + booking + payment flow...\n');

    // Get Supabase credentials (you'll need to provide these)
    const supabaseUrl = prompt('Enter NEXT_PUBLIC_SUPABASE_URL:') || '';
    const supabaseAnonKey = prompt('Enter NEXT_PUBLIC_SUPABASE_ANON_KEY:') || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials required. Check .env.local file.');
    }

    // Load Supabase client
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // ============================================
    // 1️⃣ SEED DATABASE
    // ============================================
    console.log('📦 Step 1: Seeding database...');
    const seedRes = await fetch(`${BASE_URL}/api/dev/seed`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!seedRes.ok) {
      const errorData = await seedRes.json();
      throw new Error(`Seed failed: ${errorData.error || errorData.message}`);
    }
    
    const seedData = await seedRes.json();
    console.log('✅ Database seeded successfully!');
    console.log('   - Counselor:', seedData.data.counselor.email);
    console.log('   - Client:', seedData.data.client.email);
    console.log('   - Slots:', seedData.data.slots.length);
    console.log('');

    // ============================================
    // 2️⃣ AUTHENTICATE TEST CLIENT
    // ============================================
    console.log('🔐 Step 2: Authenticating test client...');
    
    const clientEmail = seedData.data.client.email;
    const clientPassword = seedData.data.client.password;
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: clientEmail,
      password: clientPassword,
    });
    
    if (authError || !authData.session) {
      throw new Error(`Authentication failed: ${authError?.message || 'No session'}`);
    }
    
    const authToken = authData.session.access_token;
    console.log('✅ Client authenticated:', clientEmail);
    console.log('');

    // ============================================
    // 3️⃣ GET AVAILABLE SLOTS
    // ============================================
    console.log('📅 Step 3: Fetching available slots...');
    const slotRes = await fetch(`${BASE_URL}/api/availability`);
    
    if (!slotRes.ok) {
      const errorData = await slotRes.json();
      throw new Error(`Failed to fetch slots: ${errorData.error}`);
    }
    
    const slots = await slotRes.json();
    const firstSlot = slots.find(slot => !slot.is_booked);
    
    if (!firstSlot?.id) {
      throw new Error('No available slots found. Try seeding again.');
    }
    
    console.log('✅ Found available slot:', {
      id: firstSlot.id,
      start: firstSlot.start_time,
      end: firstSlot.end_time,
      counselor_id: firstSlot.counselor_id
    });
    console.log('');

    // ============================================
    // 4️⃣ CREATE BOOKING
    // ============================================
    console.log('📝 Step 4: Creating booking...');
    
    const bookingRes = await fetch(`${BASE_URL}/api/bookings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        counselorId: firstSlot.counselor_id,
        slotId: firstSlot.id,
        amount: 100.00
      })
    });
    
    if (!bookingRes.ok) {
      const errorData = await bookingRes.json();
      throw new Error(`Booking creation failed: ${errorData.error || errorData.message}`);
    }
    
    const bookingData = await bookingRes.json();
    console.log('✅ Booking created:', {
      bookingId: bookingData.bookingId,
      paymentUrl: bookingData.paymentUrl ? 'Generated' : 'N/A'
    });
    console.log('');

    // ============================================
    // 5️⃣ SIMULATE PAYFAST WEBHOOK
    // ============================================
    console.log('💳 Step 5: Simulating PayFast webhook...');
    
    const webhookRes = await fetch(`${BASE_URL}/api/dev/test-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: bookingData.bookingId })
    });
    
    if (!webhookRes.ok) {
      const errorData = await webhookRes.json();
      throw new Error(`Webhook simulation failed: ${errorData.error || errorData.message}`);
    }
    
    const webhookData = await webhookRes.json();
    console.log('✅ Webhook simulated successfully!');
    console.log('   Booking status:', webhookData.booking?.status);
    console.log('   Meeting URL:', webhookData.booking?.meeting_url ? 'Generated' : 'Not set');
    console.log('');

    // ============================================
    // ✅ SUCCESS SUMMARY
    // ============================================
    console.log('🎉 SUCCESS! Full flow completed:');
    console.log('   ✅ Database seeded');
    console.log('   ✅ Client authenticated');
    console.log('   ✅ Slot selected');
    console.log('   ✅ Booking created:', bookingData.bookingId);
    console.log('   ✅ Payment confirmed');
    console.log('   ✅ Booking status:', webhookData.booking?.status);
    console.log('');
    console.log('📋 Summary:');
    console.log('   - Booking ID:', bookingData.bookingId);
    console.log('   - Status:', webhookData.booking?.status);
    console.log('   - Amount: R', webhookData.booking?.amount);
    console.log('   - Meeting URL:', webhookData.booking?.meeting_url || 'Not generated');
    
    return {
      success: true,
      bookingId: bookingData.bookingId,
      booking: webhookData.booking
    };
    
  } catch (err) {
    console.error('❌ Error during automated flow:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
})();
