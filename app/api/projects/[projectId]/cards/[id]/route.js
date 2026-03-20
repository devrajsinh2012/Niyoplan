import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function GET(request, { params }) {
  const { projectId, id } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .select(`
        *,
        assignee:profiles!cards_assignee_id_fkey(full_name, avatar_url),
        reporter:profiles!cards_reporter_id_fkey(full_name, avatar_url)
      `)
      .eq('id', id)
      .eq('project_id', projectId)
      .single();

    if (cardError) {
      if (cardError.code === 'PGRST116') return NextResponse.json({ error: 'Card not found' }, { status: 404 });
      throw cardError;
    }
    return NextResponse.json(card);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { projectId, id } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, issue_type, priority, status, assignee_id, story_points, list_id, sprint_id, rank, start_date, due_date, is_archived } = body;

    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .update({
        title,
        description,
        issue_type,
        priority,
        status,
        assignee_id,
        story_points,
        list_id: list_id !== undefined ? list_id : undefined,
        sprint_id: sprint_id !== undefined ? sprint_id : undefined,
        rank: rank !== undefined ? rank : undefined,
        start_date: start_date !== undefined ? start_date : undefined,
        due_date: due_date !== undefined ? due_date : undefined,
        is_archived: is_archived !== undefined ? is_archived : undefined,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (cardError) throw cardError;

    // Log the update
    await supabaseAdmin.from('activity_log').insert({
      card_id: card.id,
      user_id: user.id,
      action: 'updated',
      details: { fields: body }
    });

    return NextResponse.json(card);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { projectId, id } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
  }

  try {
    const { error: deleteError } = await supabaseAdmin
      .from('cards')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (deleteError) throw deleteError;
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
