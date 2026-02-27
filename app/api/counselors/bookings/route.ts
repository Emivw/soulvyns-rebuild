import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  console.log('📋 [COUNSELOR BOOKINGS] Request received');

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      console.warn('⚠️ [COUNSELOR BOOKINGS] Email missing');
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    console.log(`🔍 [COUNSELOR BOOKINGS] Fetching bookings for: ${email}`);

    // Look up counselor by email or ms_graph_user_email (MSAL login may use either)
    const { data: byEmail } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    const counselorRow = byEmail ?? (await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('ms_graph_user_email', email)
      .maybeSingle()).data;

    const counselorId = counselorRow?.id;

    if (!counselorId) {
      console.warn(`⚠️ [COUNSELOR BOOKINGS] Counselor not found for: ${email}`);
      return NextResponse.json(
        { bookings: [], counselorNotFound: true },
        { status: 200 }
      );
    }

    console.log(`✅ [COUNSELOR BOOKINGS] Counselor found: ${counselorId}`);

    // Get bookings for this counselor
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        users_profile!inner(full_name, email),
        availability_slots!inner(start_time, end_time)
      `)
      .eq('counselor_id', counselorId)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('❌ [COUNSELOR BOOKINGS] Error loading bookings:', bookingsError);
      return NextResponse.json(
        { error: bookingsError.message },
        { status: 500 }
      );
    }

    console.log(`✅ [COUNSELOR BOOKINGS] Found ${bookings?.length || 0} bookings`);
    return NextResponse.json({ bookings: bookings || [] });
  } catch (error: any) {
    console.error('❌ [COUNSELOR BOOKINGS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
