'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import {
  ChevronDown, ChevronRight, ChevronLeft, Home, Check, Plus,
  LayoutDashboard, Layers, KanbanSquare,
  BarChart2, Tag, Keyboard,
  Settings, BookOpen, Target,
  Zap, MessageSquare, Calendar, Building2, Sun, Wrench, BriefcaseBusiness, LayoutGrid
} from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

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

const SideNavItem = ({ href, icon: Icon, label, isActive, expanded, badge }) => {
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
      {expanded && badge > 0 && (
        <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
};

export default function Sidebar({ project, expanded, onExpandedChange }) {
  const { profile } = useAuth();
  const { activeOrganization, userOrganizations, switchOrganization, loading: orgLoading } = useOrganization();
  const { projectId: paramsId } = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const orgRef = React.useRef(null);

  const projectIdMatch = pathname?.match(/\/projects\/([^\/]+)/);
  const projectId = projectIdMatch ? projectIdMatch[1] : (paramsId || project?.id);
  const activeTab = searchParams.get('tab') || 'list';
  const organization = activeOrganization;
  const userRole = activeOrganization?.role;
  const [clientReminderCount, setClientReminderCount] = useState(0);

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (orgRef.current && !orgRef.current.contains(e.target)) {
        setOrgMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const projectTabHref = (tab) => `/projects/${projectId}?tab=${tab}`;
  const onProjectPage = pathname === `/projects/${projectId}`;

  React.useEffect(() => {
    if (!activeOrganization?.id) {
      setClientReminderCount(0);
      return;
    }

    let cancelled = false;

    apiFetch(`/api/client-reminders/due?organizationId=${activeOrganization.id}`)
      .then((response) => response.ok ? response.json() : [])
      .then((items) => {
        if (!cancelled) setClientReminderCount(Array.isArray(items) ? items.length : 0);
      })
      .catch(() => {
        if (!cancelled) setClientReminderCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id]);

  return (
    <aside
      id="project-sidebar"
      className={`relative z-40 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] transition-all duration-200 ${expanded ? 'w-60' : 'w-16'}`}
    >
      {/* Floating Toggle Button */}
      <button
        onClick={() => onExpandedChange?.(!expanded)}
        className="absolute -right-3 top-4 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-md hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] transition-all cursor-pointer focus:outline-none"
        title={expanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
      >
        {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Top Section - My Space (Global) */}
      <nav className="pt-2 pb-1 scrollbar-hide">
        <div className="space-y-1">
          <SideNavItem href="/my-space" icon={Home} label="My Space" expanded={expanded} />
        </div>
      </nav>

      {/* Organization Switcher */}
      <div className="p-3 border-y border-[var(--border-subtle)] bg-[var(--bg-panel)]" ref={orgRef}>
        {expanded ? (
          <div className="relative">
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className="w-full flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] transition-all cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 size={16} className="text-[var(--accent-primary)] shrink-0" />
                <span className="truncate text-left text-sm font-semibold text-[var(--text-heading)]">
                  {orgLoading ? 'Loading org...' : (activeOrganization?.name || 'No company')}
                </span>
              </div>
              <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0 transition-transform duration-200" style={{ transform: orgMenuOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {/* Dropdown Menu (Expanded) */}
            {orgMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-[220] w-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl">
                <div className="border-b border-[var(--border-subtle)] px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Organizations</div>
                </div>

                <div className="max-h-[220px] overflow-y-auto">
                  {userOrganizations && userOrganizations.length > 0 ? (
                    userOrganizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          switchOrganization(org.id);
                          setOrgMenuOpen(false);
                          router.push('/dashboard');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-panel-hover)] ${activeOrganization?.id === org.id ? 'bg-[var(--accent-subtle)]' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{org.name}</div>
                          <div className="text-xs text-[var(--text-muted)] capitalize">{org.role}</div>
                        </div>
                        {activeOrganization?.id === org.id && <Check size={14} className="text-[var(--accent-primary)]" />}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-xs text-[var(--text-muted)] text-center">No organization</div>
                  )}
                </div>

                <div className="border-t border-[var(--border-subtle)] p-1.5 bg-[var(--bg-panel)]">
                  <button
                    onClick={() => {
                      setOrgMenuOpen(false);
                      router.push('/onboarding/create');
                    }}
                    className="w-full inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] cursor-pointer"
                  >
                    <Plus size={12} /> New organization
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex justify-center">
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-panel-hover)] transition-all cursor-pointer focus:outline-none"
              title={activeOrganization?.name || 'Organizations'}
            >
              <Building2 size={18} className="text-[var(--accent-primary)]" />
            </button>

            {/* Dropdown Menu (Collapsed - Float Right) */}
            {orgMenuOpen && (
              <div className="absolute left-14 top-0 z-[220] w-[260px] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl">
                <div className="border-b border-[var(--border-subtle)] px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Organizations</div>
                </div>

                <div className="max-h-[220px] overflow-y-auto">
                  {userOrganizations && userOrganizations.length > 0 ? (
                    userOrganizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          switchOrganization(org.id);
                          setOrgMenuOpen(false);
                          router.push('/dashboard');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-panel-hover)] ${activeOrganization?.id === org.id ? 'bg-[var(--accent-subtle)]' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{org.name}</div>
                          <div className="text-xs text-[var(--text-muted)] capitalize">{org.role}</div>
                        </div>
                        {activeOrganization?.id === org.id && <Check size={14} className="text-[var(--accent-primary)]" />}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-xs text-[var(--text-muted)] text-center">No organization</div>
                  )}
                </div>

                <div className="border-t border-[var(--border-subtle)] p-1.5 bg-[var(--bg-panel)]">
                  <button
                    onClick={() => {
                      setOrgMenuOpen(false);
                      router.push('/onboarding/create');
                    }}
                    className="w-full inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] cursor-pointer"
                  >
                    <Plus size={12} /> New organization
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        <div className="space-y-1">
          <SideNavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" expanded={expanded} />
          <SideNavItem href="/today" icon={Sun} label="Today" expanded={expanded} />
          <SideNavItem href="/projects" icon={KanbanSquare} label="Projects" expanded={expanded} />
          <SideNavItem href="/clients" icon={BriefcaseBusiness} label="Clients" expanded={expanded} badge={clientReminderCount} />
          <SideNavItem href="/tools" icon={Wrench} label="Tools" expanded={expanded} />
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
        {userRole?.toLowerCase() === 'admin' && (
          <SideNavItem href="/settings/company" icon={Building2} label="Company Settings" expanded={expanded} />
        )}

        {/* Admin Settings - relocated */}
        {(userRole?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'admin') && (
          <SideNavItem href="/admin/settings" icon={Settings} label="Admin Settings" expanded={expanded} />
        )}

        {/* Project Settings */}
        {projectId && (
          <SideNavItem href={`/projects/${projectId}/settings`} icon={Settings} label="Project Settings" expanded={expanded} />
        )}
      </div>
    </aside>
  );
}
