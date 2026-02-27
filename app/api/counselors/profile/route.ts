import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/counselors/profile?email=...
 * Returns counselor profile (bio, accolades, specializations).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('counselors')
      .select('id, display_name, email, bio, accolades, specializations')
      .or(`email.eq.${email.trim()},ms_graph_user_email.eq.${email.trim()}`)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Counselor not found' }, { status: 404 });
    return NextResponse.json({ counselor: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/counselors/profile
 * Body: { email, bio?, accolades?, specializations? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body?.email;
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};
    if (typeof body.bio === 'string') updates.bio = body.bio;
    if (typeof body.accolades === 'string') updates.accolades = body.accolades;
    if (Array.isArray(body.specializations)) updates.specializations = body.specializations;

    const { data, error } = await supabaseAdmin
      .from('counselors')
      .update(updates)
      .or(`email.eq.${email.trim()},ms_graph_user_email.eq.${email.trim()}`)
      .select('id, display_name, bio, accolades, specializations')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ counselor: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
