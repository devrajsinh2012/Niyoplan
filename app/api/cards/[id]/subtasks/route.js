import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { verifyProjectAccess } from '@/lib/access';
export async function GET(request, { params }) {
  const { id } = await params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify project access before fetching subtasks
    const { data: card } = await supabaseAdmin
      .from('cards')
      .select('project_id')
      .eq('id', id)
      .single();
      
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    const access = await verifyProjectAccess(card.project_id, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    const { data: subtasks, error } = await supabaseAdmin
      .from('card_subtasks')
      .select('*, assignee:profiles!card_subtasks_assignee_id_fkey(id, full_name, avatar_url)')
      .eq('card_id', id)
      .order('rank', { ascending: true });

    if (error) throw error;
    return NextResponse.json(subtasks || []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify project access before creating subtask
    const { data: card } = await supabaseAdmin
      .from('cards')
      .select('project_id')
      .eq('id', id)
      .single();
      
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    const access = await verifyProjectAccess(card.project_id, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    const { title, description = '', assignee_id = null, due_date = null } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Subtask title required' }, { status: 400 });
    }

    const { data: subtask, error } = await supabaseAdmin
      .from('card_subtasks')
      .insert([
        {
          card_id: id,
          title: title.trim(),
          description,
          assignee_id,
          due_date,
          rank: Date.now() / 1000
        }
      ])
      .select('*, assignee:profiles!card_subtasks_assignee_id_fkey(id, full_name, avatar_url)')
      .single();

    if (error) throw error;
    return NextResponse.json(subtask);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}
