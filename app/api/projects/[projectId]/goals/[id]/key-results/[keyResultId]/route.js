import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';
import { createProjectMajorNotifications } from '@/lib/projectNotifications';

export async function PUT(request, { params }) {
  const { projectId, id: goalId, keyResultId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { title, start_value, current_value, target_value, unit } = await request.json();

    const { data: previous } = await supabaseAdmin
      .from('goal_key_results')
      .select('id, title, current_value, target_value')
      .eq('id', keyResultId)
      .single();

    const { data, error: updateError } = await supabaseAdmin
      .from('goal_key_results')
      .update({
        title,
        start_value,
        current_value,
        target_value,
        unit,
        updated_at: new Date()
      })
      .eq('id', keyResultId)
      .select()
      .single();

    if (updateError) throw updateError;

    const { data: goal } = await supabaseAdmin
      .from('goals')
      .select('id, title')
      .eq('id', goalId)
      .eq('project_id', projectId)
      .single();

    await createProjectMajorNotifications({
      projectId,
      actorId: user.id,
      type: 'key_result_updated',
      title: 'Key result updated',
      message: `updated key result ${data.title}`,
      metadata: {
        goal_id: goal?.id || goalId,
        goal_title: goal?.title || null,
        key_result_id: data.id,
        key_result_title: data.title,
        previous_current_value: previous?.current_value ?? null,
        current_value: data.current_value,
      },
      includeMemberViewer: true,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update key result' }, { status: 500 });
  }
}
