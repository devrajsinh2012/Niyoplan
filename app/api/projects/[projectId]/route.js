import { getProjectAccessContext } from '@/lib/access';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

const PROJECT_TYPES = new Set(['software', 'marketing', 'design', 'other']);
const PROJECT_STATUSES = new Set(['active', 'on_hold', 'archived']);
const SPRINT_DURATIONS = new Set(['1', '2', '3', '4']);

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await getProjectAccessContext(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  try {
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select(`*, profiles (full_name)`)
      .eq('id', projectId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      throw projectError;
    }
    return NextResponse.json({
      ...project,
      access: {
        canManageSettings: access.canManageSettings,
        canDeleteProject: access.canDeleteProject,
        isCreator: access.isCreator,
        organizationRole: access.organizationMembership?.role || null,
        projectRole: access.projectMembership?.role || null,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await getProjectAccessContext(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }
  if (!access.canManageSettings) {
    return NextResponse.json({ error: 'You do not have permission to update this project' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, prefix, type, description, status, sprint_duration, sprint_naming } = body;

    const updateData = {};
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
      }
      updateData.name = trimmedName;
    }
    if (prefix !== undefined) {
      const normalizedPrefix = String(prefix).trim().toUpperCase();
      if (!/^[A-Z0-9]{2,10}$/.test(normalizedPrefix)) {
        return NextResponse.json({ error: 'Project key must be 2-10 uppercase letters or numbers' }, { status: 400 });
      }
      updateData.prefix = normalizedPrefix;
    }
    if (type !== undefined) {
      if (!PROJECT_TYPES.has(type)) {
        return NextResponse.json({ error: 'Invalid project type' }, { status: 400 });
      }
      updateData.type = type;
    }
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status !== undefined) {
      if (!PROJECT_STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid project status' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (sprint_duration !== undefined) {
      const normalizedDuration = String(sprint_duration);
      if (!SPRINT_DURATIONS.has(normalizedDuration)) {
        return NextResponse.json({ error: 'Sprint duration must be between 1 and 4 weeks' }, { status: 400 });
      }
      updateData.sprint_duration = normalizedDuration;
    }
    if (sprint_naming !== undefined) {
      const trimmedNaming = String(sprint_naming).trim();
      if (!trimmedNaming) {
        return NextResponse.json({ error: 'Sprint naming convention is required' }, { status: 400 });
      }
      updateData.sprint_naming = trimmedNaming;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No project changes were provided' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: project, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(project);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Project key must be unique' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await getProjectAccessContext(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }
  if (!access.canDeleteProject) {
    return NextResponse.json({ error: 'You do not have permission to delete this project' }, { status: 403 });
  }

  try {
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) throw deleteError;
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
