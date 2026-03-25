import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';
import { createProjectMajorNotifications } from '@/lib/projectNotifications';

const MAJOR_UPDATE_FIELDS = [
  'title',
  'status',
  'priority',
  'assignee_id',
  'sprint_id',
  'list_id',
  'start_date',
  'due_date',
  'is_archived',
];

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
        assignee:profiles!cards_assignee_id_fkey(id, full_name, avatar_url),
        reporter:profiles!cards_reporter_id_fkey(id, full_name, avatar_url)
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

    const { data: beforeCard } = await supabaseAdmin
      .from('cards')
      .select('id, title, custom_id, status, priority, assignee_id, sprint_id, list_id, start_date, due_date, is_archived')
      .eq('id', id)
      .eq('project_id', projectId)
      .single();

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
      .select(`
        *,
        assignee:profiles!cards_assignee_id_fkey(id, full_name, avatar_url),
        reporter:profiles!cards_reporter_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (cardError) throw cardError;

    // Log the update
    await supabaseAdmin.from('activity_log').insert({
      card_id: card.id,
      user_id: user.id,
      action: 'updated',
      details: { fields: body }
    });

    const changedMajorFields = MAJOR_UPDATE_FIELDS.filter((field) => {
      const previousValue = beforeCard?.[field] ?? null;
      const nextValue = card?.[field] ?? null;
      return JSON.stringify(previousValue) !== JSON.stringify(nextValue);
    });

    if (changedMajorFields.length > 0) {
      await createProjectMajorNotifications({
        projectId,
        actorId: user.id,
        type: 'card_updated',
        title: 'Card updated',
        message: `updated ${card.custom_id || card.title}`,
        metadata: {
          card_id: card.id,
          card_title: card.title,
          card_custom_id: card.custom_id || null,
          changed_fields: changedMajorFields,
        },
        includeMemberViewer: true,
      });
    }

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
    const { data: existingCard } = await supabaseAdmin
      .from('cards')
      .select('id, title, custom_id')
      .eq('id', id)
      .eq('project_id', projectId)
      .single();

    const { error: deleteError } = await supabaseAdmin
      .from('cards')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (deleteError) throw deleteError;

    if (existingCard) {
      await createProjectMajorNotifications({
        projectId,
        actorId: user.id,
        type: 'card_deleted',
        title: 'Card deleted',
        message: `deleted ${existingCard.custom_id || existingCard.title}`,
        metadata: {
          card_id: existingCard.id,
          card_title: existingCard.title,
          card_custom_id: existingCard.custom_id || null,
        },
        includeMemberViewer: true,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
