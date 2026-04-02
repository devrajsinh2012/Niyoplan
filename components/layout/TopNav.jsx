'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, Sun, Moon, LogOut, Settings, ChevronDown, Check, Building2, Plus, FolderKanban, ChevronRight, LayoutDashboard, Trash2 } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import toast from 'react-hot-toast';
import UserAvatar from '@/components/ui/UserAvatar';
import BrandMark from '@/components/ui/BrandMark';
import CreateProjectModal from '@/components/modals/CreateProjectModal';
import { apiFetch } from '@/lib/apiClient';

// Notification type badge component
function NotificationBadge({ type }) {
  const badges = {
    card_created: { label: 'New Task', className: 'bg-green-100 text-green-700' },
    card_updated: { label: 'Task Updated', className: 'bg-blue-100 text-blue-700' },
    card_deleted: { label: 'Task Deleted', className: 'bg-red-100 text-red-700' },
    task_completed: { label: 'Completed!', className: 'bg-emerald-100 text-emerald-700' },
    card_assigned: { label: 'Assigned', className: 'bg-purple-100 text-purple-700' },
    subtask_created: { label: 'New Subtask', className: 'bg-green-100 text-green-700' },
    subtask_completed: { label: 'Subtask Done', className: 'bg-emerald-100 text-emerald-700' },
    subtask_assigned: { label: 'Assigned', className: 'bg-purple-100 text-purple-700' },
    comment_added: { label: 'Comment', className: 'bg-amber-100 text-amber-700' },
    sprint_created: { label: 'New Sprint', className: 'bg-indigo-100 text-indigo-700' },
    sprint_updated: { label: 'Sprint Updated', className: 'bg-blue-100 text-blue-700' },
    sprint_deleted: { label: 'Sprint Deleted', className: 'bg-red-100 text-red-700' },
    goal_created: { label: 'New Goal', className: 'bg-teal-100 text-teal-700' },
    goal_updated: { label: 'Goal Updated', className: 'bg-cyan-100 text-cyan-700' },
    dependency_created: { label: 'New Dependency', className: 'bg-orange-100 text-orange-700' },
    dependency_updated: { label: 'Dependency Updated', className: 'bg-orange-100 text-orange-700' },
    dependency_deleted: { label: 'Dependency Deleted', className: 'bg-red-100 text-red-700' },
    dependency_resolved: { label: 'Dependency Fixed', className: 'bg-green-100 text-green-700' },
    meeting_action_item: { label: 'Action Item', className: 'bg-pink-100 text-pink-700' },
    meeting_action_converted: { label: 'Converted', className: 'bg-pink-100 text-pink-700' },
  };

  const badge = badges[type] || { label: (type || 'notification').replace(/_/g, ' '), className: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}>
      {badge.label}
    </span>
  );
}

// Notification message component with better formatting
function NotificationMessage({ notification }) {
  const { type, message, metadata } = notification;
  const cardRef = metadata?.card_custom_id || metadata?.card_title;

  // Build a contextual message based on notification type
  const getFormattedMessage = () => {
    if (message) {
      // If there's a message, format it nicely
      const formattedMessage = message
        .replace(/^(created|updated|deleted|assigned|completed|commented)\s+/i, '')
        .trim();
      return formattedMessage;
    }

    // Fallback messages based on type
    const fallbacks = {
      card_created: `created a new task${cardRef ? `: ${cardRef}` : ''}`,
      card_updated: `updated task${cardRef ? `: ${cardRef}` : ''}`,
      card_deleted: `deleted a task${cardRef ? `: ${cardRef}` : ''}`,
      task_completed: `completed task${cardRef ? `: ${cardRef}` : ''}`,
      card_assigned: `assigned you to${cardRef ? ` ${cardRef}` : ' a task'}`,
      subtask_created: `created a subtask${metadata?.subtask_title ? `: ${metadata.subtask_title}` : ''}`,
      subtask_completed: `completed subtask${metadata?.subtask_title ? `: ${metadata.subtask_title}` : ''}`,
      subtask_assigned: `assigned you to a subtask${metadata?.subtask_title ? `: ${metadata.subtask_title}` : ''}`,
      comment_added: `commented on${cardRef ? ` ${cardRef}` : ''}`,
      sprint_created: `created a new sprint`,
      sprint_updated: `updated a sprint`,
      sprint_deleted: `deleted a sprint`,
      goal_created: `created a new goal`,
      goal_updated: `updated a goal`,
      dependency_created: `added a new dependency`,
      dependency_resolved: `resolved a dependency`,
      meeting_action_item: `created an action item from meeting`,
      meeting_action_converted: `converted an action item into a card`,
    };

    return fallbacks[type] || type.replace(/_/g, ' ');
  };

  return (
    <p className="text-sm text-[var(--text-secondary)]">
      {getFormattedMessage()}
    </p>
  );
}

