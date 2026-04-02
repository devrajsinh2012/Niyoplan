'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { apiFetch } from '@/lib/apiClient';
import NiyoplanLoader from '@/components/ui/NiyoplanLoader';

export default function OnboardingMiddleware({ children }) {
  const { user, loading: authLoading, initialLoading } = useAuth();
  const { activeOrganization, refreshOrganizations } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(null);
  const onboardingCacheRef = useRef({ userId: null, status: null });

  const publicPaths = [
    '/login',
    '/signup',
    '/register',
    '/forgot-password',
    '/reset-password'
  ];

  const onboardingPaths = [
    '/onboarding',
    '/onboarding/create',
    '/onboarding/join'
  ];

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isOnboardingPath = onboardingPaths.some((path) => pathname.startsWith(path));
  const isOnboardingLandingPath = pathname === '/onboarding' || pathname === '/onboarding/';
  const isAllowedPath = isPublicPath || isOnboardingPath;

  const checkOnboardingStatus = useCallback(async () => {
    if (isPublicPath && !user) {
      setChecking(false);
      return;
    }

    if (authLoading || initialLoading) {
      if (user && activeOrganization?.id) {
        setHasOrganization(true);
        setChecking(false);
        if (isOnboardingLandingPath) {
          router.replace('/');
        }
        return;
      }
      setChecking(true);
      return;
    }

    if (!user) {
      setHasOrganization(null);
      setChecking(false);
      if (!isPublicPath) {
        router.replace('/login');
      }
      return;
    }

    const userId = user.id;

    if (activeOrganization?.id) {
      onboardingCacheRef.current = { userId, status: true };
      setHasOrganization(true);
      setChecking(false);
      if (isOnboardingLandingPath) {
        router.replace('/');
      }
      return;
    }

    const cached = onboardingCacheRef.current;
    if (cached.userId === userId && cached.status !== null) {
      setHasOrganization(cached.status);
      setChecking(false);

      if (cached.status === true && isOnboardingLandingPath) {
        router.replace('/');
      }

      if (cached.status === false && !isAllowedPath) {
        router.replace('/onboarding');
      }

      return;
    }

    setChecking(true);

    try {
      const statusResponse = await apiFetch('/api/auth/onboarding-status');
      if (!statusResponse.ok) {
        throw new Error('Failed to resolve onboarding status');
      }

      const statusPayload = await statusResponse.json();

      if (statusPayload?.hasActiveOrganization) {
        onboardingCacheRef.current = { userId, status: true };
        setHasOrganization(true);
        if (isOnboardingLandingPath) {
          router.replace('/');
        }
      } else {
        let autoJoined = false;

        try {
          const autoJoinResponse = await apiFetch('/api/organizations/auto-join', {
            method: 'POST',
          });

          if (autoJoinResponse.ok) {
            const autoJoinPayload = await autoJoinResponse.json().catch(() => ({}));
            const joinedCount = Array.isArray(autoJoinPayload?.joinedOrganizationIds)
              ? autoJoinPayload.joinedOrganizationIds.length
              : 0;
            const activeCount = Array.isArray(autoJoinPayload?.activeOrganizationIds)
              ? autoJoinPayload.activeOrganizationIds.length
              : 0;

            if (joinedCount > 0 || activeCount > 0) {
              await refreshOrganizations();
              onboardingCacheRef.current = { userId, status: true };
              setHasOrganization(true);
              setChecking(false);
              autoJoined = true;

              if (isOnboardingPath || isPublicPath) {
                router.replace('/?inviteJoined=1');
              }
            }
          }
        } catch (autoJoinError) {
          console.error('Auto-join from invite failed:', autoJoinError);
        }

        if (autoJoined) {
          return;
        }

        if (statusPayload?.hasPendingOrganization) {
          // User has pending membership, show waiting screen
          onboardingCacheRef.current = { userId, status: 'pending' };
          setHasOrganization('pending');
        } else {
          // No organization at all, need onboarding
          onboardingCacheRef.current = { userId, status: false };
          setHasOrganization(false);
          if (!isAllowedPath) {
            router.replace('/onboarding');
          }
          return;
        }
      }
    } catch (error) {
      console.error('Onboarding check error:', error);
      // On error, assume no organization and redirect to onboarding
      setHasOrganization(false);
      if (!isAllowedPath) {
        router.replace('/onboarding');
      }
      return;
    }

    setChecking(false);
  }, [activeOrganization?.id, authLoading, initialLoading, isAllowedPath, isOnboardingLandingPath, isPublicPath, refreshOrganizations, router, user]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus, pathname]);

  // Show loading state while checking
  // Only show full loader if it's initial load or we don't have enough context
  const shouldShowLoader = (checking || authLoading || initialLoading) && (!user || (!activeOrganization?.id && hasOrganization !== true && hasOrganization !== 'pending'));

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
  if (hasOrganization === true || isAllowedPath || (user && activeOrganization?.id)) {
    return children;
  }

  // Return null or loader while initial setup is happening
  return shouldShowLoader ? <NiyoplanLoader /> : null;
}