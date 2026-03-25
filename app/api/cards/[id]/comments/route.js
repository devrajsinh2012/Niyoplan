import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const { data: comments, error } = await supabaseAdmin
      .from('card_comments')
      .select('*, user:profiles!card_comments_user_id_fkey(id, full_name, avatar_url)')
      .eq('card_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(comments || []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content required' }, { status: 400 });
    }

    const { data: comment, error } = await supabaseAdmin
      .from('card_comments')
      .insert([
        {
          card_id: id,
          user_id: user.id,
          content: content.trim()
        }
      ])
      .select('*, user:profiles!card_comments_user_id_fkey(id, full_name, avatar_url)')
      .single();

    if (error) throw error;
    return NextResponse.json(comment);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
