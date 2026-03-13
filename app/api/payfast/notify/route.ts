import { NextRequest } from 'next/server';
import { verifyPayFastSignature } from '@/lib/payfast';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createTeamsMeetingWithInvites } from '@/lib/teams';
import { sendBookingConfirmation } from '@/lib/email';
import {
  BookingStatus,
  assertValidStatusTransition,
} from '@/lib/bookingLifecycle';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔔 [PAYFAST NOTIFY] PAYFAST webhook received');

  try {
    // Validate required environment variables
    if (!process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY) {
      console.error('❌ [PAYFAST NOTIFY] Missing PayFast environment variables');
      return new Response('Server configuration error', { status: 500 });
    }

    const formData = await req.formData();
    const data: Record<string, string> = {};

    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    console.log('📦 [PAYFAST NOTIFY] Received data:', {
      merchant_id: data.merchant_id,
      payment_status: data.payment_status,
      m_payment_id: data.m_payment_id,
      amount_gross: data.amount_gross,
    });

    const receivedSignature = data.signature;
    if (!receivedSignature) {
      console.warn('⚠️ [PAYFAST NOTIFY] Missing signature');
      return new Response('Missing signature', { status: 400 });
    }

    // Verify merchant ID matches
    if (data.merchant_id !== process.env.PAYFAST_MERCHANT_ID) {
      console.error('❌ [PAYFAST NOTIFY] Merchant ID mismatch', {
        received: data.merchant_id,
        expected: process.env.PAYFAST_MERCHANT_ID,
      });
      return new Response('Merchant mismatch', { status: 400 });
    }

    console.log('✅ [PAYFAST NOTIFY] Merchant ID verified');

    // Remove signature for regeneration
    const signatureToVerify = data.signature;
    delete data.signature;

    // Verify signature (canonical function uses PAYFAST_PASSPHRASE from env)
    console.log('🔐 [PAYFAST NOTIFY] Verifying signature...');
    const isValid = verifyPayFastSignature(data, signatureToVerify);

    if (!isValid) {
      console.error('❌ [PAYFAST NOTIFY] Signature verification failed', {
        receivedSignature: signatureToVerify,
      });
      return new Response('Invalid signature', { status: 400 });
    }

    console.log('✅ [PAYFAST NOTIFY] Signature verified – PAYMENT verified');

    const bookingId = data.m_payment_id;
    const paymentStatus = data.payment_status;

    if (!bookingId) {
      console.warn('⚠️ [PAYFAST NOTIFY] Missing booking ID');
      return new Response('Missing booking ID', { status: 400 });
    }

    console.log(`📋 [PAYFAST NOTIFY] Processing payment for booking: ${bookingId}, status: ${paymentStatus}`);

    // Get booking to verify amount
      console.log('💾 [PAYFAST NOTIFY] Fetching booking from database...');
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(
        '*, counselors!inner(ms_graph_user_email, display_name, email), users_profile!inner(email, full_name)'
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ [PAYFAST NOTIFY] Booking not found:', bookingError?.message);
      return new Response('Booking not found', { status: 404 });
    }

    console.log(`✅ [PAYFAST NOTIFY] Booking found: ${booking.id}, current status: ${booking.status}`);

    // Verify amount matches
    const expectedAmount = parseFloat(booking.amount).toFixed(2);
    const receivedAmount = parseFloat(data.amount_gross || '0').toFixed(2);

    console.log('💰 [PAYFAST NOTIFY] Amount verification:', {
      expected: expectedAmount,
      received: receivedAmount,
    });

    if (expectedAmount !== receivedAmount) {
      console.error('❌ [PAYFAST NOTIFY] Amount mismatch', {
        expectedAmount,
        receivedAmount,
      });
      return new Response('Amount mismatch', { status: 400 });
    }

    console.log('✅ [PAYFAST NOTIFY] Amount verified');

    // Only confirm on COMPLETE
    if (paymentStatus === 'COMPLETE') {
      console.log('✅ [PAYFAST NOTIFY] Payment completed, updating booking status...');
      try {
        // Enforce valid status transition (e.g. pending_payment -> paid).
        assertValidStatusTransition(booking.status as BookingStatus, 'paid');
      } catch (transitionError: any) {
        console.error('❌ [PAYFAST NOTIFY] Invalid status transition to paid:', {
          currentStatus: booking.status,
          error: transitionError?.message,
        });
        return new Response('Invalid booking status for payment completion', { status: 400 });
      }

      // Update booking to paid so it shows correctly on My Bookings and Teams link becomes available
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'paid',
          payment_status: 'paid',
          payfast_payment_id: data.pf_payment_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('❌ [PAYFAST NOTIFY] Database update error:', updateError);
        return new Response('Database update failed', { status: 500 });
      }

      console.log(`✅ [PAYFAST NOTIFY] BOOKING marked paid: ${bookingId}`);

      // Post-payment: 1) consent record, 2) Teams meeting, 3) confirmation emails to client + counselor

      // Create consent record in client_consents (auto-generated after payment)
      const consentVersion = '1.0';
      const { error: consentError } = await supabaseAdmin.from('client_consents').insert({
        client_email: booking.users_profile?.email ?? data.email_address ?? '',
        psychologist_id: booking.counselor_id,
        booking_id: bookingId,
        accepted_at: new Date().toISOString(),
        version: consentVersion,
        ip_address: null,
      });

      if (consentError) {
        console.error('⚠️ [PAYFAST NOTIFY] Consent record creation failed (non-fatal):', consentError);
      } else {
        console.log(`✅ [PAYFAST NOTIFY] Consent record created for booking ${bookingId}`);
      }

      // Fetch slot once for Teams and confirmation email
      console.log('📅 [PAYFAST NOTIFY] Fetching slot details...');
      const { data: slot, error: slotError } = await supabaseAdmin
        .from('availability_slots')
        .select('start_time, end_time')
        .eq('id', booking.slot_id)
        .single();

      let meetingJoinUrl: string | null = null;

      if (slotError || !slot) {
        console.error('⚠️ [PAYFAST NOTIFY] Slot not found (skipping Teams/email details):', slotError?.message);
      } else if (!process.env.GRAPH_TENANT_ID || !process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET) {
        console.warn('⚠️ [PAYFAST NOTIFY] Microsoft Graph env not set (GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET) – skipping Teams meeting');
      } else {
        // Create Teams meeting as calendar event so counselor + client get Outlook/Teams invites
        const organizerEmail = 'admin@soulvyns.co.za';
        const counselorEmail =
          booking.counselors?.ms_graph_user_email ?? booking.counselors?.email ?? '';
        const clientEmail = booking.users_profile?.email ?? '';

        try {
          console.log('👥 [PAYFAST NOTIFY] CREATING TEAMS MEETING (with invites)…', {
            organizer: organizerEmail,
            counselor: counselorEmail,
            client: clientEmail,
            startTime: slot.start_time,
            endTime: slot.end_time,
          });

          const joinUrl = await createTeamsMeetingWithInvites({
            organizerEmail,
            subject: 'Soulvyns Counseling Session',
            startTime: slot.start_time,
            endTime: slot.end_time,
            attendeeEmails: [counselorEmail, clientEmail].filter(Boolean),
            attendeeNames: [
              booking.counselors?.display_name ?? null,
              booking.users_profile?.full_name ?? null,
            ],
          });

          console.log('✅ [PAYFAST NOTIFY] TEAMS meeting created. Join URL:', joinUrl);
          meetingJoinUrl = joinUrl || null;
        } catch (meetingError: any) {
          console.error('❌ [PAYFAST NOTIFY] Failed to create Teams meeting:', meetingError);
        }

        if (meetingJoinUrl) {
          const { error: meetingUpdateError } = await supabaseAdmin
            .from('bookings')
            .update({ meeting_url: meetingJoinUrl, updated_at: new Date().toISOString() })
            .eq('id', bookingId);

          if (meetingUpdateError) {
            console.error('⚠️ [PAYFAST NOTIFY] Failed to save meeting URL to booking:', meetingUpdateError);
          } else {
            console.log(`✅ [PAYFAST NOTIFY] MEETING URL saved to booking ${bookingId}`);
          }
        }
      }

      // Send confirmation emails to both client and counselor (booking details + Teams link)
      try {
        await sendBookingConfirmation(booking, slot ?? null, meetingJoinUrl);
      } catch (emailErr: any) {
        console.error('⚠️ [PAYFAST NOTIFY] Confirmation email failed (non-fatal):', emailErr?.message);
      }
    } else {
      console.log(`ℹ️ [PAYFAST NOTIFY] Payment status is ${paymentStatus}, not processing`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [PAYFAST NOTIFY] Webhook processed successfully in ${duration}ms`);

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [PAYFAST NOTIFY] Error after ${duration}ms:`, err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
    });
    return new Response('Server error', { status: 500 });
  }
}
