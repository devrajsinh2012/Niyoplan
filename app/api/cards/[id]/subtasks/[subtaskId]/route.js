import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { verifyProjectAccess } from '@/lib/access';

export async function PATCH(request, { params }) {
  const { id, subtaskId } = await params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify project access
    const { data: card } = await supabaseAdmin
      .from('cards')
      .select('project_id, title, custom_id')
      .eq('id', id)
      .single();
      
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    const access = await verifyProjectAccess(card.project_id, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    // Get the existing subtask
    const { data: existingSubtask } = await supabaseAdmin
      .from('card_subtasks')
      .select('*, assignee:profiles!card_subtasks_assignee_id_fkey(id, full_name, avatar_url)')
      .eq('id', subtaskId)
      .eq('card_id', id)
      .single();

    const body = await request.json();
    const updateData = {};
    const changedFields = [];

    if (body.title !== undefined) {
      updateData.title = body.title;
      if (existingSubtask?.title !== body.title) changedFields.push('title');
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.completed !== undefined) {
      updateData.completed = body.completed;
      if (existingSubtask?.completed !== body.completed) {
        changedFields.push(body.completed ? 'completed' : 'uncompleted');
      }
    }
    if (body.assignee_id !== undefined) {
      updateData.assignee_id = body.assignee_id;
      if (existingSubtask?.assignee_id !== body.assignee_id) {
        changedFields.push('assignee');
      }
    }
    if (body.due_date !== undefined) {
      updateData.due_date = body.due_date;
    }
    if (body.rank !== undefined) {
      updateData.rank = body.rank;
    }

    updateData.updated_at = new Date().toISOString();

    const { data: subtask, error } = await supabaseAdmin
      .from('card_subtasks')
      .update(updateData)
      .eq('id', subtaskId)
      .eq('card_id', id)
      .select('*, assignee:profiles!card_subtasks_assignee_id_fkey(id, full_name, avatar_url)')
      .single();

    if (error) throw error;

    // Create notifications based on what changed
    const cardRef = card.custom_id || card.title;

    // Notify when subtask is completed
    if (changedFields.includes('completed') && body.completed) {
      // Notify card owner/reporter
      const { data: cardData } = await supabaseAdmin
        .from('cards')
        .select('reporter_id, assignee_id')
        .eq('id', id)
        .single();

      const notifyUsers = new Set();
      if (cardData?.reporter_id && cardData.reporter_id !== user.id) notifyUsers.add(cardData.reporter_id);
      if (cardData?.assignee_id && cardData.assignee_id !== user.id) notifyUsers.add(cardData.assignee_id);

      if (notifyUsers.size > 0) {
        const notifications = [...notifyUsers].map(userId => ({
          project_id: card.project_id,
          user_id: userId,
          type: 'subtask_completed',
          title: 'Subtask completed',
          message: `completed subtask "${subtask.title}" on ${cardRef}`,
          metadata: {
            card_id: id,
            card_title: card.title,
            card_custom_id: card.custom_id || null,
            subtask_id: subtask.id,
            subtask_title: subtask.title,
            actor_id: user.id,
            actor_name: user.full_name || 'Team Member',
          },
        }));
        await supabaseAdmin.from('notifications').insert(notifications);
      }
    }

    // Notify when subtask is assigned to someone
    if (changedFields.includes('assignee') && body.assignee_id && body.assignee_id !== user.id) {
      await supabaseAdmin.from('notifications').insert({
        project_id: card.project_id,
        user_id: body.assignee_id,
        type: 'subtask_assigned',
        title: 'Subtask assigned to you',
        message: `assigned you to subtask "${subtask.title}" on ${cardRef}`,
        metadata: {
          card_id: id,
          card_title: card.title,
          card_custom_id: card.custom_id || null,
          subtask_id: subtask.id,
          subtask_title: subtask.title,
          actor_id: user.id,
          actor_name: user.full_name || 'Team Member',
        },
      });
    }

    // Create project-wide notification for subtask updates (only major changes)
    if (changedFields.length > 0) {
      await supabaseAdmin.from('activity_log').insert({
        card_id: id,
        user_id: user.id,
        action: 'subtask_updated',
        details: { subtask_id: subtaskId, fields: changedFields }
      });
    }

    return NextResponse.json(subtask);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id, subtaskId } = await params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify project access
    const { data: card } = await supabaseAdmin
      .from('cards')
      .select('project_id, title, custom_id')
      .eq('id', id)
      .single();
      
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    const access = await verifyProjectAccess(card.project_id, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    // Get subtask info before deleting
    const { data: subtask } = await supabaseAdmin
      .from('card_subtasks')
      .select('*')
      .eq('id', subtaskId)
      .eq('card_id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('card_subtasks')
      .delete()
      .eq('id', subtaskId)
      .eq('card_id', id);

    if (error) throw error;

    // Log the deletion
    await supabaseAdmin.from('activity_log').insert({
      card_id: id,
      user_id: user.id,
      action: 'subtask_deleted',
      details: { subtask_id: subtaskId, subtask_title: subtask?.title }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
