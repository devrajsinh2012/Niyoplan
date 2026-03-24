'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronDown, ChevronRight,
  LayoutDashboard, Layers, KanbanSquare,
  BarChart2, Tag, Keyboard,
  Settings, BookOpen, Target,
  Zap, MessageSquare, Calendar, LogOut, Building2
} from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import { supabase } from '@/lib/supabase';

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

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg mx-2 transition-all duration-200 ${
        expanded ? 'px-3 py-2' : 'px-2 py-2.5 justify-center'
      } ${
        active
          ? 'bg-blue-50 text-blue-600 font-semibold'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]'
      }`}
      title={!expanded ? label : undefined}
    >
      {Icon && <Icon size={18} className="shrink-0" />}
      {expanded && <span className="truncate text-sm font-medium">{label}</span>}
    </Link>
  );
};

export default function Sidebar({ project }) {
  const { profile, signOut } = useAuth();
  const { projectId: paramsId } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = paramsId || project?.id;
  const activeTab = searchParams.get('tab') || 'list';
  const [organization, setOrganization] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const loadOrganization = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data: membership } = await supabase
        .from('organization_members')
        .select(`
          role,
          status,
          organizations:organization_id (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })
        .limit(1)
        .single();

      if (membership?.organizations) {
        setOrganization(membership.organizations);
        setUserRole(membership.role);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const projectTabHref = (tab) => `/projects/${projectId}?tab=${tab}`;
  const onProjectPage = pathname === `/projects/${projectId}`;

  const getProjectBadgeText = () => {
    if (project?.prefix) {
      return project.prefix.slice(0, 2).toUpperCase();
    }

    if (project?.name) {
      const initials = project.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('');

      if (initials) {
        return initials;
      }
    }

    return 'NP';
  };

  const expanded = true;

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <aside
      id="project-sidebar"
      className="fixed left-0 top-[var(--topnav-height)] h-[calc(100vh-var(--topnav-height))] z-40 flex w-60 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-panel)]"
    >
      {/* Project/App Header */}
      <div className="shrink-0 border-b border-[var(--border-subtle)] p-3">
        {/* Organization Header */}
        {organization && expanded && (
          <div className="mb-3 pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-sm font-bold text-white shadow-sm">
                {organization.logo_url ? (
                  <Image
                    src={organization.logo_url}
                    alt={organization.name}
                    width={40}
                    height={40}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  organization.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text-heading)]">
                  {organization.name}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {userRole === 'admin' ? 'Admin' : userRole === 'viewer' ? 'Viewer' : 'Member'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Header */}
        {(projectId || !organization) && (
          <div
            className="group flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-[var(--bg-panel-hover)]"
            onClick={() => projectId ? router.push(`/projects/${projectId}`) : router.push('/')}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-primary)] text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105">
              {getProjectBadgeText()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--text-heading)]">
                {project?.name || 'Niyoplan'}
              </div>
              {projectId && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Software Project
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
            <SideNavItem href="/projects" icon={KanbanSquare} label="Projects" expanded={expanded} />
            {profile?.role === 'admin' && (
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
          className={`flex w-full items-center gap-3 rounded-lg transition-all duration-200 ${
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
