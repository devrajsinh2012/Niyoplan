'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ScheduleStoreProvider } from '@/context/ScheduleStore';
import { 
  ChevronLeft, Plus, Settings2, Search, List as ListIcon, 
  KanbanSquare, Network, Calendar, Target, FileText, Sparkles, LayoutGrid 
} from 'lucide-react';
import toast from 'react-hot-toast';

// Sub-components
import CreateTicketModal from '@/components/tickets/CreateTicketModal';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import CardDetail from '@/components/kanban/CardDetail';
import SprintManager from '@/components/sprints/SprintManager';
import GanttChart from '@/components/gantt/GanttChart';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import DSMPanel from '@/components/dsm/DSMPanel';
import MeetingReviewsPanel from '@/components/meetings/MeetingReviewsPanel';
import GoalsPanel from '@/components/goals/GoalsPanel';
import DocsWorkspacePanel from '@/components/docs/DocsWorkspacePanel';
import WorkspaceViewsPanel from '@/components/workspace/WorkspaceViewsPanel';
import AIToolsPanel from '@/components/ai/AIToolsPanel';
import UserAvatar from '@/components/ui/UserAvatar';
import ProjectBadge from '@/components/ui/ProjectBadge';
import { ProjectDetailPageSkeleton } from '@/components/ui/PageSkeleton';
import ErrorBoundary from '@/components/ui/ErrorBoundary';



