import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get every organization this user belongs to (active memberships only)
    const { data: memberships } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const orgIds = (memberships || []).map(m => m.organization_id);
    if (orgIds.length === 0) return NextResponse.json({ cards: [] });

    // 2. Get every project inside those organizations
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, name, prefix, organization_id, organizations(name)')
      .in('organization_id', orgIds);

    const projectIds = (projects || []).map(p => p.id);
    if (projectIds.length === 0) return NextResponse.json({ cards: [] });

    // 3. Get every card assigned to this user across those projects
    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*, projects(id, name, prefix, organization_id, organizations(name))')
      .in('project_id', projectIds)
      .eq('assignee_id', user.id) // confirmed column name from schema.sql
      .eq('is_archived', false)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json({ cards: cards || [] });
  } catch (error) {
    console.error('My Work API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { cardId, status } = body;

    if (!cardId || !status) {
      return NextResponse.json({ error: 'cardId and status are required' }, { status: 400 });
    }

    const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Verify the card is actually assigned to this user before allowing status update
    const { data: card, error: fetchError } = await supabaseAdmin
      .from('cards')
      .select('id, assignee_id, project_id')
      .eq('id', cardId)
      .single();

    if (fetchError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.assignee_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: you are not the assignee of this card' }, { status: 403 });
    }

    // Update card status
    const { data: updatedCard, error: updateError } = await supabaseAdmin
      .from('cards')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', cardId)
      .select('*, projects(id, name, prefix, organization_id, organizations(name))')
      .single();

    if (updateError) throw updateError;

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      card_id: cardId,
      user_id: user.id,
      action: 'status_changed',
      details: { to: status, from: 'my_space' },
    });

    return NextResponse.json({ card: updatedCard });
  } catch (error) {
    console.error('My Work PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
