import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { FolderKanban, Plus, Star, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_LISTS = [
  { name: 'Backlog', rank: 1000 },
  { name: 'To Do', rank: 2000 },
  { name: 'In Progress', rank: 3000 },
  { name: 'In Review', rank: 4000 },
  { name: 'Done', rank: 5000 }
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { profile } = useAuth();
  
  // New Project Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles ( full_name, avatar_url )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data);
    } catch (err) {
      toast.error('Failed to load projects');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name,
          description,
          prefix: prefix.toUpperCase(),
          created_by: profile.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('Project prefix must be unique');
        throw error;
      }

      await supabase.from('lists').insert(DEFAULT_LISTS.map((list) => ({
        project_id: project.id,
        name: list.name,
        rank: list.rank
      })));

      toast.success('Project created!');
      setShowModal(false);
      setName('');
      setDescription('');
      setPrefix('');
      fetchProjects();
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!prefix || prefix.length < 4) {
      const words = val.split(' ').filter(w => w.length > 0);
      let newPrefix = '';
      if (words.length === 1) {
        newPrefix = words[0].substring(0, 4).toUpperCase();
      } else {
        newPrefix = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
      }
      setPrefix(newPrefix);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center pt-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in p-6 lg:p-10">
      
      {/* ── Header ── */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)] tracking-tight">
            Projects
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)] font-medium">
            Manage and track all your workspace projects in one place.
          </p>
        </div>
        
        {['admin', 'pm'].includes(profile?.role) && (
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
            className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] transition-all focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all focus:border-[var(--accent-primary)] focus:outline-none">
            <option>All Projects</option>
            <option>My Projects</option>
            <option>Starred</option>
          </select>
        </div>
      </div>

      {/* ── Project Grid ── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        
        {projects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-panel-hover)] px-6 py-20 text-center">
            <FolderKanban size={48} className="mb-4 text-[var(--text-muted)] opacity-50" />
            <h3 className="text-lg font-bold text-[var(--text-heading)] mb-2">No projects found</h3>
            <p className="mb-8 max-w-xs text-sm text-[var(--text-muted)] font-medium leading-relaxed font-sans">
              Start by creating your first project to organize your team's work.
            </p>
            {['admin', 'pm'].includes(profile?.role) && (
              <button 
                className="rounded-[3px] bg-[#0052CC] px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00388D]"
                onClick={() => setShowModal(true)}
              >
                Create Project
              </button>
            )}
          </div>
        ) : (
          projects.map(project => (
            <Link 
              to={`/projects/${project.id}`} 
              key={project.id}
              className="group flex flex-col rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm transition-all hover:border-[var(--accent-primary)] hover:shadow-md active:translate-y-0.5"
            >
              <div className="mb-5 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0C66E4] to-[#6554C0] text-sm font-bold text-white shadow-sm ring-1 ring-black/5">
                    {project.prefix}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-[var(--text-heading)] group-hover:text-[#0052CC] transition-colors">
                      {project.name}
                    </h3>
                    <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Software Project
                    </div>
                  </div>
                </div>
                <button 
                  className="rounded-md p-1.5 text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--bg-panel-hover)] hover:text-yellow-500 group-hover:opacity-100"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Star size={16} />
                </button>
              </div>
              
              <p className="mb-6 h-10 line-clamp-2 text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
                {project.description || 'Manage tasks, bugs, and features for this project with ease.'}
              </p>
              
              <div className="mt-auto flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
                <div className="flex items-center -space-x-2">
                  <div className="relative z-20 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--bg-surface)] bg-[#0052CC] text-[10px] font-bold text-white shadow-sm overflow-hidden" title={project.profiles?.full_name}>
                    {project.profiles?.avatar_url 
                      ? <img src={project.profiles.avatar_url} alt="" className="h-full w-full object-cover"/>
                      : (project.profiles?.full_name?.charAt(0) || '?')}
                  </div>
                  <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--bg-surface)] bg-[#F4F5F7] text-[10px] font-bold text-[#42526E] shadow-sm">
                    +4
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#006644]">
                  <Activity size={10} className="text-[#006644]" /> Active
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ── Create Project Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-[#091E42]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-lg bg-[var(--bg-surface)] p-8 shadow-2xl animate-fade-in ring-1 ring-black/5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--text-heading)] tracking-tight">Create Project</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="flex flex-col gap-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" 
                  required
                  className="w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none"
                  placeholder="e.g. Website Overhaul"
                  value={name} 
                  onChange={handleNameChange}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Project Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" 
                  required 
                  maxLength={6}
                  className="w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-bold uppercase text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none placeholder:font-medium tracking-widest"
                  placeholder="e.g. WEB"
                  value={prefix} 
                  onChange={e => setPrefix(e.target.value.toUpperCase())}
                />
                <p className="mt-2 text-[11px] font-medium text-[var(--text-muted)]">
                  Issues will look like <span className="font-bold text-[#0052CC]">{prefix || 'WEB'}-123</span>
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Description
                </label>
                <textarea
                  className="w-full min-h-[100px] rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none resize-none"
                  placeholder="What is this project about?"
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  className="rounded-[3px] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="rounded-[3px] bg-[#0052CC] px-7 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00388D] disabled:opacity-50 active:scale-95" 
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
