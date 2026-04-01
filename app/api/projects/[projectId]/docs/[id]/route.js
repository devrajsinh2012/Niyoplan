import { verifyProjectAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

async function validateDocHierarchy({ projectId, spaceId, folderId }) {
  let resolvedSpaceId = spaceId || null;
  const resolvedFolderId = folderId || null;

  if (resolvedSpaceId) {
    const { data: space, error: spaceError } = await supabaseAdmin
      .from('spaces')
      .select('id, project_id')
      .eq('id', resolvedSpaceId)
      .maybeSingle();

    if (spaceError) throw spaceError;
    if (!space || space.project_id !== projectId) {
      return { error: 'Invalid space for this project' };
    }
  }

  if (resolvedFolderId) {
    const { data: folder, error: folderError } = await supabaseAdmin
      .from('folders')
      .select('id, project_id, space_id')
      .eq('id', resolvedFolderId)
      .maybeSingle();

    if (folderError) throw folderError;
    if (!folder || folder.project_id !== projectId) {
      return { error: 'Invalid folder for this project' };
    }

    if (resolvedSpaceId && folder.space_id !== resolvedSpaceId) {
      return { error: 'Folder does not belong to selected space' };
    }

    if (!resolvedSpaceId) {
      resolvedSpaceId = folder.space_id;
    }
  }

  return { space_id: resolvedSpaceId, folder_id: resolvedFolderId };
}

export async function PUT(request, { params }) {
  const { projectId, id: docId } = await params;
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
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    if (!normalizedTitle) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const hierarchy = await validateDocHierarchy({
      projectId,
      spaceId: space_id,
      folderId: folder_id
    });
    if (hierarchy.error) {
      return NextResponse.json({ error: hierarchy.error }, { status: 400 });
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('docs')
      .update({
        title: normalizedTitle,
        content,
        space_id: hierarchy.space_id,
        folder_id: hierarchy.folder_id,
        updated_by: user.id,
        updated_at: new Date()
      })
      .eq('id', docId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update doc' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { projectId, id: docId } = await params;
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const access = await verifyProjectAccess(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('docs')
      .delete()
      .eq('id', docId)
      .eq('project_id', projectId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete doc' }, { status: 500 });
  }
}

