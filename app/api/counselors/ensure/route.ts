import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const GRAPH_MEMBER_OF = 'https://graph.microsoft.com/v1.0/me/memberOf';

/**
 * Verifies the user is in Soulvyns Counselors or Soulvyns Admin (via Graph), then ensures a counselor record exists.
 * Called after Microsoft login with the user's access token.
 *
 * POST /api/counselors/ensure
 * Authorization: Bearer <access_token>
 * Body: { "email": "user@domain.com", "displayName": "Display Name" }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const emailRaw = (body?.email ?? '').trim();
    const displayName = (body?.displayName ?? body?.display_name ?? (emailRaw.split('@')[0] || 'Counselor')).trim();
    const email = emailRaw.toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const counselorsGroupId = process.env.SOULVYNS_COUNSELORS_GROUP_ID?.trim();
    const adminGroupId = process.env.SOULVYNS_ADMIN_GROUP_ID?.trim();
    const allowedGroupIds = [counselorsGroupId, adminGroupId].filter(Boolean);

    if (allowedGroupIds.length > 0) {
      const graphRes = await fetch(GRAPH_MEMBER_OF, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!graphRes.ok) {
        const errText = await graphRes.text();
        console.error('[COUNSELORS ENSURE] Graph memberOf failed:', graphRes.status, errText);
        return NextResponse.json(
          { error: 'Could not verify group membership. Ensure the app has User.Read and the token is valid.' },
          { status: 403 }
        );
      }
      const graphData = (await graphRes.json()) as { value?: { id: string }[] };
      const userGroupIds = (graphData.value ?? []).map((g) => g.id);
      const isInAllowedGroup = allowedGroupIds.some((id) => userGroupIds.includes(id!));
      if (!isInAllowedGroup) {
        return NextResponse.json(
          { error: 'You must be a member of Soulvyns Counselors or Soulvyns Admin to sign in as a counselor.' },
          { status: 403 }
        );
      }
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
        { id: userId, email, full_name: displayName, role: 'counselor' },
        { onConflict: 'id' }
      );
    }

    const { data: byEmail } = await supabaseAdmin
      .from('counselors')
      .select('id, email, display_name')
      .eq('email', emailRaw)
      .maybeSingle();
    const { data: byMsGraph } = await supabaseAdmin
      .from('counselors')
      .select('id, email, display_name')
      .eq('ms_graph_user_email', emailRaw)
      .maybeSingle();
    const existingCounselor = byEmail ?? byMsGraph;

    if (existingCounselor) {
      return NextResponse.json({
        success: true,
        counselor: {
          id: existingCounselor.id,
          email: existingCounselor.email,
          display_name: existingCounselor.display_name,
        },
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
      counselor: {
        id: counselor.id,
        email: counselor.email,
        display_name: counselor.display_name,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
