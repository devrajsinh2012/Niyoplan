import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  applyPermissionRows,
  matrixToPermissionRows,
  normalizeRolePermissionPayload,
} from '@/lib/permissions';

async function ensureActiveAdminMembership(userId, orgId) {
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role, status')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();

  if (!membership || membership.status !== 'active' || membership.role !== 'admin') {
    return null;
  }

  return membership;
}

export async function GET(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const membership = await ensureActiveAdminMembership(user.id, orgId);

    if (!membership) {
      return NextResponse.json({ error: 'Only company admins can manage permissions' }, { status: 403 });
    }

    const { data: rows, error } = await supabaseAdmin
      .from('organization_role_permissions')
      .select('role, permission_key, is_allowed')
      .eq('organization_id', orgId);

    if (error) {
      console.error('Failed to fetch organization role permissions:', error);
      return NextResponse.json({ error: 'Failed to fetch role permissions' }, { status: 500 });
    }

    return NextResponse.json({
      organizationId: orgId,
      rolePermissions: applyPermissionRows(rows || []),
    });
  } catch (error) {
    console.error('Error in GET /api/organizations/[orgId]/permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const membership = await ensureActiveAdminMembership(user.id, orgId);

    if (!membership) {
      return NextResponse.json({ error: 'Only company admins can manage permissions' }, { status: 403 });
    }

    const body = await request.json();
    const requestedMatrix = normalizeRolePermissionPayload(body?.rolePermissions || {});
    const rows = matrixToPermissionRows(orgId, requestedMatrix);

    const { error } = await supabaseAdmin
      .from('organization_role_permissions')
      .upsert(rows, { onConflict: 'organization_id,role,permission_key' });

    if (error) {
      console.error('Failed to save organization role permissions:', error);
      return NextResponse.json({ error: 'Failed to save role permissions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organizationId: orgId,
      rolePermissions: requestedMatrix,
    });
  } catch (error) {
    console.error('Error in PUT /api/organizations/[orgId]/permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
