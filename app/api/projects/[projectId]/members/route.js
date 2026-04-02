import { NextResponse } from 'next/server';
import { findAuthUserByEmail, getAuthUser, inviteAuthUserByEmail } from '@/lib/auth';
import { getProjectAccessContext } from '@/lib/access';
import { supabaseAdmin } from '@/lib/supabaseServer';

const PROJECT_MEMBER_ROLES = new Set(['admin', 'pm', 'qa', 'developer', 'member', 'viewer']);

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

async function attachMemberEmails(members, currentUserId) {
  return Promise.all(
    (members || []).map(async (member) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
      const authUser = data?.user;
      const isPendingInvite = Boolean(
        member.invited_by &&
        member.invited_by === currentUserId &&
        !authUser?.email_confirmed_at
      );

      return {
        ...member,
        is_pending_invite: isPendingInvite,
        invite_email: authUser?.email || '',
        invited_at: member.created_at,
        profile: {
          ...(member.profile || {}),
          email: authUser?.email || '',
        },
      };
    })
  );
}

async function ensureOrganizationMembershipForInvite({
  organizationId,
  invitedUserId,
  inviterId,
}) {
  if (!organizationId || !invitedUserId) {
    return;
  }

  const { data: existingMembership, error: existingMembershipError } = await supabaseAdmin
    .from('organization_members')
    .select('id, status, role')
    .eq('organization_id', organizationId)
    .eq('user_id', invitedUserId)
    .maybeSingle();

  if (existingMembershipError) {
    throw existingMembershipError;
  }

  if (existingMembership?.status === 'active') {
    return;
  }

  if (existingMembership) {
    const { error: updateMembershipError } = await supabaseAdmin
      .from('organization_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        invited_by: inviterId,
      })
      .eq('id', existingMembership.id);

    if (updateMembershipError) {
      throw updateMembershipError;
    }

    return;
  }

  const { error: insertMembershipError } = await supabaseAdmin
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: invitedUserId,
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
      invited_by: inviterId,
    });

  if (insertMembershipError) {
    throw insertMembershipError;
  }
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
        invited_by,
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

    const membersWithEmail = await attachMemberEmails(members || [], user.id);
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
    const redirectTo = `${request.nextUrl.origin}/login`;
    const organizationId = access?.project?.organization_id || null;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!PROJECT_MEMBER_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid member role' }, { status: 400 });
    }

    let authUser = await findAuthUserByEmail(email);

    if (!authUser?.id) {
      authUser = await inviteAuthUserByEmail(email, {
        redirectTo,
        data: {
          role,
          organization_id: organizationId,
          invited_from: 'project',
          project_id: projectId,
        },
      });
    }

    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unable to resolve invited user account' }, { status: 500 });
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
        invited_by: user.id,
      });

    if (insertError) {
      throw insertError;
    }

    await ensureOrganizationMembershipForInvite({
      organizationId,
      invitedUserId: authUser.id,
      inviterId: user.id,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Failed to invite project member:', err);
    if (err?.status === 429 || err?.message?.toLowerCase().includes('rate limit')) {
      return NextResponse.json({
        error: 'Email invitation limit reached or database is under high load. Please try again after some time (usually after 1 hour).'
      }, { status: 429 });
    }
    return NextResponse.json({ error: 'Failed to invite project member' }, { status: 500 });
  }
}
