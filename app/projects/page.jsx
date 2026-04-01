'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { FolderKanban, Plus, Star, Activity, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import UserAvatar from '@/components/ui/UserAvatar';
import { ProjectsPageSkeleton } from '@/components/ui/PageSkeleton';
import CreateProjectModal from '@/components/modals/CreateProjectModal';

const DEFAULT_LISTS = [
  { name: 'Backlog', rank: 1000 },
  { name: 'To Do', rank: 2000 },
  { name: 'In Progress', rank: 3000 },
  { name: 'In Review', rank: 4000 },
  { name: 'Done', rank: 5000 }
];

const STARRED_PROJECTS_STORAGE_KEY = 'niyoplan-starred-projects';

const getStarredProjectsKey = (profileId) => `${STARRED_PROJECTS_STORAGE_KEY}:${profileId || 'guest'}`;

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { profile } = useAuth();
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [projectScope, setProjectScope] = useState('all');
  const [starredProjectIds, setStarredProjectIds] = useState([]);
  const [openInfoProjectId, setOpenInfoProjectId] = useState(null);
  const canCreateProject = ['admin', 'pm'].includes(activeOrganization?.role);

  useEffect(() => {
    const incoming = searchParams.get('search') || '';
    setSearchTerm(incoming);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedIds = JSON.parse(localStorage.getItem(getStarredProjectsKey(profile?.id)) || '[]');
      setStarredProjectIds(Array.isArray(storedIds) ? storedIds : []);
    } catch (error) {
      console.error('Failed to load starred projects', error);
      setStarredProjectIds([]);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!openInfoProjectId) return;

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        setOpenInfoProjectId(null);
        return;
      }

      if (!event.target.closest('[data-project-info-container="true"]')) {
        setOpenInfoProjectId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenInfoProjectId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openInfoProjectId]);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return projects
      .filter((project) => {
        const matchesSearch = !query || [project.name, project.description, project.prefix]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));

        if (!matchesSearch) return false;

        if (projectScope === 'my') {
          return project.created_by === profile?.id;
        }

        return true;
      })
      .sort((leftProject, rightProject) => {
        const leftStarred = starredProjectIds.includes(leftProject.id);
        const rightStarred = starredProjectIds.includes(rightProject.id);

        if (leftStarred !== rightStarred) {
          return rightStarred ? 1 : -1;
        }

        return new Date(rightProject.created_at) - new Date(leftProject.created_at);
      });
  }, [projects, searchTerm, projectScope, profile?.id, starredProjectIds]);

  const persistStarredProjects = useCallback((nextProjectIds) => {
    setStarredProjectIds(nextProjectIds);

    if (typeof window !== 'undefined') {
      localStorage.setItem(getStarredProjectsKey(profile?.id), JSON.stringify(nextProjectIds));
    }
  }, [profile?.id]);

  const handleToggleStar = useCallback((event, project) => {
    event.preventDefault();
    event.stopPropagation();

    const isStarred = starredProjectIds.includes(project.id);
    const nextProjectIds = isStarred
      ? starredProjectIds.filter((projectId) => projectId !== project.id)
      : [project.id, ...starredProjectIds.filter((projectId) => projectId !== project.id)];

    persistStarredProjects(nextProjectIds);
    toast.success(isStarred ? 'Project removed from starred' : 'Project added to starred');
  }, [persistStarredProjects, starredProjectIds]);

  const handleToggleProjectInfo = useCallback((event, projectId) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenInfoProjectId((currentProjectId) => currentProjectId === projectId ? null : projectId);
  }, []);


  const fetchProjects = useCallback(async () => {
    try {
      const organizationId = activeOrganization?.id;
      if (!organizationId) {
        setProjects([]);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles ( id, full_name, avatar_url, role )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data);
    } catch (err) {
      toast.error('Failed to load projects');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganization?.id]);

  useEffect(() => {
    if (orgLoading) return;
    if (projects.length === 0) {
      setIsLoading(true);
    }
    fetchProjects();
  }, [orgLoading, fetchProjects, projects.length]);

  if (isLoading) {
    return <ProjectsPageSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in p-6 lg:p-10 text-primary">
      
      {/* ── Header ── */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-heading)] tracking-tight">
              Projects
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] font-medium">
            Manage and track all your workspace projects in one place.
          </p>
          </div>
        </div>
        
        {canCreateProject && (
          <button 
            className="flex items-center gap-2 rounded-[3px] bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#00388D] focus:ring-2 focus:ring-[#0052CC] focus:ring-offset-2 active:scale-95" 
            onClick={() => setShowModal(true)}
          >
            <Plus size={16} /> Create Project
          </button>
        )}
      </header>

      {/* ── Search / Filter Bar ── */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-xs">
          <input 
            type="text" 
            placeholder="Search projects" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={projectScope}
            onChange={(e) => setProjectScope(e.target.value)}
            className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all focus:border-[var(--accent-primary)] focus:outline-none"
          >
            <option value="all">All Projects</option>
            <option value="my">My Projects</option>
          </select>
        </div>
      </div>

      {/* ── Project Grid ── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        
        {filteredProjects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-panel-hover)] px-6 py-20 text-center">
            <FolderKanban size={48} className="mb-4 text-[var(--text-muted)] opacity-50" />
            <h3 className="text-lg font-bold text-[var(--text-heading)] mb-2">No projects found</h3>
            <p className="mb-8 max-w-xs text-sm text-[var(--text-muted)] font-medium leading-relaxed font-sans">
              Start by creating your first project to organize your team&apos;s work.
            </p>
            {canCreateProject ? (
              <button 
                className="rounded-[3px] bg-[#0052CC] px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00388D]"
                onClick={() => setShowModal(true)}
              >
                Create Project
              </button>
            ) : (
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Only organization admins and project managers can create projects.
              </p>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isStarred = starredProjectIds.includes(project.id);
            const isInfoOpen = openInfoProjectId === project.id;
            const ownerName = project.profiles?.full_name || 'Unknown owner';
            const ownerRole = project.profiles?.role || 'member';

            return (
            <Link 
              href={`/projects/${project.id}`} 
              key={project.id}
              className="group flex min-w-0 flex-col rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm transition-all hover:border-[var(--accent-primary)] hover:shadow-md active:translate-y-0.5"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] font-mono text-[11px] font-bold text-[var(--accent-primary)] uppercase tracking-wider shadow-sm transition-all group-hover:border-[var(--accent-primary)] group-hover:bg-[var(--accent-subtle)]/30">
                    {project.prefix?.substring(0, 3) || project.name?.substring(0, 2).toUpperCase() || 'PR'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="min-h-[2.5rem] break-words text-base font-bold leading-snug text-[var(--text-heading)] transition-colors line-clamp-2 [overflow-wrap:anywhere] group-hover:text-[#0052CC]">
                      {project.name}
                    </h3>
                    <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Software Project
                    </div>
                  </div>
                </div>
                <button 
                  type="button"
                  aria-label={isStarred ? `Unstar ${project.name}` : `Star ${project.name}`}
                  aria-pressed={isStarred}
                  className={`shrink-0 self-start rounded-md p-1.5 transition-all hover:bg-[var(--bg-panel-hover)] ${
                    isStarred
                      ? 'bg-yellow-50 text-yellow-500 opacity-100'
                      : 'text-[var(--text-muted)] opacity-0 hover:text-yellow-500 group-hover:opacity-100'
                  }`}
                  onClick={(event) => handleToggleStar(event, project)}
                >
                  <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
                </button>
              </div>
              
              <p className="mb-5 min-h-[2.25rem] break-words text-sm font-medium leading-snug text-[var(--text-secondary)] line-clamp-2 [overflow-wrap:anywhere]">
                {project.description || 'Manage tasks, bugs, and features for this project with ease.'}
              </p>
              
              <div className="mt-auto flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
                <div className="relative" data-project-info-container="true">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full p-1 text-left transition-colors hover:bg-[var(--bg-panel-hover)]"
                    onClick={(event) => handleToggleProjectInfo(event, project.id)}
                    aria-expanded={isInfoOpen}
                    aria-label={`Show info for ${ownerName}`}
                  >
                    <div className="relative z-20 rounded-full border-2 border-[var(--bg-surface)] shadow-sm" title={ownerName}>
                      <UserAvatar user={project.profiles} size={24} />
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      Owner
                    </span>
                  </button>

                  {isInfoOpen && (
                    <div className="absolute bottom-full left-0 z-[100] mb-3 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                      <div className="mb-3 flex items-center gap-3">
                        <UserAvatar user={project.profiles} size={36} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{ownerName}</div>
                          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{ownerRole}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project</span>
                          <span className="max-w-[120px] truncate text-[11px] font-semibold text-slate-900">{project.name}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Created</span>
                          <span className="text-[11px] font-semibold text-slate-900">{new Date(project.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Organization</span>
                          <span className="max-w-[120px] truncate text-[11px] font-semibold text-[#0052CC]">{activeOrganization?.name || 'Niyoplan'}</span>
                        </div>
                      </div>

                      <div className="absolute left-5 top-full -mt-1 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#006644]">
                    <Activity size={10} className="text-[#006644]" /> Active
                  </div>
                  
                  <div className="relative" data-project-info-container="true">
                    <button 
                      type="button"
                      aria-label={`Show project info for ${project.name}`}
                      className={`rounded-full p-1 transition-colors hover:bg-blue-50 hover:text-blue-600 ${
                        isInfoOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-400'
                      }`}
                      onClick={(event) => handleToggleProjectInfo(event, project.id)}
                    >
                      <Info size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
            );
          })
        )}
      </div>

      {/* ── Create Project Modal ── */}
      <CreateProjectModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        activeOrganization={activeOrganization}
        profile={profile}
        onProjectCreated={() => fetchProjects()}
      />

    </div>
  );
}
