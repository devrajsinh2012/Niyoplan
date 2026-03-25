import { supabaseAdmin } from './supabaseServer';

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
 * Validates whether a user corresponds to a project, by checking if they are a member
 * of the organization that owns the project.
 * @param {string} projectId 
 * @param {string} userId 
 * @returns {Promise<{ hasAccess: boolean, error: string | null }>}
 */
export async function verifyProjectAccess(projectId, userId) {
  if (!projectId || !userId) return { hasAccess: false, error: 'Missing parameters' };

  try {
    // 1. Get the organization_id from the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { hasAccess: false, error: 'Project not found' };
    }

    // 2. Verify organization access
    return await verifyOrganizationAccess(project.organization_id, userId);
  } catch (err) {
    console.error('Project access verification failed:', err);
    return { hasAccess: false, error: 'Internal Server Error during access check' };
  }
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
