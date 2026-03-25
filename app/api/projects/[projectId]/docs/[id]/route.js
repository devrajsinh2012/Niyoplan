import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function PUT(request, { params }) {
  const { projectId, id: docId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { title, content, space_id, folder_id } = await request.json();

    const { data, error: updateError } = await supabaseAdmin
      .from('docs')
      .update({
        title,
        content,
        space_id,
        folder_id,
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

