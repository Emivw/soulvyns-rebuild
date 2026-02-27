import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generatePayFastSignature } from '@/lib/payfast';

/**
 * Development route to simulate PayFast webhook for testing
 * WARNING: Only use in development environment
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test webhook is disabled in production' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const bookingId = body?.bookingId;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId required' },
        { status: 400 }
      );
    }

    console.log(`🧪 [TEST WEBHOOK] Simulating PayFast webhook for booking: ${bookingId}`);

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(
        '*, counselors!inner(ms_graph_user_email, display_name), users_profile!inner(email, full_name)'
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ [TEST WEBHOOK] Booking not found:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Create simulated PayFast webhook data
    const webhookData: Record<string, string> = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID || '',
      merchant_key: process.env.PAYFAST_MERCHANT_KEY || '',
      m_payment_id: bookingId,
      pf_payment_id: `TEST-${Date.now()}`,
      payment_status: 'COMPLETE',
      item_name: `Counseling Session - Booking ${bookingId}`,
      amount_gross: parseFloat(booking.amount).toFixed(2),
      amount_fee: '0.00',
      amount_net: parseFloat(booking.amount).toFixed(2),
    };

    // Generate signature (canonical function uses PAYFAST_PASSPHRASE from env)
    const signature = generatePayFastSignature(webhookData);
    webhookData.signature = signature;

    // Call the actual webhook handler
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/payfast/notify`;

    console.log(`📤 [TEST WEBHOOK] Sending webhook to: ${webhookUrl}`);

    const formData = new FormData();
    Object.keys(webhookData).forEach((key) => {
      formData.append(key, webhookData[key]);
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ [TEST WEBHOOK] Webhook failed:', responseText);
      return NextResponse.json(
        {
          error: 'Webhook simulation failed',
          status: response.status,
          message: responseText,
        },
        { status: response.status }
      );
    }

    console.log('✅ [TEST WEBHOOK] Webhook simulation successful');

    // Get updated booking
    const { data: updatedBooking } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Webhook simulated successfully',
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error('❌ [TEST WEBHOOK] Error:', error);
    return NextResponse.json(
      {
        error: 'Test webhook failed',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
