import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BUCKET = 'client-avatars';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/client/profile/avatar
 * FormData: file (image)
 * Header: Authorization: Bearer <supabase_access_token>
 * Uploads image to Storage, updates users_profile.avatar_url, returns { avatar_url }.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
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

    await supabaseAdmin.storage.createBucket(BUCKET, { public: true }).then(() => {});
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Client avatar upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message || 'Upload failed' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const avatarUrl = urlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from('users_profile')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

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
