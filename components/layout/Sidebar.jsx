'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import {
  ChevronDown, ChevronRight,
  LayoutDashboard, Layers, KanbanSquare,
  BarChart2, Tag, Keyboard,
  Settings, BookOpen, Target,
  Zap, MessageSquare, Calendar, LogOut, Building2, Sun, Wrench
} from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';

const NavSection = ({ title, children, expanded }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex w-full cursor-pointer items-center justify-between rounded-[3px] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-panel-hover)] ${!expanded ? 'justify-center' : ''}`}
      >
        {expanded && <span>{title}</span>}
        {expanded && (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
};

const SideNavItem = ({ href, icon: Icon, label, isActive, expanded }) => {
  const pathname = usePathname();
  const active = isActive ?? (pathname === href || (href !== '/' && pathname.startsWith(href)));
  const activeStyle = active
    ? {
        background: 'var(--bg-panel-hover)',
        border: '1px solid var(--border-subtle)',
      }
    : undefined;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg mx-2 transition-all duration-200 ${
        expanded ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center'
      } ${
        active
          ? 'text-blue-600 font-semibold'
          : 'border border-transparent text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]'
      }`}
      style={activeStyle}
      title={!expanded ? label : undefined}
    >
      {Icon && <Icon size={18} className="shrink-0" />}
      {expanded && <span className="truncate text-sm font-medium">{label}</span>}
    </Link>
  );
};

export default function Sidebar({ project, expanded, onExpandedChange }) {
  const { profile, signOut } = useAuth();
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const { projectId: paramsId } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = paramsId || project?.id;
  const activeTab = searchParams.get('tab') || 'list';
  const organization = activeOrganization;
  const userRole = activeOrganization?.role;

  const projectTabHref = (tab) => `/projects/${projectId}?tab=${tab}`;
  const onProjectPage = pathname === `/projects/${projectId}`;

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <aside
      id="project-sidebar"
      onMouseEnter={() => onExpandedChange?.(true)}
      onMouseLeave={() => onExpandedChange?.(false)}
      className={`fixed left-0 top-[var(--topnav-height)] h-[calc(100vh-var(--topnav-height))] z-40 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] transition-all duration-200 ${expanded ? 'w-60' : 'w-16'}`}
    >

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        <div className="space-y-1">
          <SideNavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" expanded={expanded} />
          <SideNavItem href="/today" icon={Sun} label="Today" expanded={expanded} />
          <SideNavItem href="/tools" icon={Wrench} label="Tools" expanded={expanded} />
          <SideNavItem href="/projects" icon={KanbanSquare} label="Projects" expanded={expanded} />
        </div>
      </nav>

      {/* Bottom section - Settings & Shortcuts */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] p-2">
        {/* Keyboard Shortcuts */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('niyoplan:show-shortcuts'))}
          className={`mx-2 flex items-center gap-3 rounded-lg transition-all duration-200 ${
            expanded ? 'px-3 py-2' : 'px-2 py-2.5 justify-center'
          } text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]`}
          title={!expanded ? 'Keyboard Shortcuts' : undefined}
        >
          <Keyboard size={18} className="shrink-0" />
          {expanded && <span className="truncate text-sm font-medium">Keyboard Shortcuts</span>}
        </button>

        {/* Company Settings - Only for admins */}
        {userRole === 'admin' && (
          <SideNavItem href="/settings/company" icon={Building2} label="Company Settings" expanded={expanded} />
        )}

        {/* Admin Settings - relocated */}
        {(userRole === 'admin' || profile?.role === 'admin') && (
          <SideNavItem href="/admin/settings" icon={Settings} label="Admin Settings" expanded={expanded} />
        )}

        {/* Project Settings */}
        {projectId && (
          <SideNavItem href={`/projects/${projectId}/settings`} icon={Settings} label="Project Settings" expanded={expanded} />
        )}

        {/* User section */}
        <div className={`mt-2 flex items-center gap-3 rounded-lg p-2 ${expanded ? '' : 'justify-center'}`}>
          <UserAvatar
            user={profile}
            size={32}
            className="shrink-0 cursor-pointer"
          />
          {expanded && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--text-heading)]">
                {profile?.full_name || 'User'}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-red-500 hover:underline"
              >
                <LogOut size={12} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
