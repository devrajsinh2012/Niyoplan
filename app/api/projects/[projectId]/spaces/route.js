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
    const [{ data: spaces, error: spaceErr }, { data: folders, error: folderErr }] = await Promise.all([
      supabaseAdmin.from('spaces').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('folders').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    ]);

    if (spaceErr) throw spaceErr;
    if (folderErr) throw folderErr;

    return NextResponse.json({ spaces: spaces || [], folders: folders || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch spaces and folders' }, { status: 500 });
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
    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const { data, error: insertError } = await supabaseAdmin
      .from('spaces')
      .insert({ name, description: description || null, created_by: user.id })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create space' }, { status: 500 });
  }
}
