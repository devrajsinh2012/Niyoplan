'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Copy, Check, Users, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WelcomeModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    const welcome = searchParams.get('welcome');
    const orgId = searchParams.get('org');
    const code = searchParams.get('code');

    if (welcome === 'true' && orgId && code) {
      setIsOpen(true);
      setInviteCode(code);

      // Get organization name from localStorage or API
      const storedOrgName = localStorage.getItem('new-org-name');
      if (storedOrgName) {
        setOrganizationName(storedOrgName);
        localStorage.removeItem('new-org-name'); // Clean up
      } else {
        setOrganizationName('Your Company');
      }
    }
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    // Clean up URL parameters
    const url = new URL(window.location);
    url.searchParams.delete('welcome');
    url.searchParams.delete('org');
    url.searchParams.delete('code');
    router.replace(url.pathname + url.search);
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success('Invite code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInviteTeam = () => {
    router.push('/settings/company?tab=invite');
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 text-center">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2">
            Welcome to Niyoplan! 🎉
          </h2>
          <p className="text-blue-100">
            Your company <span className="font-semibold">{organizationName}</span> is ready!
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invite Code Section */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Invite Your Team
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Share this invite code with your team members to get everyone on board:
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono font-bold text-gray-900 tracking-wider">
                  {inviteCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">What is Next?</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <span>Create your first project</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <span>Invite team members with the code above</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <span>Start tracking issues and managing sprints</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-3">
          <button
            onClick={handleInviteTeam}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            Manage Team & Invites
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleClose}
            className="w-full text-gray-600 hover:text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            I will do this later
          </button>
        </div>
      </div>
    </div>
  );
}