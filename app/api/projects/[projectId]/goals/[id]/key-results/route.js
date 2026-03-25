import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';
import { createProjectMajorNotifications } from '@/lib/projectNotifications';

export async function POST(request, { params }) {
  const { projectId, id: goalId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { title, start_value, current_value, target_value, unit } = await request.json();

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const { data, error: insertError } = await supabaseAdmin
      .from('goal_key_results')
      .insert({
        goal_id: goalId,
        title,
        start_value: start_value ?? 0,
        current_value: current_value ?? start_value ?? 0,
        target_value: target_value ?? 100,
        unit: unit || 'points'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { data: goal } = await supabaseAdmin
      .from('goals')
      .select('id, title')
      .eq('id', goalId)
      .eq('project_id', projectId)
      .single();

    await createProjectMajorNotifications({
      projectId,
      actorId: user.id,
      type: 'key_result_created',
      title: 'Key result added',
      message: `added key result ${data.title}`,
      metadata: {
        goal_id: goal?.id || goalId,
        goal_title: goal?.title || null,
        key_result_id: data.id,
        key_result_title: data.title,
      },
      includeMemberViewer: true,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to add key result' }, { status: 500 });
  }
}
