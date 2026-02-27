import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/admin/counselors?email=...
 * Returns all counselors. Caller must be a registered counselor (email in query).
 * Optionally restrict to admin group later via token check.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const { data: counselor } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .or(`email.eq.${normalized},ms_graph_user_email.eq.${email.trim()}`)
      .maybeSingle();

    if (!counselor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: counselors, error } = await supabaseAdmin
      .from('counselors')
      .select('id, display_name, email, ms_graph_user_email, created_at')
      .order('display_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ counselors: counselors ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
