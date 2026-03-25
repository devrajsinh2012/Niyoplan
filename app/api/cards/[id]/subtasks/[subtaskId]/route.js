import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(request, { params }) {
  const { id, subtaskId } = await params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updateData = {};

    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.completed !== undefined) {
      updateData.completed = body.completed;
    }
    if (body.assignee_id !== undefined) {
      updateData.assignee_id = body.assignee_id;
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
    const { error } = await supabaseAdmin
      .from('card_subtasks')
      .delete()
      .eq('id', subtaskId)
      .eq('card_id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
