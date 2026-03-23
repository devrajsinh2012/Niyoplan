'use client';

import { useRouter } from 'next/navigation';
import { Building2, Link as LinkIcon } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();

  const handleCreateCompany = () => {
    router.push('/onboarding/create');
  };

  const handleJoinCompany = () => {
    router.push('/onboarding/join');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to Niyoplan 👋
          </h1>
          <p className="text-lg text-gray-600">
            Let us get you started with your workspace
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Company Card */}
          <button
            onClick={handleCreateCompany}
            className="group relative bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all duration-200 text-left"
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors duration-200">
                <Building2 className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-200" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Create a new company
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Start fresh with your team. Set up your workspace, invite members, and begin managing your projects.
            </p>

            <div className="mt-6 flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform duration-200">
              Get Started
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Join Company Card */}
          <button
            onClick={handleJoinCompany}
            className="group relative bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-purple-500 hover:shadow-xl transition-all duration-200 text-left"
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors duration-200">
                <LinkIcon className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors duration-200" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Join an existing company
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Enter an invite code from your admin to join your team workspace and start collaborating.
            </p>

            <div className="mt-6 flex items-center text-purple-600 font-medium group-hover:translate-x-2 transition-transform duration-200">
              Join Now
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          You can always switch or join additional workspaces later
        </div>
      </div>
    </div>
  );
}
