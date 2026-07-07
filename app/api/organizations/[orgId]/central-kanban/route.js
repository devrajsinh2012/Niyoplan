import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyOrganizationAccess } from '@/lib/access';

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = await params;

    const access = await verifyOrganizationAccess(orgId, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('organization_id', orgId);

    const projectIds = (projects || []).map(p => p.id);
    if (projectIds.length === 0) return NextResponse.json({ cards: [] });

    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select(`
        *,
        projects(id, name, prefix),
        assignee:profiles!cards_assignee_id_fkey(id, full_name, avatar_url)
      `)
      .in('project_id', projectIds)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ cards: cards || [] });
  } catch (error) {
    console.error('Central Kanban API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = await params;

    const access = await verifyOrganizationAccess(orgId, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    const { cardId, status } = body;

    if (!cardId || !status) {
      return NextResponse.json({ error: 'cardId and status are required' }, { status: 400 });
    }

    const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const { data: updatedCard, error: updateError } = await supabaseAdmin
      .from('cards')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', cardId)
      .select('*, projects(id, name, prefix), assignee:profiles!cards_assignee_id_fkey(id, full_name, avatar_url)')
      .single();

    if (updateError) throw updateError;

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      card_id: cardId,
      user_id: user.id,
      action: 'status_changed',
      details: { to: status, from: 'central_kanban' },
    });

    return NextResponse.json({ card: updatedCard });
  } catch (error) {
    console.error('Central Kanban PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
