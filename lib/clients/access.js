import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export function badRequest(errors) {
  return NextResponse.json({ error: Array.isArray(errors) ? errors.join(', ') : errors }, { status: 400 });
}

export async function validateProjectInOrganization(projectId, organizationId) {
  if (!projectId) return { valid: true };

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, organization_id')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !project || project.organization_id !== organizationId) {
    return { valid: false, error: 'Project must belong to the client organization' };
  }

  return { valid: true, project };
}

export async function validateOrganizationAssignee(userId, organizationId) {
  if (!userId) return { valid: true };

  const { data: member, error } = await supabaseAdmin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !member) {
    return { valid: false, error: 'Assignee must be an active member of the client organization' };
  }

  return { valid: true };
}

export async function getClientOrgId(clientId) {
  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .select('id, organization_id, name, status')
    .eq('id', clientId)
    .maybeSingle();

  if (error || !client) {
    return { client: null, error: 'Client not found' };
  }

  return { client, error: null };
}

export async function ensureSinglePrimaryContact(clientId, contactId = null) {
  let query = supabaseAdmin
    .from('client_contacts')
    .update({ is_primary: false })
    .eq('client_id', clientId);

  if (contactId) {
    query = query.neq('id', contactId);
  }

  await query;
}

