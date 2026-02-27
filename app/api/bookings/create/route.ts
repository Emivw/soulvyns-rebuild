import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createPayFastPaymentUrl, createPayFastPaymentData } from '@/lib/payfast';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('📝 [BOOKING CREATE] Request received');

  try {
    // PayFast required (createPayFastPaymentUrl will throw if any missing)
    if (
      !process.env.PAYFAST_MERCHANT_ID ||
      !process.env.PAYFAST_MERCHANT_KEY ||
      !process.env.PAYFAST_PASSPHRASE
    ) {
      console.error('❌ [BOOKING CREATE] Missing PayFast env (MERCHANT_ID, MERCHANT_KEY, PASSPHRASE)');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.warn('⚠️ [BOOKING CREATE] No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔐 [BOOKING CREATE] Verifying user token...');
    
    // Verify user token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [BOOKING CREATE] Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ [BOOKING CREATE] Authenticated user: ${user.email} (${user.id})`);

    const body = await request.json().catch(() => ({}));
    const { counselorId, slotId, amount, consentAccepted } = body || {};

    console.log('📋 [BOOKING CREATE] Request body:', { counselorId, slotId, amount, consentAccepted });

    if (!counselorId || !slotId || !amount) {
      console.warn('⚠️ [BOOKING CREATE] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (consentAccepted !== true) {
      console.warn('⚠️ [BOOKING CREATE] Client consent not accepted');
      return NextResponse.json(
        { error: 'You must accept the Client Informed Consent & Platform Agreement to book a session.' },
        { status: 400 }
      );
    }

    // Verify counselor exists (each booking must have a valid counselor)
    const { data: counselor, error: counselorError } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('id', counselorId)
      .single();

    if (counselorError || !counselor) {
      console.error('❌ [BOOKING CREATE] Counselor not found:', counselorError?.message);
      return NextResponse.json(
        { error: 'Counselor not found' },
        { status: 404 }
      );
    }

    // Verify slot exists, is available, and belongs to this counselor
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('availability_slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      console.error('❌ [BOOKING CREATE] Slot not found:', slotError?.message);
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      );
    }

    if (slot.counselor_id !== counselorId) {
      console.warn('⚠️ [BOOKING CREATE] Slot does not belong to the selected counselor');
      return NextResponse.json(
        { error: 'This time slot does not belong to the selected counselor.' },
        { status: 400 }
      );
    }

    if (slot.is_booked) {
      console.warn('⚠️ [BOOKING CREATE] Slot already booked');
      return NextResponse.json(
        { error: 'Slot is no longer available' },
        { status: 400 }
      );
    }

    // Normalize amount to 2 decimals so it matches PayFast (e.g. 500 -> 500.00)
    const amountNormalized = parseFloat(Number(amount).toFixed(2));

    console.log('💾 [BOOKING CREATE] Creating booking record...');
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        client_id: user.id,
        counselor_id: counselorId,
        slot_id: slotId,
        status: 'pending_payment',
        amount: amountNormalized,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('❌ [BOOKING CREATE] Booking creation error:', bookingError);
      return NextResponse.json(
        { error: bookingError.message },
        { status: 400 }
      );
    }

    console.log(`✅ [BOOKING CREATE] Booking created: ${booking.id}`);

    // Record client consent for this booking
    const clientEmailForConsent = (await supabaseAdmin.from('users_profile').select('email').eq('id', user.id).single()).data?.email || user.email || '';
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const ipAddress = ipHeader ? ipHeader.split(',')[0].trim() : null;
    const { error: consentError } = await supabaseAdmin.from('client_consents').insert({
      client_email: clientEmailForConsent,
      psychologist_id: counselorId,
      booking_id: booking.id,
      accepted_at: new Date().toISOString(),
      version: '1.0',
      ...(ipAddress && { ip_address: ipAddress }),
    });
    if (consentError) {
      console.error('❌ [BOOKING CREATE] Failed to record consent:', consentError);
      // Don't fail the booking; consent record is audit-only
    } else {
      console.log('✅ [BOOKING CREATE] Client consent recorded');
    }

    // Mark slot as booked
    console.log('🔒 [BOOKING CREATE] Marking slot as booked...');
    const { error: slotUpdateError } = await supabaseAdmin
      .from('availability_slots')
      .update({ is_booked: true })
      .eq('id', slotId);

    if (slotUpdateError) {
      console.error('❌ [BOOKING CREATE] Failed to update slot:', slotUpdateError);
      // Don't fail the request, but log the error
    }

    // Get user profile for PayFast
    console.log('👤 [BOOKING CREATE] Fetching user profile...');
    const { data: profile } = await supabaseAdmin
      .from('users_profile')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Parse client name into first and last name
    const clientName = profile?.full_name || '';
    const nameParts = clientName.trim().split(/\s+/);
    const clientFirstName = nameParts[0] || '';
    const clientLastName = nameParts.slice(1).join(' ') || '';
    const clientEmail = profile?.email || user.email || '';

    // Create PayFast payment data with signature (for direct form submission)
    console.log('💳 [BOOKING CREATE] Generating PayFast payment data...');
    const paymentData = await createPayFastPaymentData({
      bookingId: booking.id,
      amount: amountNormalized,
      clientEmail,
      clientName,
    });

    // Also create payment URL for backward compatibility
    const paymentUrl = await createPayFastPaymentUrl({
      bookingId: booking.id,
      amount: amountNormalized,
      clientEmail,
      clientName,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [BOOKING CREATE] Success! Booking ${booking.id} created in ${duration}ms`);

    // Return comprehensive booking data for frontend form submission.
    // PayFast must be submitted via POST form only—do NOT use paymentUrl with window.location (GET/query params would be wrong).
    return NextResponse.json({
      bookingId: booking.id,
      paymentUrl, // Deprecated: do not redirect to this URL; use POST form with signature/bookingData instead.
      signature: paymentData.signature, // Signature for direct form submission
      // Complete booking data matching the user's snippet structure
      bookingData: {
        bookingId: booking.id,
        amount: amountNormalized.toFixed(2), // String with 2 decimals
        signature: paymentData.signature,
        clientEmail,
        clientFirstName,
        clientLastName,
        counselorId,
        slotId,
      },
      // Full PayFast payment data (includes merchant credentials - server-side only)
      payfastData: paymentData,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [BOOKING CREATE] Error after ${duration}ms:`, error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
