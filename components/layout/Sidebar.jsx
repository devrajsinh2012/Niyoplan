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
  Zap, MessageSquare, Calendar, LogOut, Building2, Sun
} from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import ProjectBadge from '@/components/ui/ProjectBadge';

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
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 12%, white 88%), color-mix(in srgb, var(--accent-subtle) 82%, white 18%))',
        border: '1px solid color-mix(in srgb, var(--accent-primary) 18%, transparent)',
        boxShadow: '0 10px 24px rgba(37, 99, 235, 0.08)',
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
      className={`fixed left-0 top-[var(--topnav-height)] h-[calc(100vh-var(--topnav-height))] z-40 flex flex-col border-r border-[var(--border-subtle)] transition-all duration-200 ${expanded ? 'w-60' : 'w-16'}`}
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 94%, white 6%), color-mix(in srgb, var(--bg-panel) 92%, white 8%))',
        boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.45)',
      }}
    >
      {/* Project/App Header */}
      {(projectId || (!orgLoading && !organization)) && (
        <div className="shrink-0 border-b border-[var(--border-subtle)] p-3">
          <div
            className={`group flex cursor-pointer items-center rounded-2xl p-2 transition-all duration-200 hover:bg-[var(--bg-panel-hover)] ${expanded ? 'gap-3' : 'justify-center'}`}
            style={expanded ? {
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 88%, white 12%), color-mix(in srgb, var(--bg-panel) 90%, white 10%))',
              border: '1px solid color-mix(in srgb, var(--border-subtle) 78%, white 22%)',
              boxShadow: 'var(--shadow-sm)',
            } : undefined}
            onClick={() => projectId ? router.push(`/projects/${projectId}`) : router.push('/')}
          >
            <ProjectBadge project={project} size={36} className="shrink-0 transition-transform group-hover:scale-[1.03]" />
            {expanded && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text-heading)]">
                  {project?.name || 'Niyoplan'}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {project?.prefix && (
                    <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--accent-primary)]">
                      {project.prefix}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                    {projectId ? 'Software Project' : 'Workspace Home'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {projectId ? (
          <div className="space-y-4">
            <>
              <NavSection title="Planning" expanded={expanded}>
                <SideNavItem href={projectTabHref('backlog')} icon={Layers} label="Backlog" isActive={onProjectPage && activeTab === 'backlog'} expanded={expanded} />
                <SideNavItem href={projectTabHref('board')} icon={KanbanSquare} label="Board" isActive={onProjectPage && activeTab === 'board'} expanded={expanded} />
                <SideNavItem href={projectTabHref('gantt')} icon={Calendar} label="Timeline" isActive={onProjectPage && activeTab === 'gantt'} expanded={expanded} />
              </NavSection>

              <NavSection title="Development" expanded={expanded}>
                <SideNavItem href={projectTabHref('dsm')} icon={Zap} label="DSM Module" isActive={onProjectPage && activeTab === 'dsm'} expanded={expanded} />
                <SideNavItem href={projectTabHref('meetings')} icon={MessageSquare} label="Meetings" isActive={onProjectPage && activeTab === 'meetings'} expanded={expanded} />
                <SideNavItem href={projectTabHref('goals')} icon={Target} label="Goals & OKRs" isActive={onProjectPage && activeTab === 'goals'} expanded={expanded} />
                <SideNavItem href={projectTabHref('docs')} icon={BookOpen} label="Docs" isActive={onProjectPage && activeTab === 'docs'} expanded={expanded} />
                <SideNavItem href={projectTabHref('ai-tools')} icon={Zap} label="AI Tools" isActive={onProjectPage && activeTab === 'ai-tools'} expanded={expanded} />
              </NavSection>

              <NavSection title="Analytics" expanded={expanded}>
                <SideNavItem href={projectTabHref('views')} icon={BarChart2} label="Reports" isActive={onProjectPage && activeTab === 'views'} expanded={expanded} />
                <SideNavItem href={projectTabHref('list')} icon={Tag} label="Issues" isActive={onProjectPage && activeTab === 'list'} expanded={expanded} />
              </NavSection>
            </>
          </div>
        ) : (
          <div className="space-y-1">
            <SideNavItem href="/" icon={LayoutDashboard} label="Dashboard" expanded={expanded} />
            <SideNavItem href="/today" icon={Sun} label="Today" expanded={expanded} />
            <SideNavItem href="/projects" icon={KanbanSquare} label="Projects" expanded={expanded} />
            {(userRole === 'admin' || profile?.role === 'admin') && (
              <SideNavItem href="/admin/settings" icon={Settings} label="Admin Settings" expanded={expanded} />
            )}
          </div>
        )}
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
