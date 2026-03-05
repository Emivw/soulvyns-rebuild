import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

const SESSIONS_SETUP_MESSAGE =
  'Booking is not set up yet. Run sql/sessions_table.sql in Supabase SQL Editor.';

function isSessionsTableMissing(error: { message?: string } | null): boolean {
  const msg = error?.message ?? '';
  return msg.includes('sessions') && (msg.includes('does not exist') || msg.includes('relation'));
}

/**
 * GET /api/sessions/[id]
 * Returns session with counselor details. RLS: only client or counselor can read.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const supabaseUser = createSupabaseServerClient(token);
    const { data: session, error: sessionError } = await supabaseUser
      .from('sessions')
      .select('id, client_id, counselor_id, session_date, start_time, end_time, status, payment_status, created_at')
      .eq('id', id)
      .maybeSingle();

    if (isSessionsTableMissing(sessionError)) {
      return NextResponse.json({ error: SESSIONS_SETUP_MESSAGE }, { status: 503 });
    }
    if (sessionError) {
      const msg = sessionError.message ?? 'Failed to load session';
      const isPermission = /policy|permission|row level security|RLS/i.test(msg);
      return NextResponse.json(
        { error: isPermission ? 'You do not have permission to view this session.' : msg },
        { status: isPermission ? 403 : 500 }
      );
    }
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: counselor } = await supabaseAdmin
      .from('counselors')
      .select('id, display_name, avatar_url')
      .eq('id', session.counselor_id)
      .single();

    return NextResponse.json({
      session: {
        id: session.id,
        session_date: session.session_date,
        start_time: String(session.start_time).slice(0, 5),
        end_time: String(session.end_time).slice(0, 5),
        status: session.status,
        payment_status: session.payment_status,
        created_at: session.created_at,
      },
      counselor: counselor
        ? {
            id: counselor.id,
            display_name: counselor.display_name,
            avatar_url: counselor.avatar_url ?? undefined,
          }
        : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[id]
 * Mock payment: set payment_status = 'paid', status = 'confirmed'.
 * RLS: client or counselor can update (client for payment; counselor for status).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const supabaseUser = createSupabaseServerClient(token);
    const { data: session, error: fetchError } = await supabaseUser
      .from('sessions')
      .select('id, client_id, status, payment_status')
      .eq('id', id)
      .maybeSingle();

    if (isSessionsTableMissing(fetchError)) {
      return NextResponse.json({ error: SESSIONS_SETUP_MESSAGE }, { status: 503 });
    }
    if (fetchError) {
      const msg = fetchError.message ?? 'Failed to load session';
      const isPermission = /policy|permission|row level security|RLS/i.test(msg);
      return NextResponse.json(
        { error: isPermission ? 'You do not have permission to update this session.' : msg },
        { status: isPermission ? 403 : 500 }
      );
    }
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.payment_status === 'paid') {
      return NextResponse.json({ error: 'Session already paid' }, { status: 400 });
    }

    const { error: updateError } = await supabaseUser
      .from('sessions')
      .update({ payment_status: 'paid', status: 'confirmed' })
      .eq('id', id);

    if (isSessionsTableMissing(updateError)) {
      return NextResponse.json({ error: SESSIONS_SETUP_MESSAGE }, { status: 503 });
    }
    if (updateError) {
      const msg = updateError.message ?? 'Update failed';
      const isPermission = /policy|permission|row level security|RLS/i.test(msg);
      return NextResponse.json(
        { error: isPermission ? 'You do not have permission to update this session.' : msg },
        { status: isPermission ? 403 : 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
