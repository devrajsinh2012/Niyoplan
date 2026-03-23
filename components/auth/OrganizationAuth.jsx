'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export function withOrganizationAuth(WrappedComponent, options = {}) {
  return function OrganizationAuthWrapper(props) {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [organizationStatus, setOrganizationStatus] = useState('checking');
    const [organization, setOrganization] = useState(null);
    const [userRole, setUserRole] = useState(null);

    const { requireAdmin = false } = options;

    const checkOrganizationMembership = useCallback(async () => {
      if (!profile?.id) {
        setOrganizationStatus('no-profile');
        return;
      }

      try {
        const { data: membership } = await supabase
          .from('organization_members')
          .select(`
            role,
            status,
            organizations:organization_id (
              id,
              name,
              slug,
              logo_url
            )
          `)
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(1)
          .single();

        if (!membership || !membership.organizations) {
          setOrganizationStatus('no-organization');
          return;
        }

        if (requireAdmin && membership.role !== 'admin') {
          setOrganizationStatus('no-admin-access');
          return;
        }

        setOrganization(membership.organizations);
        setUserRole(membership.role);
        setOrganizationStatus('authorized');
      } catch (error) {
        console.error('Organization check error:', error);
        setOrganizationStatus('no-organization');
      }
    }, [profile?.id, requireAdmin]);

    useEffect(() => {
      checkOrganizationMembership();
    }, [checkOrganizationMembership]);

    // Redirect unauthorized users
    useEffect(() => {
      if (organizationStatus === 'no-profile') {
        router.push('/login');
      } else if (organizationStatus === 'no-organization') {
        router.push('/onboarding');
      } else if (organizationStatus === 'no-admin-access') {
        router.push('/');
      }
    }, [organizationStatus, router]);

    // Show loading spinner while checking
    if (authLoading || organizationStatus === 'checking') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Checking access...</p>
          </div>
        </div>
      );
    }

    // Show access denied message for admin-only pages
    if (organizationStatus === 'no-admin-access') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You need admin permissions to access this page.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    // Only render the wrapped component if authorized
    if (organizationStatus === 'authorized') {
      return (
        <WrappedComponent
          {...props}
          organization={organization}
          userRole={userRole}
        />
      );
    }

    // Return null for other states (redirecting)
    return null;
  };
}

// Hook to get organization context
export function useOrganization() {
  const { profile } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrganization = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: membership } = await supabase
        .from('organization_members')
        .select(`
          role,
          status,
          organizations:organization_id (
            id,
            name,
            slug,
            logo_url,
            invite_code
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })
        .limit(1)
        .single();

      if (membership?.organizations) {
        setOrganization(membership.organizations);
        setUserRole(membership.role);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  return { organization, userRole, loading, reload: loadOrganization };
}