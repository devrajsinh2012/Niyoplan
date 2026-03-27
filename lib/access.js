import { supabaseAdmin } from './supabaseServer';

const MANAGEMENT_ORG_ROLES = new Set(['admin', 'pm']);

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
      const { data } = await supabaseAdmin
        .from('organization_members')
        .select('role, status')
        .eq('organization_id', project.organization_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.status === 'active') {
        organizationMembership = data;
      }
    }

    const { data: projectMembership } = await supabaseAdmin
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

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
