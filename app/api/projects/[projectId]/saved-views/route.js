import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const { projectId } = params;

  try {
    const { data: views, error } = await supabaseAdmin
      .from('saved_views')
      .select('*, creator:profiles!saved_views_creator_id_fkey(id, full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(views || []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch saved views' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { projectId } = params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      view_type = 'kanban',
      filters = {},
      sort_by = 'rank',
      sort_order = 'asc',
      hidden_columns = []
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'View name required' }, { status: 400 });
    }

    const { data: view, error } = await supabaseAdmin
      .from('saved_views')
      .insert([
        {
          project_id: projectId,
          creator_id: user.id,
          name: name.trim(),
          view_type,
          filters,
          sort_by,
          sort_order,
          hidden_columns
        }
      ])
      .select('*, creator:profiles!saved_views_creator_id_fkey(id, full_name, avatar_url)')
      .single();

    if (error) throw error;
    return NextResponse.json(view);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create view' }, { status: 500 });
  }
}
