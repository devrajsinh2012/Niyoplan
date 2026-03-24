import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const { projectId, viewId } = params;

  try {
    const { data: view, error } = await supabaseAdmin
      .from('saved_views')
      .select('*, creator:profiles!saved_views_creator_id_fkey(id, full_name, avatar_url)')
      .eq('id', viewId)
      .eq('project_id', projectId)
      .single();

    if (error) throw error;
    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 });
    }
    return NextResponse.json(view);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch view' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { projectId, viewId } = params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updateData = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.filters !== undefined) {
      updateData.filters = body.filters;
    }
    if (body.sort_by !== undefined) {
      updateData.sort_by = body.sort_by;
    }
    if (body.sort_order !== undefined) {
      updateData.sort_order = body.sort_order;
    }
    if (body.hidden_columns !== undefined) {
      updateData.hidden_columns = body.hidden_columns;
    }
    if (body.is_default !== undefined) {
      updateData.is_default = body.is_default;
    }

    updateData.updated_at = new Date().toISOString();

    const { data: view, error } = await supabaseAdmin
      .from('saved_views')
      .update(updateData)
      .eq('id', viewId)
      .eq('project_id', projectId)
      .select('*, creator:profiles!saved_views_creator_id_fkey(id, full_name, avatar_url)')
      .single();

    if (error) throw error;
    return NextResponse.json(view);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update view' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { projectId, viewId } = params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('saved_views')
      .delete()
      .eq('id', viewId)
      .eq('project_id', projectId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete view' }, { status: 500 });
  }
}
