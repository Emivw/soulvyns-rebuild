import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * API route to get available slots
 * Returns all slots that are not booked
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📅 [AVAILABILITY API] Fetching available slots...');

    const { data: slots, error } = await supabaseAdmin
      .from('availability_slots')
      .select('*')
      .eq('is_booked', false)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('❌ [AVAILABILITY API] Error fetching slots:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ [AVAILABILITY API] Found ${slots?.length || 0} available slots`);
    return NextResponse.json(slots || []);
  } catch (error: any) {
    console.error('❌ [AVAILABILITY API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
