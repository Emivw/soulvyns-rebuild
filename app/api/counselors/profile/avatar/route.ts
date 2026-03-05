import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BUCKET = 'counselor-avatars';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/counselors/profile/avatar
 * FormData: file (image), email (counselor email)
 * Uploads image to Storage, updates counselor.avatar_url, returns { avatar_url }.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const email = formData.get('email') as string | null;

    if (!file || !email?.trim()) {
      return NextResponse.json(
        { error: 'Missing file or email' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const type = file.type?.toLowerCase();
    if (!type || !ALLOWED_TYPES.some((t) => type === t || type.startsWith('image/'))) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' },
        { status: 400 }
      );
    }

    const { data: counselor, error: findError } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('ms_graph_user_email', email.trim())
      .maybeSingle();

    if (findError || !counselor) {
      return NextResponse.json(
        { error: 'Counselor not found for this email' },
        { status: 404 }
      );
    }

    await supabaseAdmin.storage.createBucket(BUCKET, { public: true }).then(() => {});
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${counselor.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message || 'Upload failed' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const avatarUrl = urlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from('counselors')
      .update({ avatar_url: avatarUrl })
      .eq('id', counselor.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to save profile picture' },
        { status: 500 }
      );
    }

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
