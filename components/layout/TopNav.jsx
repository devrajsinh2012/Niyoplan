'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, HelpCircle, Sun, Moon, Plus, LogOut } from 'lucide-react';

export default function TopNav({ onCreateClick, theme, onToggleTheme }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const getNavLinkClass = (href) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return `px-3 py-1 mr-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'text-[var(--accent-primary)] bg-[var(--accent-subtle)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]'
    }`;
  };

  return (
    <header
      id="top-nav"
      className="sticky top-0 z-[100] flex h-[var(--topnav-height)] w-full shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-4"
    >
      {/* Logo */}
      <Link
        href="/"
        className="mr-2 shrink-0 cursor-pointer p-1 transition-transform hover:scale-105"
        title="NiyoPlan Home"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#0C66E4] to-[#0052CC] text-sm font-extrabold text-white shadow-sm">
          N
        </div>
      </Link>

      {/* Global Nav Links */}
      <nav className="flex items-center gap-1">
        <Link href="/projects" className={getNavLinkClass('/projects')}>Projects</Link>
        <Link href="/" className={getNavLinkClass('/')}>Dashboards</Link>
        {profile?.role === 'admin' && (
          <Link href="/admin" className={getNavLinkClass('/admin')}>Settings</Link>
        )}
      </nav>

      {/* Create Button (Signature Jira Blue) */}
      <button
        id="global-create-btn"
        onClick={onCreateClick}
        className="ml-2 flex min-w-fit items-center gap-1.5 rounded-[3px] bg-[#0052CC] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0065FF] active:bg-[#0747A6]"
      >
        <Plus size={16} strokeWidth={2.5} />
        Create
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search Bar (ADS Style) */}
      <div className={`relative transition-all duration-300 ${searchFocused ? 'max-w-md w-full' : 'max-w-[200px] w-full'}`}>
        <Search
          size={14}
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors ${searchFocused ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}
        />
        <input
          id="global-search"
          type="text"
          placeholder="Search"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] py-1.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--accent-primary)] focus:bg-[var(--bg-app)] focus:ring-1 focus:ring-[var(--accent-primary)]/20"
        />
      </div>

      {/* Right Icons */}
      <div className="ml-2 flex items-center gap-0.5">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-[3px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
          title="Notifications"
          onClick={() => {}}
        >
          <Bell size={18} />
        </button>

        <button
          className="flex h-8 w-8 items-center justify-center rounded-[3px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
          title="Toggle theme"
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="flex h-8 w-8 items-center justify-center rounded-[3px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] md:flex"
        >
          <HelpCircle size={18} />
        </button>

        {/* User avatar / dropdown */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            id="user-menu-trigger"
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-transparent transition-all hover:border-[var(--accent-primary)]"
            style={{
              background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #0C66E4, #6554C0)',
            }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="User" className="h-full w-full object-cover" />
              : <span className="text-[11px] font-bold text-white">{initials}</span>
            }
          </button>

          {userMenuOpen && (
            <div
              className="animate-scale-in absolute right-0 top-[calc(100%+8px)] z-[200] min-w-[240px] overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg"
            >
              <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Account</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#0C66E4] to-[#6554C0] flex items-center justify-center text-white font-bold">
                    {initials}
                  </div>
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
