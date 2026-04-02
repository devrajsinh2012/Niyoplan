import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';
import { createDriveFolder, getOrgRootFolderId, isOrgDriveConnected } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');

  try {
    // 1. Get user's active organizations
    const { data: orgMembers, error: orgError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (orgError) throw orgError;

    const orgIds = orgMembers.map(member => member.organization_id);

    if (orgIds.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Filter projects to only those within the user's organizations
    let query = supabaseAdmin
      .from('projects')
      .select(`
        *,
        profiles ( full_name, avatar_url ),
        cards ( count )
      `)
      .in('organization_id', orgIds);

    // 3. Further filter by organizationId if provided
    if (organizationId && orgIds.includes(organizationId)) {
      query = query.eq('organization_id', organizationId);
    } else if (organizationId) {
      // If organizationId is provided but user is not a member, return empty
      return NextResponse.json([]);
    }

    const { data: projects, error: projectsError } = await query
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;
    return NextResponse.json(projects);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, description, prefix, organizationId } = await request.json();
    
    if (!name || !prefix || !organizationId) {
      return NextResponse.json({ error: 'Name, prefix, and organizationId are required' }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership || membership.status !== 'active' || !checkRole({ role: membership.role }, 'admin', 'pm')) {
      return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description,
        prefix: prefix.toUpperCase(),
        organization_id: organizationId,
        created_by: user.id
      })
      .select()
      .single();

    if (projectError) throw projectError;

    try {
      const driveConnected = await isOrgDriveConnected(organizationId);
      if (driveConnected) {
        const rootFolderId = await getOrgRootFolderId(organizationId);

        if (rootFolderId) {
          const projectFolderId = await createDriveFolder(
            organizationId,
            name,
            rootFolderId
          );

          if (projectFolderId) {
            const { error: driveFolderUpdateError } = await supabaseAdmin
              .from('projects')
              .update({ drive_folder_id: projectFolderId })
              .eq('id', project.id);

            if (!driveFolderUpdateError) {
              project.drive_folder_id = projectFolderId;
            }
          }
        }
      }
    } catch (driveError) {
      console.error('Drive folder provisioning skipped:', {
        projectId: project.id,
        organizationId,
        error: driveError?.message || 'unknown',
      });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Project prefix must be unique' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
