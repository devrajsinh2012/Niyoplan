import { verifyProjectAccess, verifyValidAssignee } from '@/lib/access';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';
import { createProjectMajorNotifications } from '@/lib/projectNotifications';
import { validateString, validateEnum, combineValidations, validationError, validateNonEmpty } from '@/lib/validate';
import { ISSUE_TYPE, CARD_PRIORITY, ISSUE_TYPES, PRIORITIES } from '@/lib/constants';
import { logger, rateLimit } from '@/lib/middleware';

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
  const { projectId } = params;
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';

  if (!rateLimit(ip)) {
    logger.warn('Rate limit exceeded for Cards POST', { ip, projectId });
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

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
    const body = await request.json();
    const { title, issue_type, priority, description, status, assignee_id, story_points, list_id, sprint_id, rank } = body;

    const validation = combineValidations(
      validateString(title, 'Title', { required: true, maxLength: 255 }),
      validateEnum(issue_type || 'task', 'Issue Type', Object.values(ISSUE_TYPE)),
      validateEnum(priority || 'medium', 'Priority', Object.values(CARD_PRIORITY))
    );

    if (!validation.valid) {
      return validationError(validation.errors);
    }

    if (assignee_id) {
       const assigneeValid = await verifyValidAssignee(projectId, assignee_id);
       if (!assigneeValid.isValid) {
         return NextResponse.json({ error: assigneeValid.error }, { status: 400 });
       }
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
