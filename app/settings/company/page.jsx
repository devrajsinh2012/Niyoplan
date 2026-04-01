'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Key,
  AlertTriangle,
  Save,
  Copy,
  RefreshCw,
  Check,
  Loader2,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Portal from '@/components/modals/Portal';
import { CompanySettingsPageSkeleton } from '@/components/ui/PageSkeleton';
import { useOrganization } from '@/context/OrganizationContext';
import { apiFetch } from '@/lib/apiClient';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'pm', label: 'PM', description: 'Project management' },
  { value: 'qa', label: 'QA', description: 'Quality assurance' },
  { value: 'developer', label: 'Developer', description: 'Builds and ships product work' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' }
];

export default function CompanySettingsPage() {
  const router = useRouter();
  const { activeOrganization, refreshOrganizations } = useOrganization();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    industry: '',
    size: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
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

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  }, [router, activeOrganization?.id]);

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
      const response = await apiFetch(`/api/organizations/${organization.id}/regenerate-code`, {
        method: 'POST',
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
      const response = await apiFetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE',
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
    { id: 'invite', label: 'Invite Code', icon: Key },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
  ];

  const industries = ['Software', 'Marketing', 'Design', 'Finance', 'Education', 'Healthcare', 'Manufacturing', 'Other'];
  const sizes = ['1-10', '11-50', '51-200', '200+'];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600 mt-2">Manage your organization settings</p>
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

    </div>
  );
}
