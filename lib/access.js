import { supabaseAdmin } from './supabaseServer';
import { applyPermissionRows, roleHasPermission } from './permissions';

const MANAGEMENT_ORG_ROLES = new Set(['admin', 'pm']);

const maybeSingleResult = async (query) => {
  if (typeof query?.maybeSingle === 'function') {
    const result = await query.maybeSingle();
    return result || { data: null, error: null };
  }

  if (typeof query?.single === 'function') {
    const result = await query.single();
    return result || { data: null, error: null };
  }

  return { data: null, error: new Error('Query object does not support single-row access') };
};

/**
 * Validates whether a user has active membership within an organization.
 * @param {string} orgId 
 * @param {string} userId 
 * @returns {Promise<{ hasAccess: boolean, error: string | null }>}
 */
export async function verifyOrganizationAccess(orgId, userId) {
  if (!orgId || !userId) return { hasAccess: false, error: 'Missing parameters' };

  try {
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { hasAccess: false, error: 'User is not a member of this organization' };
    }

    if (data.status !== 'active') {
      return { hasAccess: false, error: 'User organization membership is inactive' };
    }

    return { hasAccess: true, error: null };
  } catch (err) {
    console.error('Organization access verification failed:', err);
    return { hasAccess: false, error: 'Internal Server Error during access check' };
  }
}

export async function getOrganizationMembershipContext(orgId, userId) {
  if (!orgId || !userId) {
    return { hasAccess: false, error: 'Missing parameters', membership: null, permissionMatrix: applyPermissionRows([]) };
  }

  try {
    const [{ data: membership, error: membershipError }, { data: permissionRows, error: permissionError }] = await Promise.all([
      supabaseAdmin
        .from('organization_members')
        .select('role, status')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('organization_role_permissions')
        .select('role, permission_key, is_allowed')
        .eq('organization_id', orgId),
    ]);

    if (membershipError || !membership) {
      return { hasAccess: false, error: 'User is not a member of this organization', membership: null, permissionMatrix: applyPermissionRows(permissionRows || []) };
    }

    if (membership.status !== 'active') {
      return { hasAccess: false, error: 'User organization membership is inactive', membership, permissionMatrix: applyPermissionRows(permissionRows || []) };
    }

    if (permissionError) {
      console.error('Organization permission lookup failed:', permissionError);
    }

    return {
      hasAccess: true,
      error: null,
      membership,
      permissionMatrix: applyPermissionRows(permissionRows || []),
    };
  } catch (err) {
    console.error('Organization membership context failed:', err);
    return { hasAccess: false, error: 'Internal Server Error during access check', membership: null, permissionMatrix: applyPermissionRows([]) };
  }
}

export async function getClientAccessContext(clientId, userId) {
  if (!clientId || !userId) {
    return { hasAccess: false, error: 'Missing parameters' };
  }

  try {
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, organization_id, status, created_by')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError || !client) {
      return { hasAccess: false, error: 'Client not found' };
    }

    const orgContext = await getOrganizationMembershipContext(client.organization_id, userId);
    if (!orgContext.hasAccess) {
      return { hasAccess: false, error: orgContext.error, client, ...orgContext };
    }

    const canViewClients = roleHasPermission(orgContext.permissionMatrix, orgContext.membership.role, 'view_clients');
    const canManageClients = roleHasPermission(orgContext.permissionMatrix, orgContext.membership.role, 'manage_clients');

    if (!canViewClients && !canManageClients) {
      return { hasAccess: false, error: 'Forbidden. Your role cannot view clients.', client, ...orgContext };
    }

    return {
      hasAccess: true,
      error: null,
      client,
      ...orgContext,
      canViewClients,
      canManageClients,
    };
  } catch (err) {
    console.error('Client access verification failed:', err);
    return { hasAccess: false, error: 'Internal Server Error during access check' };
  }
}

