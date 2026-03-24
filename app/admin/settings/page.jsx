'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, ChevronDown, Trash2, Mail, CheckCircle2, XCircle, Clock, Search,
  MoreHorizontal, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/ui/UserAvatar';
import InputModal from '@/components/ui/InputModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import BrandMark from '@/components/ui/BrandMark';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'pm', label: 'PM', description: 'Project management' },
  { value: 'member', label: 'Member', description: 'Team member' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' }
];

const getRoleColor = (role) => {
  const colors = {
    admin: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    pm: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    member: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    viewer: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  };
  return colors[role] || colors.member;
};

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInvitingSending, setIsInvitingSending] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Check if current user is admin
  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-4xl animate-fade-in p-6 text-primary">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 gap-3 flex items-start">
          <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-yellow-900">Access Denied</h3>
            <p className="text-sm text-yellow-700 mt-1">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) throw new Error('Failed to update role');
      
      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      setShowRoleDropdown(null);
      toast.success(`User role updated to ${newRole}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete user');
      
      setUsers(users.filter(u => u.id !== userId));
      setShowDeleteConfirm(null);
      toast.success('User removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove user');
    }
  };

  const handleSendInvites = async (e) => {
    e.preventDefault();
    if (!inviteEmails.trim()) {
      toast.error('Please enter at least one email');
      return;
    }

    setIsInvitingSending(true);
    try {
      const emails = inviteEmails
        .split(/[\n,;]/)
        .map(e => e.trim())
        .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

      if (emails.length === 0) {
        toast.error('No valid emails provided');
        setIsInvitingSending(false);
        return;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, role: inviteRole })
      });

      if (!res.ok) throw new Error('Failed to send invitations');
      
      toast.success(`Invitations sent to ${emails.length} users`);
      setInviteEmails('');
      setShowInviteModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to send invitations');
    } finally {
      setIsInvitingSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Page Header */}
      <header className="border-b border-[var(--border-subtle)] bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-4">
            <BrandMark size={40} />
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-heading)]">Admin Settings</h1>
              <p className="text-sm text-[var(--text-secondary)]">Manage users, roles, and permissions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-[var(--border-subtle)]">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-1 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-[#0052CC] text-[#0052CC]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Users & Roles
            </button>
            <button
              onClick={() => setActiveTab('invites')}
              className={`px-1 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'invites'
                  ? 'border-[#0052CC] text-[#0052CC]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Pending Invites {pendingApprovals.length > 0 && <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-orange-100 text-orange-700 rounded-full">{pendingApprovals.length}</span>}
            </button>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Toolbar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={16} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-white text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 rounded-lg bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003D99] transition-colors whitespace-nowrap"
              >
                <Plus size={16} />
                Invite Users
              </button>
            </div>

            {/* Users Table */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-white overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center text-[var(--text-muted)]">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-[var(--text-muted)]">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredUsers.map((user) => {
                        const roleInfo = ROLE_OPTIONS.find(r => r.value === user.role);
                        const roleColor = getRoleColor(user.role);
                        const isCurrentUser = user.id === profile?.id;

                        return (
                          <tr key={user.id} className="hover:bg-[var(--bg-panel-hover)] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <UserAvatar user={user} size={32} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-[var(--text-muted)]">{user.email || 'No email'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative">
                                <button
                                  onClick={() => setShowRoleDropdown(showRoleDropdown === user.id ? null : user.id)}
                                  className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 ${roleColor.bg} ${roleColor.text} ${roleColor.border} hover:opacity-80`}
                                >
                                  {roleInfo?.label || user.role}
                                  <ChevronDown size={14} />
                                </button>

                                {/* Role Dropdown Menu */}
                                {showRoleDropdown === user.id && (
                                  <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-[var(--border-subtle)] rounded-lg shadow-lg p-2 min-w-[200px]">
                                    {ROLE_OPTIONS.map((roleOption) => (
                                      <button
                                        key={roleOption.value}
                                        onClick={() => handleRoleUpdate(user.id, roleOption.value)}
                                        className={`w-full text-left px-4 py-2.5 text-sm rounded hover:bg-[var(--bg-panel)] transition-colors ${
                                          user.role === roleOption.value ? 'font-semibold bg-blue-50 text-blue-700' : 'text-[var(--text-primary)]'
                                        }`}
                                      >
                                        <div className="font-medium">{roleOption.label}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{roleOption.description}</div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isCurrentUser && (
                                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">You</span>
                                )}
                                {!isCurrentUser && (
                                  <button
                                    onClick={() => setShowDeleteConfirm(user.id)}
                                    className="p-2 rounded hover:bg-red-50 text-red-600 transition-colors"
                                    title="Remove user"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { label: 'Admins', count: users.filter(u => u.role === 'admin').length },
                { label: 'PMs', count: users.filter(u => u.role === 'pm').length },
                { label: 'Members', count: users.filter(u => u.role === 'member').length },
                { label: 'Viewers', count: users.filter(u => u.role === 'viewer').length }
              ].map((stat, idx) => (
                <div key={idx} className="rounded-lg border border-[var(--border-subtle)] bg-white p-4">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">{stat.label}</p>
                  <p className="text-2xl font-bold text-[var(--text-heading)] mt-2">{stat.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <div>
            {pendingApprovals.length === 0 ? (
              <div className="rounded-lg border border-[var(--border-subtle)] bg-white p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Pending Approvals</h3>
                <p className="text-[var(--text-muted)]">All user invitations have been processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <div key={approval.id} className="rounded-lg border border-[var(--border-subtle)] bg-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Clock className="text-amber-500" size={20} />
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{approval.email}</p>
                        <p className="text-sm text-[var(--text-muted)]">Invited on {new Date(approval.invited_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium bg-amber-100 text-amber-700 px-3 py-1 rounded">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Mail size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-[var(--text-heading)]">Invite Users</h2>
            </div>

            <form onSubmit={handleSendInvites} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Email Addresses
                </label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="user1@example.com&#10;user2@example.com&#10;&#10;One email per line, separated by comma or semicolon"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Assign Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInvitingSending}
                  className="flex-1 rounded-lg bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003D99] disabled:opacity-50 transition-colors"
                >
                  {isInvitingSending ? 'Sending...' : 'Send Invites'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Remove User"
          message="Are you sure you want to remove this user? This action cannot be undone."
          onConfirm={() => handleDeleteUser(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
          type="danger"
        />
      )}
    </div>
  );
}
