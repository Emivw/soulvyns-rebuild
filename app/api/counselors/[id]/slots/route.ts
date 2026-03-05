import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/counselors/[id]/slots?weeks=4
 * Returns recurring availability windows and already-booked slots for the next N weeks.
 * Used to render the booking grid and disable taken slots.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: counselorId } = params;
    if (!counselorId) {
      return NextResponse.json({ error: 'Counselor ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const weeks = Math.min(8, Math.max(1, parseInt(searchParams.get('weeks') ?? '4', 10) || 4));

    const { data: counselor } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('id', counselorId)
      .maybeSingle();

    if (!counselor) {
      return NextResponse.json({ error: 'Counselor not found' }, { status: 404 });
    }

    const { data: availabilityRows, error: availError } = await supabaseAdmin
      .from('counselor_availability')
      .select('day_of_week, start_time, end_time')
      .eq('counselor_id', counselorId)
      .order('day_of_week')
      .order('start_time');

    if (availError) {
      console.warn('[counselors/slots] counselor_availability query failed:', availError.message);
    }

    const availability = (availabilityRows ?? []).map((row) => ({
      day_of_week: row.day_of_week,
      start_time: String(row.start_time).slice(0, 5),
      end_time: String(row.end_time).slice(0, 5),
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + weeks * 7);

    let booked: { session_date: string; start_time: string; end_time: string }[] = [];
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('session_date, start_time, end_time')
      .eq('counselor_id', counselorId)
      .gte('session_date', today.toISOString().slice(0, 10))
      .lte('session_date', endDate.toISOString().slice(0, 10))
      .in('status', ['pending', 'confirmed'])
      .in('payment_status', ['pending', 'paid']);

    if (sessionsError) {
      console.warn('[counselors/slots] sessions query failed (table may not exist):', sessionsError.message);
    } else {
      booked = (sessions ?? []).map((row) => ({
        session_date: row.session_date,
        start_time: String(row.start_time).slice(0, 5),
        end_time: String(row.end_time).slice(0, 5),
      }));
    }

    return NextResponse.json({ availability, booked });
  } catch (e) {
    console.error('[counselors/slots]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
