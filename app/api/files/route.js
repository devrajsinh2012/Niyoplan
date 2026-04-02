import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { verifyOrganizationAccess, verifyProjectAccess } from '@/lib/access';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request) {
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orgIdInput = String(searchParams.get('orgId') || '').trim();
    const projectId = String(searchParams.get('projectId') || '').trim();
    const cardId = String(searchParams.get('cardId') || '').trim();

    if (!orgIdInput && !projectId) {
      return NextResponse.json({ error: 'orgId or projectId is required.' }, { status: 400 });
    }

    let resolvedOrgId = orgIdInput || null;

    if (projectId) {
      const projectAccess = await verifyProjectAccess(projectId, user.id);
      if (!projectAccess.hasAccess) {
        return NextResponse.json({ error: projectAccess.error || 'Forbidden.' }, { status: 403 });
      }

      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .maybeSingle();

      if (projectError) throw projectError;

      if (!project) {
        return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
      }

      resolvedOrgId = project.organization_id;

      if (orgIdInput && orgIdInput !== resolvedOrgId) {
        return NextResponse.json({ error: 'orgId does not match project organization.' }, { status: 400 });
      }
    } else {
      const orgAccess = await verifyOrganizationAccess(resolvedOrgId, user.id);
      if (!orgAccess.hasAccess) {
        return NextResponse.json({ error: orgAccess.error || 'Forbidden.' }, { status: 403 });
      }
    }

    let query = supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('org_id', resolvedOrgId)
      .order('uploaded_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (cardId) {
      query = query.eq('card_id', cardId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('File listing failed:', error);
    return NextResponse.json({ error: 'Unable to fetch attachments right now.' }, { status: 500 });
  }
}
