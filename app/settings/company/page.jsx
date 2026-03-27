'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Key,
  AlertTriangle,
  Save,
  Copy,
  RefreshCw,
  Check,
  X,
  Loader2,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { CompanySettingsPageSkeleton } from '@/components/ui/PageSkeleton';
import { useOrganization } from '@/context/OrganizationContext';

export default function CompanySettingsPage() {
  const router = useRouter();
  const { activeOrganization, refreshOrganizations } = useOrganization();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    industry: '',
    size: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const loadMembers = useCallback(async (orgId) => {
    const { data: allMembers } = await supabase
      .from('organization_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        user_id,
        profiles:user_id (
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: false });

    if (allMembers) {
      const membersWithEmail = allMembers.map((member) => ({
        ...member,
        email: member.profiles?.email || 'Unknown'
      }));

      setPendingMembers(membersWithEmail.filter(m => m.status === 'pending'));
      setMembers(membersWithEmail.filter(m => m.status === 'active'));
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      if (!activeOrganization?.id) {
        toast.error('No active company selected.');
        router.push('/projects');
        return;
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, role, status')
        .eq('user_id', currentUser.id)
        .eq('organization_id', activeOrganization.id)
        .eq('status', 'active')
        .single();

      if (!membership || membership.role !== 'admin') {
        toast.error("You don't have permission to access this page");
        router.push('/');
        return;
      }

      // Get organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', activeOrganization.id)
        .single();

      if (org) {
        setOrganization(org);
        setFormData({
          name: org.name,
          slug: org.slug,
          industry: org.industry || '',
          size: org.size || ''
        });
      }

      // Load members
      await loadMembers(activeOrganization.id);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  }, [loadMembers, router, activeOrganization?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveGeneral = async () => {
    if (!organization) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          slug: formData.slug,
          industry: formData.industry,
          size: formData.size,
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('This slug is already taken');
        } else {
          toast.error('Failed to update organization');
        }
      } else {
        toast.success('Organization updated successfully');
        await refreshOrganizations();
        await loadData();
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleMemberAction = async (memberId, action, newRole = null) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ memberId, action, newRole })
      });

      if (response.ok) {
        toast.success(`Member ${action} successfully`);
        await loadMembers(organization.id);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing member action:', error);
      toast.error('An error occurred');
    }
  };

  const handleCopyCode = () => {
    if (organization) {
      navigator.clipboard.writeText(organization.invite_code);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!organization) return;

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(`/api/organizations/${organization.id}/regenerate-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const { inviteCode } = await response.json();
        setOrganization({ ...organization, invite_code: inviteCode });
        await refreshOrganizations();
        toast.success('New invite code generated');
        setShowRegenerateConfirm(false);
      } else {
        toast.error('Failed to regenerate code');
      }
    } catch (error) {
      console.error('Error regenerating code:', error);
      toast.error('An error occurred');
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization) return;

    if (deleteConfirm !== organization.name) {
      toast.error('Please type the organization name correctly');
      return;
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Organization deleted');
        router.push('/onboarding');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete organization');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('An error occurred');
    }
  };

  if (loading) {
    return <CompanySettingsPageSkeleton />;
  }

  if (!organization) {
    return null;
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'invite', label: 'Invite Code', icon: Key },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
  ];

  const industries = ['Software', 'Marketing', 'Design', 'Finance', 'Education', 'Healthcare', 'Manufacturing', 'Other'];
  const sizes = ['1-10', '11-50', '51-200', '200+'];
  const activeMemberCount = members.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600 mt-2">Manage your organization and team members</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                    {tab.id === 'members' && pendingMembers.length > 0 && (
                      <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {pendingMembers.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-8">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">niyoplan.app/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      pattern="[a-z0-9-]+"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select industry</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Size
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select size</option>
                    {sizes.map(size => (
                      <option key={size} value={size}>{size} people</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Pending Requests */}
                {pendingMembers.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      {pendingMembers.length} pending join request{pendingMembers.length > 1 ? 's' : ''}
                    </h3>
                    <div className="space-y-3">
                      {pendingMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.profiles?.full_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-600">{member.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMemberAction(member.id, 'approve')}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleMemberAction(member.id, 'reject')}
                              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Members */}
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">Active Members</h3>
                    <span className="text-sm font-medium text-gray-500">
                      {activeMemberCount} member{activeMemberCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {activeMemberCount === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center">
                              <p className="text-sm font-medium text-gray-900">0 members</p>
                              <p className="mt-1 text-sm text-gray-500">
                                Invite teammates with your company invite code to see them here.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          members.map(member => (
                            <tr key={member.id}>
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {member.profiles?.full_name || member.email || 'Unknown'}
                                  </p>
                                  <p className="text-sm text-gray-500">{member.email || 'No email available'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleMemberAction(member.id, 'changeRole', e.target.value)}
                                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                  disabled={member.user_id === user?.id}
                                >
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Not available'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {member.user_id !== user?.id && (
                                  <button
                                    onClick={() => setMemberToRemove(member)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Invite Code Tab */}
            {activeTab === 'invite' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Current Invite Code</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Share this code with team members to invite them to your organization
                  </p>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-xl font-mono text-center tracking-wider">
                      {organization.invite_code}
                    </code>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Regenerate Code</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate a new invite code. This will invalidate the old code.
                  </p>
                  <button
                    onClick={() => setShowRegenerateConfirm(true)}
                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Code
                  </button>
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div className="space-y-6 max-w-2xl">
                <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Delete Organization
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    This action cannot be undone. This will permanently delete the organization,
                    all projects, issues, and associated data.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-red-900 mb-2">
                        Type <span className="font-mono font-bold">{organization.name}</span> to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleDeleteOrganization}
                      disabled={deleteConfirm !== organization.name}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Organization Permanently
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleRegenerateCode}
        title="Regenerate Invite Code"
        message="This will invalidate the old invite code immediately. Continue?"
        confirmLabel="Regenerate"
      />

      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={async () => {
          if (!memberToRemove) return;
          await handleMemberAction(memberToRemove.id, 'remove');
          setMemberToRemove(null);
        }}
        title="Remove Member"
        message={`Remove ${memberToRemove?.profiles?.full_name || 'this member'} from the company? They will lose access immediately.`}
        confirmLabel="Remove"
        destructive
      />
    </div>
  );
}