export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.projectId;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [project, setProject] = useState(null);
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [createIssueContext, setCreateIssueContext] = useState({ sprintId: null });
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isSavingCard, setIsSavingCard] = useState(false);
  
  // Get active tab from URL search params or default to 'list'
  const requestedTab = searchParams.get('tab') || 'list';
  const tabAliases = {
    ai: 'ai-tools',
    'ai-tools': 'ai-tools'
  };
  const activeTab = tabAliases[requestedTab] || requestedTab;
  const { profile } = useAuth();
  const searchInputRef = useRef(null);
  const canWrite = ['admin', 'pm', 'member'].includes(profile?.role);

  const tabs = useMemo(() => ([
    { id: 'list', name: 'List View', icon: ListIcon },
    { id: 'board', name: 'Kanban Board', icon: KanbanSquare },
    { id: 'backlog', name: 'Sprint', icon: Network },
    { id: 'gantt', name: 'Gantt Timeline', icon: Calendar },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'dsm', name: 'DSM Module', icon: Settings2 },
    { id: 'meetings', name: 'Meetings', icon: FileText },
    { id: 'goals', name: 'Goals & OKRs', icon: Target },
    { id: 'docs', name: 'Docs', icon: LayoutGrid },
    { id: 'views', name: 'Views & Inbox', icon: ListIcon },
    { id: 'ai-tools', name: 'AI Tools', icon: Sparkles },
  ]), []);
  
  // Filtering for List view
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProjectAndCards = useCallback(async () => {
    if (!id) return;
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
    const openModal = (event) => {
      const sprintId = event?.detail?.sprintId || null;
      setCreateIssueContext({ sprintId });
      setShowModal(true);
    };
    window.addEventListener('niyoplan:create-issue', openModal);
    return () => window.removeEventListener('niyoplan:create-issue', openModal);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      const isTypingTarget = tag === 'input' || tag === 'textarea' || event.target?.isContentEditable;

      if (isTypingTarget) return;

      if (event.key === '/') {
        event.preventDefault();
        router.push(`/projects/${id}?tab=list`, { scroll: false });
        requestAnimationFrame(() => searchInputRef.current?.focus());
        return;
      }

      if (event.key.toLowerCase() === 'c' && canWrite) {
        event.preventDefault();
        setCreateIssueContext({ sprintId: null });
        setShowModal(true);
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        const index = event.key === '0' ? 9 : Number(event.key) - 1;
        if (tabs[index]) {
          router.push(`/projects/${id}?tab=${tabs[index].id}`, { scroll: false });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tabs, canWrite, id, router]);

  const handleCreated = useCallback(() => {
    setCreateIssueContext({ sprintId: null });
    fetchProjectAndCards();
    setRefreshNonce((prev) => prev + 1);
  }, [fetchProjectAndCards]);

  const setActiveTab = (tabId) => {
    router.push(`/projects/${id}?tab=${tabId}`, { scroll: false });
  };

  const handleSaveCard = async (updates) => {
    if (!selectedCard?.id) return;
    setIsSavingCard(true);

    const payload = {
      title: updates.title,
      description: updates.description,
      priority: updates.priority,
      status: updates.status,
      assignee_id: updates.assignee_id || selectedCard.reporter_id || profile?.id || null,
      story_points: updates.story_points,
      start_date: updates.start_date || null,
      due_date: updates.due_date || null,
    };

    const { data, error } = await supabase
      .from('cards')
      .update(payload)
      .eq('id', selectedCard.id)
      .select('*, assignee:profiles!cards_assignee_id_fkey(id, full_name, avatar_url), reporter:profiles!cards_reporter_id_fkey(id, full_name, avatar_url)')
      .single();

    setIsSavingCard(false);

    if (error) {
      toast.error('Failed to save card');
      return;
    }

    setCards((prev) => prev.map((item) => (item.id === data.id ? data : item)));
    setSelectedCard((prev) => (prev?.id === data.id ? data : prev));
    toast.success('Card updated');
  };

  const handleBoardCardUpdated = useCallback((updatedCard) => {
    if (!updatedCard?.id) return;

    setCards((prev) => {
      const exists = prev.some((item) => item.id === updatedCard.id);
      if (!exists) return [updatedCard, ...prev];
      return prev.map((item) => (item.id === updatedCard.id ? { ...item, ...updatedCard } : item));
    });

    setSelectedCard((prev) => (prev?.id === updatedCard.id ? { ...prev, ...updatedCard } : prev));
  }, []);

  useEffect(() => {
    const selectedCardId = searchParams.get('cardId');
    if (!selectedCardId || !cards.length) return;
    const match = cards.find((card) => card.id === selectedCardId);
    if (match) setSelectedCard(match);
  }, [cards, searchParams]);

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

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      router.replace(`/projects/${id}?tab=list`);
    }
  }, [tabs, activeTab, router, id]);

  if (isLoading) return <ProjectDetailPageSkeleton />;

  if (!project) return <div className="text-center py-20"><h2 className="text-2xl font-bold text-[var(--text-heading)] mb-4" >Project Not Found</h2><Link href="/projects" className="text-[var(--accent-primary)] hover:underline">Return to Projects</Link></div>;

  return (
    <ScheduleStoreProvider projectId={id}>
      <div className="max-w-screen-2xl mx-auto w-full animate-fade-in pb-10 flex flex-col min-h-full text-primary">
      
      <header className="mb-8 shrink-0">
        <div
          className="relative overflow-hidden rounded-[28px] border bg-[var(--bg-surface)] p-6 sm:p-8"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 12%, var(--border-subtle))',
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 96%, white 4%), color-mix(in srgb, var(--bg-surface) 82%, var(--bg-panel) 18%))',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32"
            style={{
              background: 'radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary) 14%, transparent), transparent 48%), radial-gradient(circle at top right, color-mix(in srgb, var(--shell-ambient-2) 72%, transparent), transparent 28%)',
            }}
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <ProjectBadge project={project} size={68} />

              <div className="min-w-0">
                <nav className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  <Link href="/projects" className="transition-colors hover:text-[var(--text-primary)]">
                    Projects
                  </Link>
                  <span>/</span>
                  <span className="truncate text-[var(--accent-primary)]">{project.prefix}</span>
                </nav>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-[var(--accent-primary)]">
                    {project.prefix}
                  </span>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    Product delivery workspace
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-heading)] sm:text-[2rem]">
                  {project.name}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                  {project.description || 'Plan work, align the team, and keep every sprint, meeting, document, and milestone connected in one polished project workspace.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Issues tracked</div>
                <div className="mt-1 text-2xl font-semibold text-[var(--text-heading)]">{cards.length}</div>
              </div>

              {canWrite && (
                <button
                  onClick={() => {
                    setCreateIssueContext({ sprintId: null });
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 rounded-[3px] bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0065FF]"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  Create Issue
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mb-6 shrink-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-sm">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]'
              }`}
              style={activeTab === tab.id ? {
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 12%, white 88%), color-mix(in srgb, var(--accent-subtle) 85%, white 15%))',
                boxShadow: '0 10px 30px rgba(37, 99, 235, 0.08)',
              } : undefined}
            >
              <tab.icon size={16} />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 shrink-0 flex flex-col">
        {activeTab === 'list' && (
          <ErrorBoundary>
            <div className="flex flex-col flex-1 animate-fade-in">

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search by ID or title..." 
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-panel-hover)]"
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
                      <tr
                        key={card.id}
                        className="hover:bg-[var(--bg-panel-hover)] transition-colors group cursor-pointer"
                        onClick={() => setSelectedCard(card)}
                      >
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
                            <UserAvatar user={card.assignee} size={24} className="border border-[var(--border-subtle)]" />
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
          </ErrorBoundary>
        )}

        {activeTab === 'board' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col min-h-[600px] h-full">
              <KanbanBoard
                projectId={id}
                refreshNonce={refreshNonce}
                sharedCards={cards}
                onCardUpdated={handleBoardCardUpdated}
              />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'backlog' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <SprintManager projectId={id} refreshNonce={refreshNonce} />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'gantt' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <GanttChart projectId={id} refreshNonce={refreshNonce} />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'calendar' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <CalendarGrid projectId={id} onItemSelect={setSelectedCard} />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'dsm' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <DSMPanel projectId={id} />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'meetings' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <MeetingReviewsPanel projectId={id} />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'goals' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <GoalsPanel projectId={id} />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'docs' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <DocsWorkspacePanel projectId={id} />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'views' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <WorkspaceViewsPanel projectId={id} />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'ai-tools' && (
          <ErrorBoundary>
            <div className="flex-1 animate-fade-in flex flex-col">
              <AIToolsPanel projectId={id} />
            </div>
          </ErrorBoundary>
        )}

        {!tabs.some((tab) => tab.id === activeTab) && (
          <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
            Unknown tab selected. Redirecting to List View.
          </div>
        )}
      </div>

      {showModal && (
        <CreateTicketModal
          projectId={id}
          defaultSprintId={createIssueContext.sprintId}
          onClose={() => {
            setShowModal(false);
            setCreateIssueContext({ sprintId: null });
          }}
          onCreated={handleCreated}
        />
      )}

      {selectedCard && (
        <CardDetail
          key={selectedCard.id}
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={handleSaveCard}
          isSaving={isSavingCard}
        />
      )}

      </div>
    </ScheduleStoreProvider>
  );
}