export default function TopNav({ theme, onToggleTheme, currentProject }) {
  const { profile, signOut } = useAuth();
  const { activeOrganization, userOrganizations, switchOrganization, loading: orgLoading } = useOrganization();
  const router = useRouter();
  const { projectId } = useParams();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [deletingAllNotifications, setDeletingAllNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [orgProjects, setOrgProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const orgRef = useRef(null);
  const projectRef = useRef(null);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (orgRef.current && !orgRef.current.contains(e.target)) {
        setOrgMenuOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(e.target)) {
        setProjectMenuOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch projects for the active org when the project menu opens
  const fetchOrgProjects = useCallback(async () => {
    if (!activeOrganization?.id) return;
    setLoadingProjects(true);
    try {
      const res = await apiFetch(`/api/projects?organizationId=${activeOrganization.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrgProjects(Array.isArray(data) ? data : (data.projects || []));
      }
    } catch (err) {
      console.error('Failed to fetch org projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, [activeOrganization?.id]);

  useEffect(() => {
    if (projectMenuOpen) fetchOrgProjects();
  }, [projectMenuOpen, fetchOrgProjects]);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingNotifications(true);
    try {
      // Fetch both global notifications and project-specific notifications
      const [globalRes, projectRes] = await Promise.all([
        apiFetch('/api/notifications'),
        projectId ? apiFetch(`/api/projects/${projectId}/notifications`) : Promise.resolve({ ok: false })
      ]);
      
      let allNotifications = [];
      
      if (globalRes.ok) {
        const globalData = await globalRes.json();
        if (Array.isArray(globalData)) {
          allNotifications = [...globalData];
        }
      }
      
      if (projectRes && projectRes.ok) {
        const projectData = await projectRes.json();
        if (Array.isArray(projectData)) {
          // Merge and deduplicate by notification ID
          const existingIds = new Set(allNotifications.map(n => n.id));
          const newNotifications = projectData.filter(n => !existingIds.has(n.id));
          allNotifications = [...allNotifications, ...newNotifications];
        }
      }
      
      // Sort by created_at descending
      allNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      // Limit to 50 notifications
      allNotifications = allNotifications.slice(0, 50);
      
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [profile?.id, projectId]);

  useEffect(() => {
    if (notificationsOpen) {
      fetchNotifications();
    }
  }, [notificationsOpen, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!profile?.id) return;
      await apiFetch('/api/notifications/mark-all-read', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const deleteAllNotifications = async () => {
    if (!notifications.length || deletingAllNotifications) return;

    try {
      setDeletingAllNotifications(true);
      const response = await apiFetch('/api/notifications', { method: 'DELETE' });
      if (!response.ok) {
        let errorMessage = 'Failed to delete all notifications';
        try {
          const payload = await response.json();
          errorMessage = payload?.error || errorMessage;
        } catch {
          // Ignore JSON parse failures and use fallback message.
        }
        throw new Error(errorMessage);
      }

      setNotifications([]);
      toast.success('All notifications deleted');
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      toast.error(error?.message || 'Failed to delete all notifications');
    } finally {
      setDeletingAllNotifications(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <header
      id="top-nav"
      className="sticky top-0 z-[100] flex h-[var(--topnav-height)] w-full shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-4"
    >
      {/* Logo */}
      <Link
        href="/"
        className="mr-2 inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md p-1 transition-transform hover:scale-105"
        title="NiyoPlan Home"
      >
        <BrandMark size={28} className="rounded-md" />
        <span className="hidden text-sm font-semibold tracking-wide text-[var(--text-heading)] sm:inline">Niyoplan</span>
      </Link>

      {/* Global Nav Links */}
      <nav className="flex items-center gap-1">
        {/* Org Switcher */}
        <div className="relative" ref={orgRef}>
          <button
            onClick={() => setOrgMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]"
            title="Organization menu"
          >
            <Building2 size={14} className="text-[var(--text-muted)]" />
            <span className="max-w-[160px] truncate">
              {orgLoading ? 'Loading org...' : (activeOrganization?.name || 'No company')}
            </span>
            <ChevronDown size={14} className="text-[var(--text-muted)]" />
          </button>

          {orgMenuOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-[220] w-[320px] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl">
              <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Organizations</div>
              </div>

              <div className="max-h-[280px] overflow-y-auto">
                {userOrganizations && userOrganizations.length > 0 ? (
                  userOrganizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setOrgMenuOpen(false);
                        router.push('/');
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-panel-hover)] ${activeOrganization?.id === org.id ? 'bg-[var(--accent-subtle)]' : ''}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{org.name}</div>
                        <div className="text-xs text-[var(--text-muted)] capitalize">{org.role}</div>
                      </div>
                      {activeOrganization?.id === org.id && <Check size={14} className="text-[var(--accent-primary)]" />}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-sm text-[var(--text-muted)] text-center">No organization selected</div>
                )}
              </div>

              <div className="border-t border-[var(--border-subtle)] p-2 space-y-1">
                <button
                  onClick={() => {
                    setOrgMenuOpen(false);
                    router.push('/onboarding/create');
                  }}
                  className="w-full inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]"
                >
                  <Plus size={14} /> New organization
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Project Switcher — only shown when inside a project */}
        {projectId && (
          <>
            <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </Link>
            <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />
            <div className="relative" ref={projectRef}>
              <button
                onClick={() => setProjectMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]"
                title="Project menu"
              >
                <span className="max-w-[160px] truncate">
                  {currentProject?.name || 'Project'}
                </span>
                <ChevronDown size={14} className="text-[var(--text-muted)]" />
              </button>

              {projectMenuOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-[220] w-[300px] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl">
                  <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Projects</div>
                  </div>

                  <div className="max-h-[280px] overflow-y-auto">
                    {loadingProjects ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-primary)]" />
                      </div>
                    ) : orgProjects.length > 0 ? (
                      orgProjects.map((proj) => (
                        <button
                          key={proj.id}
                          onClick={() => {
                            setProjectMenuOpen(false);
                            router.push(`/projects/${proj.id}`);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-panel-hover)] ${proj.id === projectId ? 'bg-[var(--accent-subtle)]' : ''}`}
                        >
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {proj.name}
                          </div>
                          {proj.id === projectId && <Check size={14} className="text-[var(--accent-primary)]" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-sm text-[var(--text-muted)] text-center">No projects found</div>
                    )}
                  </div>

                  <div className="border-t border-[var(--border-subtle)] p-2">
                    <button
                      onClick={() => {
                        setProjectMenuOpen(false);
                        setCreateModalOpen(true);
                      }}
                      className="w-full inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--accent-primary)] font-semibold hover:bg-[var(--bg-panel-hover)] transition-colors"
                    >
                      <Plus size={14} /> New Project
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search Bar */}
      <div className={`relative transition-all duration-300 ${searchFocused ? 'max-w-md w-full' : 'max-w-[200px] w-full'}`}>
        <Search
          size={14}
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors ${searchFocused ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}
        />
        <input
          id="global-search"
          type="text"
          placeholder="Search"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            const query = globalSearch.trim();
            if (!query) {
              toast('Type a project name or issue key first.');
              return;
            }
            router.push(`/projects?search=${encodeURIComponent(query)}`);
          }}
          className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] py-1.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--accent-primary)] focus:bg-[var(--bg-app)] focus:ring-1 focus:ring-[var(--accent-primary)]/20"
        />
      </div>

      {/* Right Icons */}
      <div className="ml-2 flex items-center gap-0.5">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-[3px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
            title="Notifications"
            onClick={() => setNotificationsOpen(o => !o)}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-[200] w-[360px] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--text-heading)]">Notifications</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      disabled={deletingAllNotifications}
                      className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingAllNotifications ? 'Deleting...' : 'Delete all'}
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-primary)]" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell size={32} className="mb-3 text-[var(--text-muted)]" />
                    <p className="text-sm font-medium text-[var(--text-secondary)]">No new notifications</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">You are all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-panel-hover)] ${!notification.is_read ? 'bg-[var(--accent-subtle)]' : ''}`}
                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                      >
                        <div className="shrink-0">
                          <UserAvatar
                            user={{ id: notification.actor_id, full_name: notification.actor_name }}
                            size={32}
                            className="shrink-0"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                              {notification.actor_name || 'Niyoplan'}
                            </span>
                            <NotificationBadge type={notification.type} />
                          </div>
                          <NotificationMessage notification={notification} />
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="mt-0.5 rounded p-1 text-[var(--text-muted)] opacity-0 transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-red-600 group-hover:opacity-100"
                          title="Delete notification"
                          aria-label="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                        {!notification.is_read && (
                          <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-[3px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
          title="Toggle theme"
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User avatar / dropdown */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            id="user-menu-trigger"
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-transparent transition-all hover:border-[var(--accent-primary)]"
          >
            <UserAvatar user={profile} size={28} />
          </button>

          {userMenuOpen && (
            <div
              className="animate-scale-in absolute right-0 top-[calc(100%+8px)] z-[200] min-w-[240px] overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg"
            >
              <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Account</div>
                <div className="mt-2 flex items-center gap-3">
                  <UserAvatar user={profile} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text-heading)]">
                      {profile?.full_name || 'User'}
                    </div>
                    <div className="truncate text-xs text-[var(--text-muted)]">
                      {profile?.email || ''}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-1">
                <Link
                  href="/settings/profile"
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[3px] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings size={14} />
                  Profile Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[3px] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
                >
                  <LogOut size={14} className="text-red-500" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        activeOrganization={activeOrganization}
        profile={profile}
        onProjectCreated={(project) => {
          fetchOrgProjects();
          router.push(`/projects/${project.id}`);
        }}
      />
    </header>
  );
}
