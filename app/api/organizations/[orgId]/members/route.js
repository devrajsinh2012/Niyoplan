import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = params;

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

    // Fetch email addresses from auth.users for each member
    const membersWithEmail = await Promise.all(
      members.map(async (member) => {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
        return {
          ...member,
          email: authUser?.user?.email || 'Unknown'
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

    const { orgId } = params;
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
      if (!['admin', 'member', 'viewer'].includes(newRole)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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
      // Don't allow removing the last admin
      const { data: adminCount } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('role', 'admin')
        .eq('status', 'active');

      const { data: memberToRemove } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('id', memberId)
        .single();

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
