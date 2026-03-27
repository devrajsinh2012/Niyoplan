import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getProjectAccessContext } from '@/lib/access';
import { supabaseAdmin } from '@/lib/supabaseServer';

const PROJECT_MEMBER_ROLES = new Set(['admin', 'member', 'viewer']);

async function ensureCreatorMembership(project) {
  if (!project?.id || !project?.created_by) return;

  const { error } = await supabaseAdmin
    .from('project_members')
    .upsert(
      {
        project_id: project.id,
        user_id: project.created_by,
        role: 'admin',
      },
      { onConflict: 'project_id,user_id' }
    );

  if (error) {
    console.error('Failed to ensure creator membership:', error);
  }
}

async function getUsersByEmail(email) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const match = data?.users?.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (match) {
      return match;
    }

    if (!data?.users?.length || data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function attachMemberEmails(members) {
  return Promise.all(
    (members || []).map(async (member) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(member.user_id);

      return {
        ...member,
        profile: {
          ...(member.profile || {}),
          email: data?.user?.email || '',
        },
      };
    })
  );
}

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
    await ensureCreatorMembership(access.project);

    const { data: members, error: membersError } = await supabaseAdmin
      .from('project_members')
      .select(`
        id,
        role,
        created_at,
        user_id,
        profile:profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (membersError) {
      throw membersError;
    }

    const membersWithEmail = await attachMemberEmails(members || []);
    return NextResponse.json(membersWithEmail);
  } catch (err) {
    console.error('Failed to fetch project members:', err);
    return NextResponse.json({ error: 'Failed to fetch project members' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
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
    return NextResponse.json({ error: 'You do not have permission to manage project members' }, { status: 403 });
  }

  try {
    await ensureCreatorMembership(access.project);

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const role = String(body?.role || 'member');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!PROJECT_MEMBER_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid member role' }, { status: 400 });
    }

    const authUser = await getUsersByEmail(email);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (access.project?.organization_id) {
      const { data: orgMember } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('organization_id', access.project.organization_id)
        .eq('user_id', authUser.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!orgMember) {
        return NextResponse.json(
          { error: 'User must be an active member of your workspace before joining this project' },
          { status: 400 }
        );
      }
    }

    const { data: existingMember } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: authUser.id,
        role,
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Failed to invite project member:', err);
    return NextResponse.json({ error: 'Failed to invite project member' }, { status: 500 });
  }
}
