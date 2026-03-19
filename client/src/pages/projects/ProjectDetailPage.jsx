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
      backlog: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
      todo: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      in_review: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      done: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    };
    return map[status] || map.backlog;
  };

  const getPriorityColor = (priority) => {
    const map = {
      urgent: 'text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded text-xs border border-rose-500/30',
      high: 'text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded text-xs border border-orange-500/30',
      medium: 'text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded text-xs border border-blue-500/30',
      low: 'text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded text-xs border border-slate-500/30'
    };
    return map[priority] || map.medium;
  };

  const filteredCards = cards.filter(card => {
    const matchesStatus = statusFilter ? card.status === statusFilter : true;
    const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          card.custom_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) return <div className="flex justify-center py-40"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div></div>;

  if (!project) return <div className="text-center py-20"><h2 className="text-2xl font-bold text-white mb-4">Project Not Found</h2><Link to="/projects" className="text-blue-400 hover:text-blue-300">Return to Projects</Link></div>;

  return (
    <div className="max-w-screen-2xl mx-auto w-full animate-fade-in pb-10 flex flex-col h-full h-fit min-h-full">
      
      <header className="mb-6 flex-shrink-0">
        <Link to="/projects" className="text-slate-500 hover:text-white flex items-center gap-1 w-fit mb-4 transition-colors text-sm font-medium">
          <ChevronLeft size={16} /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold font-mono">
                {project.prefix}
              </div>
              <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            </div>
            <p className="text-slate-400 max-w-2xl text-sm">{project.description}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShortcuts(true)} className="btn-secondary text-sm">Shortcuts (?)</button>
            {canWrite && (
              <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                <Plus size={20} />
                Create Issue (C)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 mb-6 flex-shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <tab.icon size={18} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'list' && (
          <div className="flex flex-col flex-1 animate-fade-in">
            <div className="glass-panel rounded-t-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center border-b-0">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search by ID or title..." 
                  className="input-dark pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Settings2 className="text-slate-500" size={18} />
                  <select 
                    className="input-dark py-2 border-transparent hover:border-slate-700 bg-slate-800"
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

            <div className="glass-card rounded-b-2xl rounded-tr-2xl sm:rounded-tl-none overflow-hidden border-t-0 flex-1">
              <div className="overflow-x-auto w-full h-full">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider sticky top-0">
                      <th className="p-4 font-medium border-b border-slate-700 w-24">Key</th>
                      <th className="p-4 font-medium border-b border-slate-700">Summary</th>
                      <th className="p-4 font-medium border-b border-slate-700 w-28">Type</th>
                      <th className="p-4 font-medium border-b border-slate-700 w-28">Priority</th>
                      <th className="p-4 font-medium border-b border-slate-700 w-32">Status</th>
                      <th className="p-4 font-medium border-b border-slate-700 w-36">Assignee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 text-sm">
                    {filteredCards.map(card => (
                      <tr key={card.id} className="hover:bg-slate-800/30 transition-colors group cursor-pointer">
                        <td className="p-4 font-mono font-medium text-blue-400">{card.custom_id}</td>
                        <td className="p-4 font-medium text-white pr-8">{card.title}</td>
                        <td className="p-4 uppercase text-xs font-semibold tracking-wide text-slate-400">{card.issue_type}</td>
                        <td className="p-4 uppercase text-xs font-bold tracking-wider">
                          <span className={getPriorityColor(card.priority)}>{card.priority}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider ${getStatusColor(card.status)}`}>
                            {card.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-600">
                              {card.assignee?.avatar_url ? (
                                <img src={card.assignee.avatar_url} alt="Assignee" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300">{card.assignee?.full_name?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            <span className="text-slate-400 max-w-[100px] truncate" title={card.assignee?.full_name}>
                              {card.assignee?.full_name?.split(' ')[0] || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCards.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-slate-500">
                          <Search size={40} className="mb-4 mx-auto opacity-50" />
                          <p className="text-lg">No tickets found.</p>
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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-semibold">Keyboard Shortcuts</h3>
              <button className="btn-secondary" onClick={() => setShowShortcuts(false)}>Close</button>
            </div>
            <div className="space-y-2 text-sm text-slate-200">
              <div><span className="text-blue-300">1-0</span> Switch tabs</div>
              <div><span className="text-blue-300">/</span> Focus list search</div>
              <div><span className="text-blue-300">C</span> Open create issue</div>
              <div><span className="text-blue-300">?</span> Show shortcuts</div>
              <div><span className="text-blue-300">Esc</span> Close shortcuts</div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
