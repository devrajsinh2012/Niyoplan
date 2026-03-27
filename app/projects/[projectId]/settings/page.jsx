'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  Settings, Users, Calendar, AlertTriangle, Trash2, Plus, X, Archive, Mail, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ProjectSettingsPageSkeleton } from '@/components/ui/PageSkeleton';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'sprints', label: 'Sprints', icon: Calendar },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

export default function ProjectSettingsPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // General Settings
  const [name, setName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [projectType, setProjectType] = useState('software');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  // Members
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  // Sprints
  const [sprintDuration, setSprintDuration] = useState('2');
  const [sprintNaming, setSprintNaming] = useState('Sprint {n}');

  // Danger Zone
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null);

  const fetchProjectData = useCallback(async () => {
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      setProject(projectData);
      setName(projectData.name || '');
      setProjectKey(projectData.prefix || '');
      setProjectType(projectData.type || 'software');
      setDescription(projectData.description || '');
      setStatus(projectData.status || 'active');
      setSprintDuration(projectData.sprint_duration || '2');
      setSprintNaming(projectData.sprint_naming || 'Sprint {n}');

      // Fetch project members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*, profile:profiles(id, full_name, email, avatar_url)')
        .eq('project_id', projectId);

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project settings');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleSaveGeneral = async () => {
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          prefix: projectKey.trim(),
          type: projectType,
          description: description.trim(),
          status,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update project');
      }

      toast.success('Project updated successfully');
      fetchProjectData();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(error.message || 'Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSprints = async () => {
    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sprint_duration: sprintDuration,
          sprint_naming: sprintNaming,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update sprint settings');
      }

      toast.success('Sprint settings updated');
    } catch (error) {
      console.error('Error updating sprint settings:', error);
      toast.error(error.message || 'Failed to update sprint settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsSaving(true);
    try {
      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.trim())
        .single();

      if (userError || !userData) {
        toast.error('User not found');
        setIsSaving(false);
        return;
      }

      // Check if user is in the organization
      if (project?.organization_id) {
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', project.organization_id)
          .eq('user_id', userData.id)
          .eq('status', 'active')
          .single();

        if (!orgMember) {
          toast.error('User must be an active member of your workspace/organization to be invited to this project.');
          setIsSaving(false);
          return;
        }
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userData.id)
        .single();

      if (existingMember) {
        toast.error('User is already a member');
        setIsSaving(false);
        return;
      }

      // Add member
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userData.id,
          role: inviteRole,
        });

      if (insertError) throw insertError;

      toast.success('Member invited successfully');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      fetchProjectData();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed');
      fetchProjectData();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Role updated');
      fetchProjectData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleArchiveProject = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Project archived');
      router.push('/projects');
    } catch (error) {
      console.error('Error archiving project:', error);
      toast.error('Failed to archive project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmName !== name) {
      toast.error('Project name does not match');
      return;
    }

    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete project');
      }

      toast.success('Project deleted');
      router.push('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(error.message || 'Failed to delete project');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <ProjectSettingsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="mb-4 text-sm text-blue-600 hover:underline"
          >
            ← Back to project
          </button>
          <h1 className="text-3xl font-bold text-[var(--text-heading)]">Project Settings</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {project?.name}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-[var(--border-subtle)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
              <h2 className="mb-6 text-xl font-semibold text-[var(--text-heading)]">General Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    Project Key
                  </label>
                  <input
                    type="text"
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm font-mono uppercase text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., TEST01"
                    maxLength={10}
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Used as prefix for issue IDs (e.g., {projectKey || 'KEY'}-123)
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    Project Type
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="software">Software Project</option>
                    <option value="marketing">Marketing</option>
                    <option value="design">Design</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Describe your project"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    Project Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveGeneral}
                    disabled={isSaving}
                    className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          {activeTab === 'members' && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-heading)]">Members</h2>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Invite Member
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-left">
                      <th className="pb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Member
                      </th>
                      <th className="pb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Role
                      </th>
                      <th className="pb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Joined
                      </th>
                      <th className="pb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b border-[var(--border-subtle)]">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={member.profile} size={32} />
                            <div>
                              <div className="text-sm font-medium text-[var(--text-primary)]">
                                {member.profile?.full_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {member.profile?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className="rounded-md border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td className="py-4 text-sm text-[var(--text-secondary)]">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => setMemberToRemove(member)}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sprints */}
          {activeTab === 'sprints' && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
              <h2 className="mb-6 text-xl font-semibold text-[var(--text-heading)]">Sprint Configuration</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    Default Sprint Duration
                  </label>
                  <select
                    value={sprintDuration}
                    onChange={(e) => setSprintDuration(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="1">1 week</option>
                    <option value="2">2 weeks</option>
                    <option value="3">3 weeks</option>
                    <option value="4">4 weeks</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                    Sprint Naming Convention
                  </label>
                  <input
                    type="text"
                    value={sprintNaming}
                    onChange={(e) => setSprintNaming(e.target.value)}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., Sprint {n}"
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Use {'{n}'} as placeholder for sprint number
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveSprints}
                    disabled={isSaving}
                    className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              {/* Archive Project */}
              <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
                <div className="flex items-start gap-3">
                  <Archive className="mt-0.5 text-yellow-600" size={20} />
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold text-yellow-900">Archive Project</h3>
                    <p className="mb-4 text-sm text-yellow-700">
                      Archive this project to hide it from your active projects. You can restore it later.
                    </p>
                    <button
                      onClick={() => setShowArchiveModal(true)}
                      className="rounded-md border-2 border-yellow-600 bg-white px-6 py-2 text-sm font-semibold text-yellow-600 transition-colors hover:bg-yellow-600 hover:text-white"
                    >
                      Archive Project
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Project */}
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 text-red-600" size={20} />
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold text-red-900">Delete Project</h3>
                    <p className="mb-4 text-sm text-red-700">
                      Once you delete this project, there is no going back. This will permanently delete all issues, sprints, goals, and documents.
                    </p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="rounded-md border-2 border-red-600 bg-white px-6 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white"
                    >
                      Delete Project
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Invite Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="member@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="admin">Admin - Full access</option>
                  <option value="member">Member - Can create and edit</option>
                  <option value="viewer">Viewer - Read only</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                disabled={isSaving}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Inviting...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <Archive className="text-yellow-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Archive Project</h3>
            </div>

            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to archive <span className="font-bold">{project?.name}</span>? You can restore it later from archived projects.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveProject}
                disabled={isSaving}
                className="flex-1 rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
              >
                {isSaving ? 'Archiving...' : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={async () => {
          if (!memberToRemove) return;
          await handleRemoveMember(memberToRemove.id);
          setMemberToRemove(null);
        }}
        title="Remove Project Member"
        message={`Remove ${memberToRemove?.profile?.full_name || 'this member'} from the project?`}
        confirmLabel="Remove"
        destructive
      />

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Project</h3>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              This action cannot be undone. This will permanently delete <span className="font-bold">{project?.name}</span> and all associated data.
            </p>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Type <span className="font-bold">{project?.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder={project?.name}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmName('');
                }}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteConfirmName !== project?.name || isSaving}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
