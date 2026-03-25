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
    const { data: goals, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('*, owner:profiles!goals_owner_id_fkey(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    const goalIds = (goals || []).map((g) => g.id);
    let keyResults = [];

    if (goalIds.length > 0) {
      const { data: rows, error: krErr } = await supabaseAdmin
        .from('goal_key_results')
        .select('*')
        .in('goal_id', goalIds)
        .order('created_at', { ascending: true });
      if (krErr) throw krErr;
      keyResults = rows || [];
    }

    const byGoal = new Map();
    keyResults.forEach((kr) => {
      if (!byGoal.has(kr.goal_id)) byGoal.set(kr.goal_id, []);
      byGoal.get(kr.goal_id).push(kr);
    });

    const enriched = (goals || []).map((goal) => {
      const krs = byGoal.get(goal.id) || [];
      const progress = krs.length
        ? Math.round(
            (krs.reduce((acc, kr) => {
              const denom = Number(kr.target_value) - Number(kr.start_value) || 1;
              const ratio = (Number(kr.current_value) - Number(kr.start_value)) / denom;
              return acc + Math.max(0, Math.min(1, ratio));
            }, 0) /
              krs.length) *
              100
          )
        : 0;
      return { ...goal, key_results: krs, progress };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
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
    const { title, description, owner_id, target_date, status, key_results } = await request.json();

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const { data: goal, error: insertError } = await supabaseAdmin
      .from('goals')
      .insert({
        project_id: projectId,
        title,
        description: description || null,
        owner_id: owner_id || user.id,
        target_date: target_date || null,
        status: status || 'active'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (Array.isArray(key_results) && key_results.length > 0) {
      const krRows = key_results
        .filter((kr) => kr.title)
        .map((kr) => ({
          goal_id: goal.id,
          title: kr.title,
          start_value: kr.start_value ?? 0,
          current_value: kr.current_value ?? kr.start_value ?? 0,
          target_value: kr.target_value ?? 100,
          unit: kr.unit || 'points'
        }));

      if (krRows.length > 0) {
        const { error: krErr } = await supabaseAdmin.from('goal_key_results').insert(krRows);
        if (krErr) throw krErr;
      }
    }

    await createProjectMajorNotifications({
      projectId,
      actorId: user.id,
      type: 'goal_created',
      title: 'Goal created',
      message: `created goal ${goal.title}`,
      metadata: {
        goal_id: goal.id,
        goal_title: goal.title,
        goal_status: goal.status,
      },
      includeMemberViewer: true,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