export async function verifyClientAccess(clientId, userId) {
  const access = await getClientAccessContext(clientId, userId);
  return { hasAccess: access.hasAccess, error: access.error, client: access.client };
}

export async function verifyClientManageAccess(clientId, userId) {
  const access = await getClientAccessContext(clientId, userId);
  if (!access.hasAccess) {
    return { hasAccess: false, error: access.error, client: access.client };
  }

  if (!access.canManageClients) {
    return { hasAccess: false, error: 'Forbidden. Your role cannot manage clients.', client: access.client };
  }

  return { hasAccess: true, error: null, client: access.client, access };
}

/**
 * Resolves project access and management permissions for both organization-backed
 * and legacy projects.
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<{
 *   hasAccess: boolean,
 *   error: string | null,
 *   project?: { id: string, organization_id: string | null, created_by: string | null },
 *   isCreator?: boolean,
 *   organizationMembership?: { role: string, status: string } | null,
 *   projectMembership?: { id: string, role: string } | null,
 *   canManageSettings?: boolean,
 *   canDeleteProject?: boolean
 * }>}
 * @param {string} projectId 
 * @param {string} userId 
 */
export async function getProjectAccessContext(projectId, userId) {
  if (!projectId || !userId) return { hasAccess: false, error: 'Missing parameters' };

  try {
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, organization_id, created_by')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { hasAccess: false, error: 'Project not found' };
    }

    let organizationMembership = null;
    if (project.organization_id) {
      const organizationMembershipQuery = supabaseAdmin
        .from('organization_members')
        .select('role, status')
        .eq('organization_id', project.organization_id)
        .eq('user_id', userId);

      const { data } = await maybeSingleResult(organizationMembershipQuery);

      if (data?.status === 'active') {
        organizationMembership = data;
      }
    }

    const projectMembershipQuery = supabaseAdmin
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    const { data: projectMembership } = await maybeSingleResult(projectMembershipQuery);

    const isCreator = project.created_by === userId;
    const hasAccess = Boolean(organizationMembership || projectMembership || isCreator);

    if (!hasAccess) {
      return { hasAccess: false, error: 'You do not have access to this project' };
    }

    const canManageSettings = Boolean(
      isCreator ||
      MANAGEMENT_ORG_ROLES.has(organizationMembership?.role) ||
      projectMembership?.role === 'admin'
    );

    const canDeleteProject = Boolean(
      isCreator ||
      organizationMembership?.role === 'admin' ||
      projectMembership?.role === 'admin'
    );

    return {
      hasAccess: true,
      error: null,
      project,
      isCreator,
      organizationMembership,
      projectMembership: projectMembership || null,
      canManageSettings,
      canDeleteProject,
    };
  } catch (err) {
    console.error('Project access verification failed:', err);
    return { hasAccess: false, error: 'Internal Server Error during access check' };
  }
}

/**
 * Validates whether a user corresponds to a project, by checking organization access,
 * project membership, or project ownership.
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<{ hasAccess: boolean, error: string | null }>}
 */
export async function verifyProjectAccess(projectId, userId) {
  const access = await getProjectAccessContext(projectId, userId);
  return { hasAccess: access.hasAccess, error: access.error };
}

/**
 * Checks if a specific target user is allowed to be assigned within a project
 * by verifying they belong to the project_members list.
 * @param {string} projectId 
 * @param {string} assigneeId 
 * @returns {Promise<{ isValid: boolean, error: string | null }>}
 */
export async function verifyValidAssignee(projectId, assigneeId) {
  if (!projectId || !assigneeId) return { isValid: false, error: 'Missing parameters' };

  try {
    const { data, error } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', assigneeId)
      .single();

    if (error || !data) {
      return { isValid: false, error: 'Assignee is not a member of this project' };
    }

    return { isValid: true, error: null };
  } catch (err) {
    console.error('Assignee validation failed:', err);
    return { isValid: false, error: 'Internal Server Error during access check' };
  }
}
