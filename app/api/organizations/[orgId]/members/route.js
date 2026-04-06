import { supabaseAdmin } from '@/lib/supabaseServer';
import { findAuthUserByEmail, getAuthUser, inviteAuthUserByEmail } from '@/lib/auth';
import { NextResponse } from 'next/server';

const ORG_MEMBER_ROLES = new Set(['admin', 'pm', 'qa', 'developer', 'member', 'viewer']);

export async function GET(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;

    // Check if user is a member of this organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Get all members with their profile information
    const { data: members, error } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        invited_by,
        user_id,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email:id
        )
      `)
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Fetch auth email state and auto-activate invited members once they confirm their account.
    const membersWithEmail = await Promise.all(
      members.map(async (member) => {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(member.user_id);

        if (authError) {
          console.error('Failed to fetch auth user for organization member:', authError);
        }

        const authUser = authData?.user || null;
        const emailConfirmedAt = authUser?.email_confirmed_at || null;
        const invitedByAdmin = Boolean(member.invited_by);

        let normalizedStatus = member.status;
        let normalizedJoinedAt = member.joined_at;

        if (member.status === 'pending' && invitedByAdmin && emailConfirmedAt) {
          const activatedAt = new Date().toISOString();
          const { error: activateError } = await supabaseAdmin
            .from('organization_members')
            .update({
              status: 'active',
              joined_at: activatedAt,
            })
            .eq('id', member.id)
            .eq('organization_id', orgId);

          if (activateError) {
            console.error('Failed to activate accepted organization invite:', activateError);
          } else {
            normalizedStatus = 'active';
            normalizedJoinedAt = activatedAt;
          }
        }

        const isPendingInvite = Boolean(
          invitedByAdmin &&
          member.invited_by === user.id &&
          (
            (normalizedStatus === 'pending' && !emailConfirmedAt) ||
            (normalizedStatus === 'active' && !emailConfirmedAt)
          )
        );

        return {
          ...member,
          status: normalizedStatus,
          joined_at: normalizedJoinedAt,
          email: authUser?.email || 'Unknown',
          is_pending_invite: isPendingInvite,
          invited_at: member.joined_at,
        };
      })
    );

    return NextResponse.json(membersWithEmail);
  } catch (error) {
    console.error('Error in GET /api/organizations/[orgId]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const { memberId, action, newRole } = body;

    // Check if user is an admin of this organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership || membership.role !== 'admin' || membership.status !== 'active') {
      return NextResponse.json({ error: 'Only admins can manage members' }, { status: 403 });
    }

    // Handle different actions
    if (action === 'approve') {
      const { error } = await supabaseAdmin
        .from('organization_members')
        .update({ status: 'active' })
        .eq('id', memberId)
        .eq('organization_id', orgId);

      if (error) {
        return NextResponse.json({ error: 'Failed to approve member' }, { status: 500 });
      }

      // Get member info for notification
      const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .eq('id', memberId)
        .single();

      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      // Send notification to the approved member
      if (member && org) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: member.user_id,
            type: 'member_approved',
            title: 'Join request approved',
            message: `Your request to join ${org.name} has been approved!`,
            metadata: { organization_id: orgId }
          });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('organization_members')
        .update({ status: 'rejected' })
        .eq('id', memberId)
        .eq('organization_id', orgId);

      if (error) {
        return NextResponse.json({ error: 'Failed to reject member' }, { status: 500 });
      }

      // Get member info for notification
      const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .eq('id', memberId)
        .single();

      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      // Send notification to the rejected member
      if (member && org) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: member.user_id,
            type: 'member_rejected',
            title: 'Join request declined',
            message: `Your request to join ${org.name} was not approved.`,
            metadata: { organization_id: orgId }
          });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'changeRole') {
      if (!['admin', 'pm', 'qa', 'developer', 'member', 'viewer'].includes(newRole)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      // Get organization to check creator
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('created_by')
        .eq('id', orgId)
        .single();

      // Get member getting updated
      const { data: memberToUpdate } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .eq('id', memberId)
        .single();

      if (org && memberToUpdate && memberToUpdate.user_id === org.created_by) {
        return NextResponse.json({ error: 'Cannot change role of the company creator' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('organization_id', orgId);

      if (error) {
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'remove') {
      // Get organization to check creator
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('created_by')
        .eq('id', orgId)
        .single();

      const { data: memberToRemove } = await supabaseAdmin
        .from('organization_members')
        .select('role, user_id')
        .eq('id', memberId)
        .single();

      if (org && memberToRemove && memberToRemove.user_id === org.created_by) {
        return NextResponse.json({ error: 'Cannot remove the company creator' }, { status: 400 });
      }

      // Don't allow removing the last admin
      const { data: adminCount } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('role', 'admin')
        .eq('status', 'active');

      if (memberToRemove?.role === 'admin' && adminCount?.length === 1) {
        return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', orgId);

      if (error) {
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in PATCH /api/organizations/[orgId]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const role = String(body?.role || 'member').trim().toLowerCase();
    const rawEmails = Array.isArray(body?.emails) ? body.emails : [];

    if (!ORG_MEMBER_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (!rawEmails.length) {
      return NextResponse.json({ error: 'At least one email is required' }, { status: 400 });
    }

    const emails = [...new Set(
      rawEmails
        .map((entry) => String(entry || '').trim().toLowerCase())
        .filter((entry) => entry && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))
    )];

    if (!emails.length) {
      return NextResponse.json({ error: 'No valid email addresses provided' }, { status: 400 });
    }

    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership || membership.role !== 'admin' || membership.status !== 'active') {
      return NextResponse.json({ error: 'Only admins can invite members' }, { status: 403 });
    }

    const redirectTo = `${request.nextUrl.origin}/login`;
    const results = [];
    const summary = {
      emailInvitesSent: 0,
      pendingInvites: 0,
      activeMembersAdded: 0,
      alreadyMembers: 0,
      failed: 0,
    };

    for (const email of emails) {
      let invitedViaEmail = false;

      let authUser = await findAuthUserByEmail(email);

      if (!authUser?.id) {
        try {
          authUser = await inviteAuthUserByEmail(email, {
            redirectTo,
            data: { role },
          });
          invitedViaEmail = true;
          summary.emailInvitesSent += 1;
        } catch (inviteError) {
          if (inviteError?.status === 429 || inviteError?.message?.toLowerCase().includes('rate limit')) {
            throw inviteError;
          }

          console.error('Failed to send invite email:', inviteError);
          summary.failed += 1;
          results.push({
            email,
            status: 'failed',
            message: inviteError?.message || 'Failed to send invitation email',
          });
          continue;
        }
      }

      if (!authUser?.id) {
        summary.failed += 1;
        results.push({ email, status: 'failed', message: 'Unable to resolve invited account' });
        continue;
      }

      const inviteAccepted = Boolean(authUser?.email_confirmed_at);
      const membershipStatus = inviteAccepted ? 'active' : 'pending';
      const joinedAt = new Date().toISOString();

      const { data: existingMember, error: existingMemberError } = await supabaseAdmin
        .from('organization_members')
        .select('id, status, invited_by')
        .eq('organization_id', orgId)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (existingMemberError) {
        throw existingMemberError;
      }

      if (existingMember?.status === 'active') {
        summary.alreadyMembers += 1;
        results.push({
          email,
          status: 'already_member',
          email_sent: invitedViaEmail,
          message: 'User is already active in this organization',
        });
        continue;
      }

      if (existingMember) {
        const { error: updateError } = await supabaseAdmin
          .from('organization_members')
          .update({
            role,
            status: membershipStatus,
            joined_at: joinedAt,
            invited_by: user.id,
          })
          .eq('id', existingMember.id);

        if (updateError) {
          throw updateError;
        }

        if (membershipStatus === 'pending') {
          summary.pendingInvites += 1;
        } else {
          summary.activeMembersAdded += 1;
        }

        results.push({
          email,
          status: membershipStatus === 'pending' ? 'pending_invite' : 'active_member',
          email_sent: invitedViaEmail,
          message: membershipStatus === 'pending'
            ? 'Invitation sent and awaiting acceptance'
            : 'Existing account added as active member',
        });
        continue;
      }

      const { error: insertError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: authUser.id,
          role,
          status: membershipStatus,
          joined_at: joinedAt,
          invited_by: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      if (membershipStatus === 'pending') {
        summary.pendingInvites += 1;
      } else {
        summary.activeMembersAdded += 1;
      }

      results.push({
        email,
        status: membershipStatus === 'pending' ? 'pending_invite' : 'active_member',
        email_sent: invitedViaEmail,
        message: membershipStatus === 'pending'
          ? 'Invitation sent and awaiting acceptance'
          : 'Existing account added as active member',
      });
    }

    if (!results.length) {
      return NextResponse.json({ error: 'No valid email addresses provided' }, { status: 400 });
    }

    const totalProcessed = results.length;

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} invite${totalProcessed === 1 ? '' : 's'}: ${summary.emailInvitesSent} email${summary.emailInvitesSent === 1 ? '' : 's'} sent, ${summary.pendingInvites} pending, ${summary.activeMembersAdded} active, ${summary.alreadyMembers} already member${summary.alreadyMembers === 1 ? '' : 's'}, ${summary.failed} failed`,
      summary,
      results,
    });
  } catch (error) {
    console.error('Error in POST /api/organizations/[orgId]/members:', error);
    if (error?.status === 429 || error?.message?.toLowerCase().includes('rate limit')) {
      return NextResponse.json({
        error: 'Email invitation limit reached or database is under high load. Please try again after some time (usually after 1 hour).'
      }, { status: 429 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
