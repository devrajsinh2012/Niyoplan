import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Plus, Settings2, Search, List as ListIcon, KanbanSquare, Network, Calendar, Target, FileText, Sparkles, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateTicketModal from '../tickets/CreateTicketModal';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import SprintManager from '../../components/sprints/SprintManager';
import GanttChart from '../../components/gantt/GanttChart';
import DSMPanel from '../../components/dsm/DSMPanel';
import MeetingReviewsPanel from '../../components/meetings/MeetingReviewsPanel';
import GoalsPanel from '../../components/goals/GoalsPanel';
import DocsWorkspacePanel from '../../components/docs/DocsWorkspacePanel';
import WorkspaceViewsPanel from '../../components/workspace/WorkspaceViewsPanel';
import AIToolsPanel from '../../components/ai/AIToolsPanel';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'board', 'backlog'
  const { profile } = useAuth();
  const searchInputRef = useRef(null);
  const canWrite = ['admin', 'pm', 'member'].includes(profile?.role);

  const tabs = useMemo(() => ([
    { id: 'list', name: 'List View', icon: ListIcon },
    { id: 'board', name: 'Kanban Board', icon: KanbanSquare },
    { id: 'backlog', name: 'Sprints & Backlog', icon: Network },
    { id: 'gantt', name: 'Gantt Timeline', icon: Calendar },
    { id: 'dsm', name: 'DSM Module', icon: Settings2 },
    { id: 'meetings', name: 'Meetings', icon: FileText },
    { id: 'goals', name: 'Goals & OKRs', icon: Target },
    { id: 'docs', name: 'Docs', icon: LayoutGrid },
    { id: 'views', name: 'Views & Inbox', icon: ListIcon },
    { id: 'ai', name: 'AI Tools', icon: Sparkles },
  ]), []);
  
  // Filtering for List view
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProjectAndCards = useCallback(async () => {
    try {
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (projError) throw projError;
      setProject(projData);

      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select(`*, assignee:profiles!cards_assignee_id_fkey(full_name, avatar_url)`)
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      if (cardsError) throw cardsError;
      setCards(cardsData);

    } catch (err) {
      toast.error('Failed to load project details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectAndCards();
  }, [fetchProjectAndCards]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      const isTypingTarget = tag === 'input' || tag === 'textarea' || event.target?.isContentEditable;

      if (event.key === 'Escape') {
        setShowShortcuts(false);
        return;
      }

      if (isTypingTarget) return;

      if (event.key === '?') {
        event.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        setActiveTab('list');
        requestAnimationFrame(() => searchInputRef.current?.focus());
        return;
      }

      if (event.key.toLowerCase() === 'c' && canWrite) {
        event.preventDefault();
        setShowModal(true);
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        const index = event.key === '0' ? 9 : Number(event.key) - 1;
        if (tabs[index]) {
          setActiveTab(tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tabs, canWrite]);

  const handleCreated = useCallback(() => {
    fetchProjectAndCards();
    setRefreshNonce((prev) => prev + 1);
  }, [fetchProjectAndCards]);

  const getStatusColor = (status) => {
    const map = {
      backlog: 'bg-[#F4F5F7] text-[#42526E]',
      todo: 'bg-[#F4F5F7] text-[#42526E]',
      in_progress: 'bg-[#E9F2FF] text-[#0052CC]',
      in_review: 'bg-[#FFF0B3] text-[#172B4D]',
      done: 'bg-[#E3FCEF] text-[#006644]'
    };
    return map[status] || map.backlog;
  };

  const getPriorityColor = (priority) => {
    const map = {
      urgent: 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-100 uppercase tracking-wider',
      high: 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-100 uppercase tracking-wider',
      medium: 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 uppercase tracking-wider',
      low: 'text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-100 uppercase tracking-wider'
    };
    return map[priority] || map.medium;
  };

  const filteredCards = cards.filter(card => {
    const matchesStatus = statusFilter ? card.status === statusFilter : true;
    const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          card.custom_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) return <div className="flex justify-center py-40"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[var(--accent-primary)]"></div></div>;

  if (!project) return <div className="text-center py-20"><h2 className="text-2xl font-bold text-[var(--text-heading)] mb-4" >Project Not Found</h2><Link to="/projects" className="text-[var(--accent-primary)] hover:underline">Return to Projects</Link></div>;

  return (
    <div className="max-w-screen-2xl mx-auto w-full animate-fade-in pb-10 flex flex-col min-h-full">
      
      <header className="mb-6 shrink-0">
        <Link to="/projects" className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1 w-fit mb-4 transition-colors text-sm font-medium">
          <ChevronLeft size={16} /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <nav className="flex items-center gap-2 mb-2 text-xs text-[var(--text-muted)] font-medium">
              <span>Projects</span>
              <span>/</span>
              <span className="text-[var(--text-secondary)]">{project.name}</span>
            </nav>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-2 py-1 rounded bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 text-[10px] font-bold font-mono">
                {project.prefix}
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-heading)]">{project.name}</h1>
            </div>
            <p className="text-[var(--text-secondary)] max-w-2xl text-sm leading-relaxed">{project.description}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShortcuts(true)} className="btn-outline text-sm">Shortcuts (?)</button>
            {canWrite && (
              <button 
                onClick={() => setShowModal(true)} 
                className="flex items-center gap-2 rounded-[3px] bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0065FF]"
              >
                <Plus size={18} strokeWidth={2.5} />
                Create Issue
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs (Modern Jira style) */}
      <div className="flex border-b border-[var(--border-subtle)] mb-6 shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' 
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]'
            }`}
          >
            <tab.icon size={16} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 shrink-0 flex flex-col">
        {activeTab === 'list' && (
          <div className="flex flex-col flex-1 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search by ID or title..." 
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-app)]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status:</span>
                  <select 
                    className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] py-1.5 px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[4px] shadow-sm overflow-hidden flex-1">
              <div className="overflow-x-auto w-full h-full">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[var(--bg-panel)] text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-wider border-b border-[var(--border-subtle)]">
                      <th className="p-4 w-24">Key</th>
                      <th className="p-4">Summary</th>
                      <th className="p-4 w-28">Type</th>
                      <th className="p-4 w-32">Priority</th>
                      <th className="p-4 w-32">Status</th>
                      <th className="p-4 w-36">Assignee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] text-sm">
                    {filteredCards.map(card => (
                      <tr key={card.id} className="hover:bg-[var(--bg-panel-hover)] transition-colors group cursor-pointer">
                        <td className="p-4 font-mono font-medium text-[var(--accent-primary)] hover:underline">{card.custom_id}</td>
                        <td className="p-4 font-medium text-[var(--text-heading)] pr-8">{card.title}</td>
                        <td className="p-4 uppercase text-[10px] font-bold tracking-wide text-[var(--text-muted)]">{card.issue_type}</td>
                        <td className="p-4">
                          <span className={getPriorityColor(card.priority)}>{card.priority}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider ${getStatusColor(card.status)}`}>
                            {card.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-[var(--bg-panel-hover)] overflow-hidden flex items-center justify-center border border-[var(--border-subtle)]">
                              {card.assignee?.avatar_url ? (
                                <img src={card.assignee.avatar_url} alt="Assignee" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-[var(--text-muted)]">{card.assignee?.full_name?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            <span className="text-[var(--text-secondary)] text-xs font-medium truncate max-w-[100px]" title={card.assignee?.full_name}>
                              {card.assignee?.full_name?.split(' ')[0] || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCards.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-16 text-center text-[var(--text-muted)]">
                          <Search size={40} className="mb-4 mx-auto opacity-20" />
                          <p className="text-lg font-medium">No tickets found.</p>
                          <p className="text-sm">Try adjusting your filters or search query.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'board' && (
          <div className="flex-1 animate-fade-in flex flex-col min-h-[600px] h-full">
            <KanbanBoard projectId={id} refreshNonce={refreshNonce} />
          </div>
        )}

        {activeTab === 'backlog' && (
          <div className="flex-1 animate-fade-in flex flex-col">
            <SprintManager projectId={id} refreshNonce={refreshNonce} />
          </div>
        )}

        {activeTab === 'gantt' && (
          <div className="flex-1 animate-fade-in flex flex-col">
            <GanttChart projectId={id} refreshNonce={refreshNonce} />
          </div>
        )}

        {activeTab === 'dsm' && (
          <div className="flex-1 animate-fade-in flex flex-col">
            <DSMPanel projectId={id} />
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="flex-1 animate-fade-in flex flex-col">
            <MeetingReviewsPanel projectId={id} />
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="flex-1 animate-fade-in flex flex-col">
            <GoalsPanel projectId={id} />
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="flex-1 animate-fade-in flex flex-col">
            <DocsWorkspacePanel projectId={id} />
          </div>
        )}

        {activeTab === 'views' && (
          <div className="flex-1 animate-fade-in flex flex-col">
            <WorkspaceViewsPanel projectId={id} />
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1 animate-fade-in flex flex-col">
            <AIToolsPanel projectId={id} />
          </div>
        )}
      </div>

      {showModal && (
        <CreateTicketModal projectId={id} onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}

      {showShortcuts && (
        <div className="fixed inset-0 z-[1000] bg-[var(--bg-app)]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowShortcuts(false)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[4px] shadow-2xl w-full max-w-xl p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[var(--text-heading)] text-xl font-bold">Keyboard Shortcuts</h3>
              <button 
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                onClick={() => setShowShortcuts(false)}
              >
                Close (Esc)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-secondary)]">Switch tabs</span>
                <kbd className="bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border-strong)] font-mono font-bold">1-0</kbd>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-secondary)]">Focus list search</span>
                <kbd className="bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border-strong)] font-mono font-bold">/</kbd>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-secondary)]">Create issue</span>
                <kbd className="bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border-strong)] font-mono font-bold">C</kbd>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-secondary)]">Show shortcuts</span>
                <kbd className="bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border-strong)] font-mono font-bold">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
