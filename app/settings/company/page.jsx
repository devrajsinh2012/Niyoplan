'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  HardDrive,
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
import { useAuth } from '@/context/AuthContext';
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
  const { user: currentUser } = useAuth();
  const { activeOrganization, refreshOrganizations } = useOrganization();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [driveStatus, setDriveStatus] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showDriveDisconnectConfirm, setShowDriveDisconnectConfirm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    industry: '',
    size: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const loadDriveStatus = useCallback(async (orgId) => {
    if (!orgId) {
      setDriveStatus(null);
      return;
    }

    setDriveLoading(true);
    try {
      const response = await apiFetch(`/api/drive/status?orgId=${encodeURIComponent(orgId)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to fetch Drive status.');
      }

      const payload = await response.json();
      setDriveStatus(payload);
    } catch (error) {
      console.error('Drive status load failed:', error);
      setDriveStatus({ connected: false });
    } finally {
      setDriveLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!currentUser?.id) {
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

      await loadDriveStatus(activeOrganization.id);

      const membersResponse = await apiFetch(`/api/organizations/${activeOrganization.id}/members`);
      if (membersResponse.ok) {
        const members = await membersResponse.json().catch(() => []);
        const sentPending = Array.isArray(members)
          ? members.filter((member) => member.is_pending_invite)
          : [];
        setPendingInvites(sentPending);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  }, [router, activeOrganization?.id, currentUser?.id, loadDriveStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab !== 'invite' || pendingInvites.length === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [activeTab, pendingInvites.length, loadData]);

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

  const handleConnectDrive = async () => {
    if (!activeOrganization?.id || !organization?.name) {
      toast.error('Organization context is missing.');
      return;
    }

    toast.error('Google Drive connect is temporarily unavailable while OAuth integration is being updated.');
    return;

    setDriveBusy(true);
    try {
      const response = await apiFetch('/api/drive/connect', {
        method: 'POST',
        body: JSON.stringify({
          orgId: activeOrganization.id,
          orgName: organization.name,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to connect Google Drive.');
      }

      await loadDriveStatus(activeOrganization.id);
      toast.success('Google Drive connected successfully.');
    } catch (error) {
      console.error('Connect drive failed:', error);
      toast.error(error.message || 'Failed to connect Google Drive.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!activeOrganization?.id) {
      toast.error('Organization context is missing.');
      return;
    }

    setDriveBusy(true);
    try {
      const response = await apiFetch('/api/drive/disconnect', {
        method: 'POST',
        body: JSON.stringify({ orgId: activeOrganization.id }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to disconnect Google Drive.');
      }

      await loadDriveStatus(activeOrganization.id);
      toast.success('Google Drive disconnected.');
      setShowDriveDisconnectConfirm(false);
    } catch (error) {
      console.error('Disconnect drive failed:', error);
      toast.error(error.message || 'Failed to disconnect Google Drive.');
    } finally {
      setDriveBusy(false);
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

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <HardDrive className="h-4 w-4" />
                        Google Drive Storage
                      </h3>
                      <p className="mt-1 text-xs text-gray-600">
                        Connect your organization Drive so ticket and document attachments are stored in your own Google account.
                      </p>
                    </div>

                    {driveStatus?.connected ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Connected
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Not connected
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    {driveLoading ? (
                      <p className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking Drive status...</p>
                    ) : driveStatus?.connected ? (
                      <>
                        <p>Connected at: {driveStatus.connectedAt ? new Date(driveStatus.connectedAt).toLocaleString() : 'Unknown'}</p>
                        <p>Root path: Niyoplan/{organization.name}/</p>
                      </>
                    ) : (
                      <p>Drive is currently disconnected for this organization.</p>
                    )}
                  </div>

                  <div className="mt-4">
                    {driveStatus?.connected ? (
                      <button
                        type="button"
                        onClick={() => setShowDriveDisconnectConfirm(true)}
                        disabled={driveBusy}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {driveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Disconnect Google Drive
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectDrive}
                        disabled={driveBusy || driveLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {driveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Connect Google Drive
                      </button>
                    )}
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

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Pending Invites You Sent</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Invites are removed automatically when the user accepts.
                  </p>
                  {pendingInvites.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      No pending member invites right now.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingInvites.map((invite) => (
                        <div key={`company-pending-${invite.id}`} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{invite.email || 'Unknown email'}</p>
                            <p className="text-xs text-gray-600">Role: {invite.role}</p>
                          </div>
                          <p className="text-xs text-gray-600">
                            Sent {invite.invited_at ? new Date(invite.invited_at).toLocaleDateString() : 'recently'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
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
        isOpen={showDriveDisconnectConfirm}
        onClose={() => setShowDriveDisconnectConfirm(false)}
        onConfirm={handleDisconnectDrive}
        title="Disconnect Google Drive"
        message="This removes the Drive connection for this organization. Existing files remain in Drive but new uploads will be disabled."
        confirmLabel="Disconnect"
      />

    </div>
  );
}
