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

    // Get organization details
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }

    return NextResponse.json({ ...org, userRole: membership.role });
  } catch (error) {
    console.error('Error in GET /api/organizations/[orgId]:', error);
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

    // Check if user is an admin of this organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership || membership.role !== 'admin' || membership.status !== 'active') {
      return NextResponse.json({ error: 'Only admins can update organization settings' }, { status: 403 });
    }

    // Update organization
    const updateData = {};
    if (body.name) updateData.name = body.name;
    if (body.slug) updateData.slug = body.slug;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.size !== undefined) updateData.size = body.size;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    updateData.updated_at = new Date().toISOString();

    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This slug is already taken' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error('Error in PATCH /api/organizations/[orgId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = params;

    // Check if user is an admin of this organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership || membership.role !== 'admin' || membership.status !== 'active') {
      return NextResponse.json({ error: 'Only admins can delete the organization' }, { status: 403 });
    }

    // Delete organization (cascade will handle members and projects)
    const { error } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/organizations/[orgId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
