import { verifyProjectAccess, verifyValidAssignee } from '@/lib/access';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';
import { createProjectMajorNotifications } from '@/lib/projectNotifications';

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await verifyProjectAccess(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }


  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignee_id = searchParams.get('assignee_id');

    let query = supabaseAdmin
      .from('cards')
      .select(`
        *,
        assignee:profiles!cards_assignee_id_fkey(full_name, avatar_url),
        reporter:profiles!cards_reporter_id_fkey(full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (assignee_id) query = query.eq('assignee_id', assignee_id);

    const { data: cards, error: cardsError } = await query;
    if (cardsError) throw cardsError;
    return NextResponse.json(cards);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await verifyProjectAccess(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }


  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { title, description, issue_type, priority, assignee_id, story_points, list_id, sprint_id, rank } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .insert({
        project_id: projectId,
        title,
        description,
        issue_type: issue_type || 'task',
        priority: priority || 'medium',
        status: 'backlog',
        assignee_id: assignee_id || null,
        reporter_id: user.id,
        story_points: story_points || null,
        list_id: list_id || null,
        sprint_id: sprint_id || null,
        rank: rank || 0
      })
      .select()
      .single();

    if (cardError) throw cardError;

    // Log the creation
    await supabaseAdmin.from('activity_log').insert({
      card_id: card.id,
      user_id: user.id,
      action: 'created',
      details: { title }
    });

    await createProjectMajorNotifications({
      projectId,
      actorId: user.id,
      type: 'card_created',
      title: 'New card created',
      message: `created card ${card.custom_id || title}`,
      metadata: {
        card_id: card.id,
        card_title: card.title,
        card_custom_id: card.custom_id || null,
      },
      includeMemberViewer: true,
    });

    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
