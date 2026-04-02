import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { user, error } = await getAuthUser(request);

  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: activeMemberships, error: activeMembershipsError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (activeMembershipsError) {
      throw activeMembershipsError;
    }

    if ((activeMemberships || []).length > 0) {
      return NextResponse.json({
        success: true,
        activeOrganizationIds: activeMemberships.map((membership) => membership.organization_id),
        joinedOrganizationIds: [],
      });
    }

    const { data: projectMemberships, error: projectMembershipsError } = await supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (projectMembershipsError) {
      throw projectMembershipsError;
    }

    const projectIds = [...new Set((projectMemberships || []).map((membership) => membership.project_id).filter(Boolean))];

    if (!projectIds.length) {
      return NextResponse.json({ success: true, activeOrganizationIds: [], joinedOrganizationIds: [] });
    }

    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, organization_id')
      .in('id', projectIds)
      .not('organization_id', 'is', null);

    if (projectsError) {
      throw projectsError;
    }

    const organizationIds = [...new Set((projects || []).map((project) => project.organization_id).filter(Boolean))];

    if (!organizationIds.length) {
      return NextResponse.json({ success: true, activeOrganizationIds: [], joinedOrganizationIds: [] });
    }

    const { data: existingMemberships, error: existingMembershipsError } = await supabaseAdmin
      .from('organization_members')
      .select('id, organization_id, status')
      .eq('user_id', user.id)
      .in('organization_id', organizationIds);

    if (existingMembershipsError) {
      throw existingMembershipsError;
    }

    const existingByOrganization = new Map((existingMemberships || []).map((membership) => [membership.organization_id, membership]));
    const joinedOrganizationIds = [];

    for (const organizationId of organizationIds) {
      const existing = existingByOrganization.get(organizationId);

      if (existing?.status === 'active') {
        continue;
      }

      if (existing) {
        const { error: updateError } = await supabaseAdmin
          .from('organization_members')
          .update({
            status: 'active',
            joined_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          throw updateError;
        }

        joinedOrganizationIds.push(organizationId);
        continue;
      }

      const { error: insertError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          role: 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      joinedOrganizationIds.push(organizationId);
    }

    return NextResponse.json({
      success: true,
      activeOrganizationIds: [],
      joinedOrganizationIds,
    });
  } catch (err) {
    console.error('Failed to auto-join organizations from project memberships:', err);
    return NextResponse.json({ error: 'Failed to auto-join organizations' }, { status: 500 });
  }
}
