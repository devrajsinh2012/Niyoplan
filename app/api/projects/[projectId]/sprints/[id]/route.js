import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';
import { createProjectMajorNotifications } from '@/lib/projectNotifications';

export async function PUT(request, { params }) {
  const { projectId, id } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
  }

  try {
    const { name, start_date, end_date, goal, status } = await request.json();

    const { data: existingSprint } = await supabaseAdmin
      .from('sprints')
      .select('id, name, status')
      .eq('id', id)
      .eq('project_id', projectId)
      .single();

    const { data: sprint, error: sprintError } = await supabaseAdmin
      .from('sprints')
      .update({
        name,
        start_date,
        end_date,
        goal,
        status,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (sprintError) throw sprintError;

    await createProjectMajorNotifications({
      projectId,
      actorId: user.id,
      type: 'sprint_updated',
      title: 'Sprint updated',
      message: `updated sprint ${sprint.name}`,
      metadata: {
        sprint_id: sprint.id,
        sprint_name: sprint.name,
        previous_status: existingSprint?.status || null,
        sprint_status: sprint.status,
      },
      includeMemberViewer: true,
    });

    return NextResponse.json(sprint);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { projectId, id } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
  }

  try {
    const { data: existingSprint } = await supabaseAdmin
      .from('sprints')
      .select('id, name, status')
      .eq('id', id)
      .eq('project_id', projectId)
      .single();

    const { error: deleteError } = await supabaseAdmin
      .from('sprints')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (deleteError) throw deleteError;

    if (existingSprint) {
      await createProjectMajorNotifications({
        projectId,
        actorId: user.id,
        type: 'sprint_deleted',
        title: 'Sprint deleted',
        message: `deleted sprint ${existingSprint.name}`,
        metadata: {
          sprint_id: existingSprint.id,
          sprint_name: existingSprint.name,
          sprint_status: existingSprint.status,
        },
        includeMemberViewer: true,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 });
  }
}
