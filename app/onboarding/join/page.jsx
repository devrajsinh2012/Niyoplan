'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Link as LinkIcon, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function JoinCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState(null); // null, 'pending', 'success'
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanCode = inviteCode.trim().toUpperCase();

    if (!cleanCode) {
      toast.error('Please enter an invite code');
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error('You must be logged in to join a company');
        router.push('/login');
        return;
      }

      // Look up organization by invite code
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('invite_code', cleanCode)
        .single();

      if (orgError || !org) {
        toast.error('Invalid invite code. Please check and try again.');
        setLoading(false);
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', org.id)
        .single();

      if (existingMember) {
        if (existingMember.status === 'active') {
          toast.error('You are already a member of this company');
          router.push('/');
          return;
        } else if (existingMember.status === 'pending') {
          toast.error('Your request to join this company is already pending');
          setStatus('pending');
          setCompanyName(org.name);
          setLoading(false);
          return;
        }
      }

      // Create membership request with pending status
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'member',
          status: 'pending'
        });

      if (memberError) {
        toast.error('Failed to send join request: ' + memberError.message);
        setLoading(false);
        return;
      }

      // Get user profile for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Get all admins of the organization
      const { data: admins } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id)
        .eq('role', 'admin')
        .eq('status', 'active');

      // Send notification to all admins
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.user_id,
          type: 'member_request',
          title: 'New join request',
          message: `${profile?.full_name || user.email} has requested to join ${org.name}`,
          metadata: {
            organization_id: org.id,
            requesting_user_id: user.id,
            requesting_user_name: profile?.full_name || user.email
          }
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }

      setStatus('pending');
      setCompanyName(org.name);
      toast.success('Join request sent successfully!');

    } catch (error) {
      console.error('Error joining company:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Success/Pending state view
  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Request Sent!
            </h1>
            <p className="text-gray-600 mb-6">
              Your request to join <span className="font-semibold">{companyName}</span> has been sent.
              You will get access once an admin approves your request.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                We will notify you via email when your request is approved.
              </p>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form view
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
              <LinkIcon className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Join a company</h1>
              <p className="text-gray-600 mt-1">Enter your invite code to get started</p>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Need an invite code?</span> Ask your company admin for a code.
              It looks like this: <code className="bg-white px-2 py-1 rounded text-purple-600 font-mono">NYP-ABC123</code>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                Invite Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-lg tracking-wider text-center"
                placeholder="NYP-XXXXXX"
                maxLength={10}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying code...
                </>
              ) : (
                'Request to Join'
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Do not have a code?{' '}
              <button
                onClick={() => router.push('/onboarding/create')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Create your own company instead
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
