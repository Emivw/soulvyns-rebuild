import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  console.log('🔍 [COUNSELOR VERIFY] Request received');

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!email) {
      console.warn('⚠️ [COUNSELOR VERIFY] Email missing');
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    console.log(`🔍 [COUNSELOR VERIFY] Verifying counselor: ${email}`);

    const { data: byEmail } = await supabaseAdmin
      .from('counselors')
      .select('id, email, display_name')
      .eq('email', email)
      .maybeSingle();

    const counselor = byEmail ?? (await supabaseAdmin
      .from('counselors')
      .select('id, email, display_name')
      .eq('ms_graph_user_email', email)
      .maybeSingle()).data;

    if (!counselor) {
      console.warn(`⚠️ [COUNSELOR VERIFY] Counselor not found for: ${email}`);
      return NextResponse.json(
        { error: 'Counselor not found' },
        { status: 404 }
      );
    }

    const data = counselor;

    console.log(`✅ [COUNSELOR VERIFY] Counselor verified: ${data.display_name} (${data.id})`);
    return NextResponse.json({ success: true, counselor: data });
  } catch (error: any) {
    console.error('❌ [COUNSELOR VERIFY] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
