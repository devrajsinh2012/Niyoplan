import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getProjectAccessContext } from '@/lib/access';
import { supabaseAdmin } from '@/lib/supabaseServer';

const PROJECT_MEMBER_ROLES = new Set(['admin', 'member', 'viewer']);

async function getTargetMember(projectId, memberId) {
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select('id, role, user_id')
    .eq('project_id', projectId)
    .eq('id', memberId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function hasSingleAdmin(projectId) {
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('role', 'admin');

  if (error) {
    throw error;
  }

  return (data || []).length <= 1;
}

export async function PATCH(request, { params }) {
  const { projectId, memberId } = await params;
  const { user, error } = await getAuthUser(request);

  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  const access = await getProjectAccessContext(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }
  if (!access.canManageSettings) {
    return NextResponse.json({ error: 'You do not have permission to manage project members' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const role = String(body?.role || '');

    if (!PROJECT_MEMBER_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid member role' }, { status: 400 });
    }

    const targetMember = await getTargetMember(projectId, memberId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Project member not found' }, { status: 404 });
    }

    if (targetMember.role === 'admin' && role !== 'admin' && await hasSingleAdmin(projectId)) {
      return NextResponse.json({ error: 'At least one admin must remain on the project' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('id', memberId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to update project member:', err);
    return NextResponse.json({ error: 'Failed to update project member' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { projectId, memberId } = await params;
  const { user, error } = await getAuthUser(request);

  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  const access = await getProjectAccessContext(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }
  if (!access.canManageSettings) {
    return NextResponse.json({ error: 'You do not have permission to manage project members' }, { status: 403 });
  }

  try {
    const targetMember = await getTargetMember(projectId, memberId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Project member not found' }, { status: 404 });
    }

    if (targetMember.role === 'admin' && await hasSingleAdmin(projectId)) {
      return NextResponse.json({ error: 'At least one admin must remain on the project' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('id', memberId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to remove project member:', err);
    return NextResponse.json({ error: 'Failed to remove project member' }, { status: 500 });
  }
}
