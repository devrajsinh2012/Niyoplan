import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';
import { createProjectMajorNotifications } from '@/lib/projectNotifications';

export async function POST(request, { params }) {
  const { projectId, actionItemId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { data: item, error: itemErr } = await supabaseAdmin
      .from('meeting_action_items')
      .select('*')
      .eq('id', actionItemId)
      .eq('project_id', projectId)
      .single();

    if (itemErr) {
      if (itemErr.code === 'PGRST116') return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
      throw itemErr;
    }

    if (item.linked_card_id) {
      return NextResponse.json({ error: 'Action item is already linked to a card' }, { status: 400 });
    }

    const { data: lists, error: listErr } = await supabaseAdmin
      .from('lists')
      .select('id, name, rank')
      .eq('project_id', projectId)
      .order('rank', { ascending: true });

    if (listErr) throw listErr;

    const fallbackList = (lists || []).find((list) => {
      const normalized = (list.name || '').trim().toLowerCase();
      return normalized === 'to do' || normalized === 'todo' || normalized === 'backlog';
    }) || (lists || [])[0] || null;

    const nowIso = new Date().toISOString();

    const { data: card, error: cardErr } = await supabaseAdmin
      .from('cards')
      .insert({
        project_id: projectId,
        title: item.title,
        description: `Created from meeting action item (${item.id}).`,
        issue_type: 'task',
        priority: 'medium',
        status: 'todo',
        assignee_id: item.owner_id || null,
        reporter_id: user.id,
        due_date: item.due_date || null,
        start_date: nowIso,
        list_id: fallbackList?.id || null,
        rank: Date.now()
      })
      .select()
      .single();

    if (cardErr) throw cardErr;

    const { error: updateErr } = await supabaseAdmin
      .from('meeting_action_items')
      .update({ linked_card_id: card.id, status: 'in_progress' })
      .eq('id', actionItemId);

    if (updateErr) throw updateErr;

    await supabaseAdmin.from('activity_log').insert({
      card_id: card.id,
      user_id: user.id,
      action: 'created_from_meeting_action',
      details: { action_item_id: actionItemId }
    });

    await createProjectMajorNotifications({
      projectId,
      actorId: user.id,
      type: 'meeting_action_converted',
      title: 'Action item converted to card',
      message: `converted action item into ${card.custom_id || card.title}`,
      metadata: {
        action_item_id: actionItemId,
        card_id: card.id,
        card_title: card.title,
        card_custom_id: card.custom_id || null,
      },
      includeMemberViewer: true,
    });

    return NextResponse.json({ card, action_item_id: actionItemId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to convert action item to card' }, { status: 500 });
  }
}
