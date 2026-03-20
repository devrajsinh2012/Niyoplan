'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronDown, ChevronRight,
  LayoutDashboard, Layers, KanbanSquare,
  BarChart2, Tag,
  Settings, BookOpen, Target,
  Zap, MessageSquare, Calendar
} from 'lucide-react';

const NavSection = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full cursor-pointer items-center justify-between rounded-[3px] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-panel-hover)]"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
};

const SideNavItem = ({ href, icon: Icon, label }) => {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
  
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-[3px] text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-r-2 border-[var(--accent-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] border-r-2 border-transparent'
      }`}
    >
      {Icon && <Icon size={18} className="shrink-0" />}
      <span className="truncate">{label}</span>
    </Link>
  );
};

export default function Sidebar({ project, collapsed }) {
  const { profile } = useAuth();
  const { projectId: paramsId } = useParams();
  const router = useRouter();
  const projectId = paramsId || project?.id;

  return (
    <aside
      id="project-sidebar"
      className={`h-full shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-[var(--sidebar-width)] opacity-100'
      } z-10 flex flex-col`}
    >
      {/* Project Header */}
      <div className="shrink-0 border-b border-[var(--border-subtle)] p-3">
        <div 
          className="group flex cursor-pointer items-center gap-3 rounded-[3px] p-2 hover:bg-[var(--bg-panel-hover)]"
          onClick={() => projectId && router.push(`/projects/${projectId}`)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#0C66E4] to-[#6554C0] text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105">
            {project?.name?.charAt(0) || 'N'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--text-heading)]">
              {project?.name || 'Niyoplan V2'}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Software Project
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-hide">
        {projectId ? (
          <div className="space-y-4">
            <NavSection title="Planning">
              <SideNavItem href={`/projects/${projectId}`} icon={Layers} label="Backlog" />
              <SideNavItem href={`/projects/${projectId}/board`} icon={KanbanSquare} label="Board" />
              <SideNavItem href={`/projects/${projectId}/gantt`} icon={Calendar} label="Timeline" />
            </NavSection>

            <NavSection title="Development">
              <SideNavItem href={`/projects/${projectId}/dsm`} icon={Zap} label="DSM Module" />
              <SideNavItem href={`/projects/${projectId}/meetings`} icon={MessageSquare} label="Meetings" />
              <SideNavItem href={`/projects/${projectId}/goals`} icon={Target} label="Goals & OKRs" />
              <SideNavItem href={`/projects/${projectId}/docs`} icon={BookOpen} label="Docs" />
              <SideNavItem href={`/projects/${projectId}/ai`} icon={Zap} label="AI Tools" />
            </NavSection>

            <NavSection title="Analytics">
              <SideNavItem href={`/projects/${projectId}/reports`} icon={BarChart2} label="Reports" />
              <SideNavItem href={`/projects/${projectId}/list`} icon={Tag} label="Issues" />
            </NavSection>
          </div>
        ) : (
          <div className="space-y-1">
            <SideNavItem href="/" icon={LayoutDashboard} label="Dashboard" />
            <SideNavItem href="/projects" icon={KanbanSquare} label="Projects" />
            {profile?.role === 'admin' && (
              <SideNavItem href="/admin" icon={Settings} label="Admin Settings" />
            )}
          </div>
        )}
      </nav>

      {/* Project Settings at bottom */}
      {projectId && (
        <div className="shrink-0 border-t border-[var(--border-subtle)] p-2">
          <SideNavItem href={`/projects/${projectId}/settings`} icon={Settings} label="Project settings" />
        </div>
      )}
    </aside>
  );
}
