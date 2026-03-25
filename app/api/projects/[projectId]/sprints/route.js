import { verifyProjectAccess } from '@/lib/access';
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
    const { data: sprints, error: sprintsError } = await supabaseAdmin
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (sprintsError) throw sprintsError;
    return NextResponse.json(sprints);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sprints' }, { status: 500 });
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


  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
  }

  try {
    const { name, start_date, end_date, goal, status } = await request.json();

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const { data: sprint, error: sprintError } = await supabaseAdmin
      .from('sprints')
      .insert({
        project_id: projectId,
        name,
        start_date: start_date || null,
        end_date: end_date || null,
        goal: goal || null,
        status: status || 'planning'
      })
      .select()
      .single();

    if (sprintError) throw sprintError;

    await createProjectMajorNotifications({
      projectId,
      actorId: user.id,
      type: 'sprint_created',
      title: 'Sprint created',
      message: `created sprint ${sprint.name}`,
      metadata: {
        sprint_id: sprint.id,
        sprint_name: sprint.name,
        sprint_status: sprint.status,
      },
      includeMemberViewer: true,
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 });
  }
}
