import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing counselor id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('counselors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);

      return NextResponse.json(
        { error: 'Counselor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('API error:', err);

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
