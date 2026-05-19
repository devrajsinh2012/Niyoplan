import { supabaseAdmin } from '@/lib/supabaseServer';
import { getOrganizationMembershipContext, verifyClientAccess, verifyClientManageAccess } from '@/lib/access';
import { roleHasPermission } from '@/lib/permissions';
import { validateOrganizationAssignee, validateProjectInOrganization } from '@/lib/clients/access';

export function canViewClients(access) {
  return roleHasPermission(access.permissionMatrix, access.membership?.role, 'view_clients')
    || roleHasPermission(access.permissionMatrix, access.membership?.role, 'manage_clients');
}

export function canManageClients(access) {
  return roleHasPermission(access.permissionMatrix, access.membership?.role, 'manage_clients');
}

export async function requireOrganizationClientAccess(organizationId, userId, permission = 'view') {
  const access = await getOrganizationMembershipContext(organizationId, userId);
  if (!access.hasAccess) return { ok: false, status: 403, error: access.error };

  const allowed = permission === 'manage' ? canManageClients(access) : canViewClients(access);
  if (!allowed) {
    return {
      ok: false,
      status: 403,
      error: permission === 'manage'
        ? 'Forbidden. Your role cannot manage clients.'
        : 'Forbidden. Your role cannot view clients.',
    };
  }

  return { ok: true, access };
}

export async function requireClientAccess(clientId, userId, permission = 'view') {
  const access = permission === 'manage'
    ? await verifyClientManageAccess(clientId, userId)
    : await verifyClientAccess(clientId, userId);

  if (!access.hasAccess) {
    return { ok: false, status: 403, error: access.error };
  }

  return { ok: true, client: access.client, access };
}

export async function validateClientRelations(data, organizationId) {
  if (data.project_id) {
    const projectCheck = await validateProjectInOrganization(data.project_id, organizationId);
    if (!projectCheck.valid) return projectCheck;
  }

  if (data.assigned_to) {
    const assigneeCheck = await validateOrganizationAssignee(data.assigned_to, organizationId);
    if (!assigneeCheck.valid) return assigneeCheck;
  }

  return { valid: true };
}

export async function getClientWithChildren(clientId) {
  const [
    { data: client, error: clientError },
    { data: contacts, error: contactsError },
    { data: reminders, error: remindersError },
    { data: interactions, error: interactionsError },
    { data: deliverables, error: deliverablesError },
  ] = await Promise.all([
    supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle(),
    supabaseAdmin
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('client_reminders')
      .select('*, assignee:profiles!client_reminders_assigned_to_fkey(id, full_name, avatar_url), project:projects(id, name, prefix)')
      .eq('client_id', clientId)
      .order('due_at', { ascending: true }),
    supabaseAdmin
      .from('client_interactions')
      .select('*, creator:profiles!client_interactions_created_by_fkey(id, full_name, avatar_url), project:projects(id, name, prefix)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('client_deliverables')
      .select('*, project:projects(id, name, prefix)')
      .eq('client_id', clientId)
      .order('due_date', { ascending: true }),
  ]);

  const error = clientError || contactsError || remindersError || interactionsError || deliverablesError;
  if (error) throw error;

  return {
    ...client,
    contacts: contacts || [],
    reminders: reminders || [],
    interactions: interactions || [],
    deliverables: deliverables || [],
  };
}

