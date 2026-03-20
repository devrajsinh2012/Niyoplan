import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function POST(request, { params }) {
  const { id: goalId } = await params;
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
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to add key result' }, { status: 500 });
  }
}
