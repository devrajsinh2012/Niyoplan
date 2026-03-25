import { verifyProjectAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

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
    const { data, error: fetchError } = await supabaseAdmin
      .from('docs')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (fetchError) throw fetchError;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch docs' }, { status: 500 });
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
    const { title, content, space_id, folder_id } = await request.json();

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const { data, error: insertError } = await supabaseAdmin
      .from('docs')
      .insert({
        project_id: projectId,
        title,
        content: content || '',
        space_id: space_id || null,
        folder_id: folder_id || null,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 });
  }
}
