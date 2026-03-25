import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function DELETE(request, { params }) {
  const { projectId, id } = await params;
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. PM or Admin only.' }, { status: 403 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('hr_reviews')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete HR review' }, { status: 500 });
  }
}
