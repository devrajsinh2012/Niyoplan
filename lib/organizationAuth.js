import { supabaseAdmin } from './supabaseServer';

/**
 * Check if user is admin of an organization
 */
export async function isOrgAdmin(userId, organizationId) {
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role, status')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();

  return membership?.role === 'admin';
}

/**
 * Get user's active organization membership
 */
export async function getUserOrganization(userId) {
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select(`
      role,
      status,
      organization_id,
      organizations:organization_id (
        id,
        name,
        slug,
        logo_url,
        invite_code
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1)
    .single();

  if (!membership || !membership.organizations) {
    return null;
  }

  return {
    ...membership.organizations,
    userRole: membership.role
  };
}

/**
 * Check if user has completed onboarding (has an active organization)
 */
export async function hasCompletedOnboarding(userId) {
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  return !!membership;
}

/**
 * Require organization membership middleware
 */
export async function requireOrgMembership(userId, checkAdmin = false) {
  const org = await getUserOrganization(userId);

  if (!org) {
    return {
      error: 'No active organization membership',
      redirect: '/onboarding'
    };
  }

  if (checkAdmin && org.userRole !== 'admin') {
    return {
      error: 'Admin access required',
      redirect: '/'
    };
  }

  return { organization: org };
}
