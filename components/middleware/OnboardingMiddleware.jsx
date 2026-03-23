'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function OnboardingMiddleware({ children }) {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);

  // Pages that don't require onboarding
  const allowedPaths = [
    '/login',
    '/signup',
    '/onboarding',
    '/onboarding/create',
    '/onboarding/join'
  ];

  // Check if current path is allowed without onboarding
  const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));

  const checkOnboardingStatus = useCallback(async () => {
    // Don't check for allowed paths or during auth loading
    if (authLoading || isAllowedPath) {
      setChecking(false);
      return;
    }

    // If no profile and not on allowed path, redirect to login
    if (!profile?.id) {
      router.push('/login');
      return;
    }

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
          setHasOrganization('pending');
        } else {
          // No organization at all, need onboarding
          setHasOrganization(false);
          router.push('/onboarding');
          return;
        }
      }
    } catch (error) {
      console.error('Onboarding check error:', error);
      // On error, assume no organization and redirect to onboarding
      setHasOrganization(false);
      router.push('/onboarding');
      return;
    }

    setChecking(false);
  }, [authLoading, isAllowedPath, profile?.id, router]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus, pathname]);

  // Show loading state while checking
  if (checking || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
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

  // Render children if user has completed onboarding or is on allowed path
  if (hasOrganization === true || isAllowedPath) {
    return children;
  }

  // Return null while redirecting
  return null;
}