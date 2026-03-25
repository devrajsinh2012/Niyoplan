import { verifyProjectAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

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
    const { name, space_id } = await request.json();
    if (!name || !space_id) return NextResponse.json({ error: 'name and space_id are required' }, { status: 400 });

    const { data, error: insertError } = await supabaseAdmin
      .from('folders')
      .insert({ name, space_id, project_id: projectId, created_by: user.id })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
