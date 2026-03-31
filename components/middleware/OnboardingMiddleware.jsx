'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { supabase } from '@/lib/supabase';
import NiyoplanLoader from '@/components/ui/NiyoplanLoader';

export default function OnboardingMiddleware({ children }) {
  const { user, profile, loading: authLoading, initialLoading } = useAuth();
  const { activeOrganization } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(null);
  const onboardingCacheRef = useRef({ userId: null, status: null });

  // Pages that don't require onboarding
  const allowedPaths = [
    '/login',
    '/signup',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/onboarding',
    '/onboarding/create',
    '/onboarding/join'
  ];

  // Check if current path is allowed without onboarding
  const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));

  const checkOnboardingStatus = useCallback(async () => {
    // Public pages bypass organization checks.
    if (isAllowedPath) {
      setChecking(false);
      return;
    }

    if (authLoading || initialLoading) {
      // If we already have a user and profile, don't show full page loader just because auth is revalidating in background
      if (user && profile && activeOrganization?.id) {
        setChecking(false);
        return;
      }
      setChecking(true);
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    // Wait until the profile is available for authenticated users.
    if (!profile?.id) {
      setChecking(true);
      return;
    }

    if (activeOrganization?.id) {
      onboardingCacheRef.current = { userId: profile.id, status: true };
      setHasOrganization(true);
      setChecking(false);
      return;
    }

    const cached = onboardingCacheRef.current;
    if (cached.userId === profile.id && cached.status !== null) {
      setHasOrganization(cached.status);
      setChecking(false);

      if (cached.status === false) {
        router.replace('/onboarding');
      }

      return;
    }

    setChecking(true);

    try {
      // Check if user has an active organization membership
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id, status')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (membership) {
        onboardingCacheRef.current = { userId: profile.id, status: true };
        setHasOrganization(true);
      } else {
        // Check if user has any pending memberships
        const { data: pendingMembership } = await supabase
          .from('organization_members')
          .select('id, status')
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .limit(1)
          .single();

        if (pendingMembership) {
          // User has pending membership, show waiting screen
          onboardingCacheRef.current = { userId: profile.id, status: 'pending' };
          setHasOrganization('pending');
        } else {
          // No organization at all, need onboarding
          onboardingCacheRef.current = { userId: profile.id, status: false };
          setHasOrganization(false);
          router.replace('/onboarding');
          return;
        }
      }
    } catch (error) {
      console.error('Onboarding check error:', error);
      // On error, assume no organization and redirect to onboarding
      setHasOrganization(false);
      router.replace('/onboarding');
      return;
    }

    setChecking(false);
  }, [activeOrganization?.id, authLoading, initialLoading, isAllowedPath, profile?.id, router, user, pathname]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus, pathname]);

  // Show loading state while checking
  // Only show full loader if it's initial load or we don't have enough context
  const shouldShowLoader = (checking || authLoading || initialLoading) && (!user || !profile || !activeOrganization?.id);

  if (shouldShowLoader && !isAllowedPath) {
    return <NiyoplanLoader />;
  }

  // Show pending state if user has pending membership
  if (hasOrganization === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Waiting for Approval
          </h1>
          <p className="text-gray-600 mb-6">
            Your request to join a company is pending. You will get access once an admin approves your request.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              We will notify you via email when your request is approved.
            </p>
          </div>

          <button
            onClick={() => router.push('/onboarding')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Back to Onboarding
          </button>
        </div>
      </div>
    );
  }

  // Render children if user has completed onboarding, is on allowed path, or we have enough context to continue
  if (hasOrganization === true || isAllowedPath || (user && profile && activeOrganization?.id)) {
    return children;
  }

  // Return null or loader while initial setup is happening
  return shouldShowLoader ? <NiyoplanLoader /> : null;
}