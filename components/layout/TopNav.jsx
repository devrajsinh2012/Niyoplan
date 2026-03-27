'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, Sun, Moon, LogOut, Settings, ChevronDown, Check, Building2, Plus } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import toast from 'react-hot-toast';
import UserAvatar from '@/components/ui/UserAvatar';
import BrandMark from '@/components/ui/BrandMark';

export default function TopNav({ theme, onToggleTheme }) {
  const { profile, signOut } = useAuth();
  const { activeOrganization, userOrganizations, switchOrganization, loading: orgLoading } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const orgRef = useRef(null);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (orgRef.current && !orgRef.current.contains(e.target)) {
        setOrgMenuOpen(false);
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

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingNotifications(true);
    try {
      const res = await fetch(`/api/notifications?userId=${profile.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (notificationsOpen) {
      fetchNotifications();
    }
  }, [notificationsOpen, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!profile?.id) return;
      await fetch(`/api/notifications/mark-all-read?userId=${profile.id}`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNavLinkClass = (href) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return `px-3 py-1 mr-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'text-[var(--accent-primary)] bg-[var(--accent-subtle)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]'
    }`;
  };

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
        <div className="relative mr-2" ref={orgRef}>
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
                    router.push('/onboarding');
                  }}
                  className="w-full inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]"
                >
                  <Plus size={14} /> New organization
                </button>
              </div>
            </div>
          )}
        </div>

        <Link href="/projects" className={getNavLinkClass('/projects')}>Projects</Link>
        <Link href="/" className={getNavLinkClass('/')}>Dashboard</Link>
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
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
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
                        className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-panel-hover)] ${!notification.is_read ? 'bg-[var(--accent-subtle)]' : ''}`}
                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                      >
                        <UserAvatar
                          user={{ id: notification.actor_id, full_name: notification.actor_name }}
                          size={32}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text-primary)]">
                            <span className="font-semibold">{notification.actor_name || 'Niyoplan'}</span>{' '}
                            {notification.message || notification.type}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
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
    </header>
  );
}
