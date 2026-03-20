import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function PUT(request, { params }) {
  const { projectId, id: goalId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { title, description, owner_id, target_date, status } = await request.json();

    const { data, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({
        title,
        description,
        owner_id,
        target_date,
        status,
        updated_at: new Date()
      })
      .eq('id', goalId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}
