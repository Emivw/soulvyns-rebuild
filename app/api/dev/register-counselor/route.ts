import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Development-only: register an existing admin (or any) email as a counselor.
 * Use this so your Microsoft account (e.g. Admin@soulvyns.co.za) can sign in as a counselor.
 *
 * POST /api/dev/register-counselor
 * Body: { "email": "Admin@soulvyns.co.za", "displayName": "Admin" }
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = (body?.email ?? '').trim();
    const email = emailRaw.toLowerCase();
    const displayName = (body?.displayName ?? body?.display_name ?? emailRaw.split('@')[0] || 'Counselor').trim();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    let authUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email);

    if (!authUser) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: displayName, role: 'counselor' },
      });
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }
      authUser = created.user;
    }

    const userId = authUser.id;

    const { data: existingProfile } = await supabaseAdmin
      .from('users_profile')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabaseAdmin.from('users_profile').upsert(
        {
          id: userId,
          email,
          full_name: displayName,
          role: 'counselor',
        },
        { onConflict: 'id' }
      );
    }

    const { data: byEmail } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('email', emailRaw)
      .maybeSingle();
    const { data: byMsGraph } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('ms_graph_user_email', emailRaw)
      .maybeSingle();
    const existingCounselor = byEmail ?? byMsGraph;

    if (existingCounselor) {
      return NextResponse.json({
        success: true,
        message: 'Already registered as counselor',
        counselor: { id: existingCounselor.id, email: emailRaw, displayName },
      });
    }

    const { data: counselor, error: counselorErr } = await supabaseAdmin
      .from('counselors')
      .insert({
        user_id: userId,
        email: emailRaw,
        display_name: displayName,
        ms_graph_user_email: emailRaw,
      })
      .select('id, email, display_name')
      .single();

    if (counselorErr) {
      return NextResponse.json({ error: counselorErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registered as counselor. You can now sign in with Microsoft.',
      counselor: { id: counselor.id, email: counselor.email, display_name: counselor.display_name },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
