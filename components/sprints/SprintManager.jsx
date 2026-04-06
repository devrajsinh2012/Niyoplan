'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, closestCorners, pointerWithin, MouseSensor, TouchSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { CSS } from '@dnd-kit/utilities';
import './SprintManager.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, MoreHorizontal, Search, Zap } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import InputModal from '@/components/ui/InputModal';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import SprintInsightsModal from '@/components/sprints/SprintInsightsModal';
import confetti from 'canvas-confetti';
import Portal from '@/components/modals/Portal';


const issueTypeIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'bug') return { color: 'var(--priority-highest)', bg: 'color-mix(in srgb, var(--priority-highest) 16%, transparent)', icon: '🐛' };
  if (t === 'story') return { color: 'var(--status-done-text)', bg: 'var(--status-done-bg)', icon: '📖' };
  if (t === 'epic') return { color: 'var(--status-inreview-text)', bg: 'var(--status-inreview-bg)', icon: '⚡' };
  return { color: 'var(--accent-primary)', bg: 'var(--accent-subtle)', icon: '✅' }; // task
};

const DraggableIssue = React.memo(function DraggableIssue({ issue }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${issue.id}`,
    data: { issueId: issue.id }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  const typeData = issueTypeIcon(issue.issue_type);
  const statusLabels = {
    'done': 'DONE',
    'todo': 'TO DO',
    'in_progress': 'IN PROGRESS',
    'in_review': 'IN REVIEW'
  };
  
  const statusLabel = statusLabels[issue.status] || (issue.status || 'TO DO').toUpperCase();
  const statusColorMap = {
    'DONE': 'var(--status-done)',
    'IN PROGRESS': 'var(--status-inprogress)',
    'TO DO': 'var(--status-todo)',
    'IN REVIEW': 'var(--status-review)'
  };

  const bgMap = {
    'DONE': 'var(--bg-done)',
    'IN PROGRESS': 'var(--bg-inprogress)',
    'TO DO': 'var(--bg-todo)',
    'IN REVIEW': 'var(--bg-review)'
  };

  return (
    <div ref={setNodeRef} style={style} className={`backlog-row ${isDragging ? 'dragging' : ''}`} {...attributes} {...listeners}>
      <div className="backlog-row-left">
        <input type="checkbox" onClick={e => e.stopPropagation()} className="row-checkbox" />
        <div style={{
          width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: typeData.bg, fontSize: 13, flexShrink: 0
        }}>
          {typeData.icon}
        </div>
        <span className="backlog-prefix">{issue.prefix || issue.custom_id}</span>
        <span className="backlog-title">{issue.title}</span>
      </div>
      <div className="backlog-row-right">
        <div className="status-badge" style={{ color: statusColorMap[statusLabel] || 'var(--status-todo)', background: bgMap[statusLabel] || 'var(--bg-todo)' }}>
          {statusLabel}
        </div>
        {issue.assignee && (
          <div className="row-assignee" title={issue.assignee?.full_name || ''}>
            <UserAvatar user={issue.assignee} size={24} />
          </div>
        )}
        <div className="story-points">{issue.story_points || '-'}</div>
      </div>
    </div>
  );
});

const DropZone = React.memo(function DropZone({ id, children }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`sprint-dropzone ${isOver ? 'dropzone-over' : ''}`}>
      {children}
    </div>
  );
});

const DragIssueOverlay = React.memo(function DragIssueOverlay({ issue }) {
  if (!issue) return null;
  const typeData = issueTypeIcon(issue.issue_type);
  return (
    <div className="backlog-row drag-overlay-row">
      <div className="backlog-row-left">
        <div style={{ width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: typeData.bg, fontSize: 13, flexShrink: 0 }}>
          {typeData.icon}
        </div>
        <span className="backlog-prefix">{issue.prefix || issue.custom_id}</span>
        <span className="backlog-title">{issue.title}</span>
      </div>
    </div>
  );
});

export default function SprintManager({ projectId, refreshNonce = 0 }) {
  const { profile } = useAuth();
  const [sprints, setSprints] = useState([]);
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState({});
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [insightsSprintId, setInsightsSprintId] = useState(null);
  const [openMenuSprintId, setOpenMenuSprintId] = useState(null);
  const [editingSprint, setEditingSprint] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', goal: '', start_date: '', end_date: '' });
  const [activeIssue, setActiveIssue] = useState(null);
  const [showCompleteSprintModal, setShowCompleteSprintModal] = useState(false);
  const [pendingCompleteSprint, setPendingCompleteSprint] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const collisionDetectionStrategy = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCorners(args);
  }, []);

  const toggleCollapse = id => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const fetchSprintsAndBacklog = useCallback(async () => {
    try {
      const [sprintsRes, cardsRes] = await Promise.all([
        supabase.from('sprints').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('cards').select('*, assignee:profiles!cards_assignee_id_fkey(full_name, avatar_url)').eq('project_id', projectId).order('rank', { ascending: true })
      ]);

      if (sprintsRes.error) throw sprintsRes.error;
      if (cardsRes.error) throw cardsRes.error;

      setSprints(sprintsRes.data);
      setCards(cardsRes.data.map(c => ({...c, prefix: c.custom_id})) || []);
    } catch (err) {
      toast.error('Failed to load Sprint data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchSprintsAndBacklog();
  }, [projectId, refreshNonce, fetchSprintsAndBacklog]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCreateSprint = async (name) => {
    if (!name?.trim()) return;

    const { data, error } = await supabase.from('sprints').insert({
      project_id: projectId, name: name.trim(), status: 'planning'
    }).select().single();

    if (error) {
      toast.error('Failed to create sprint');
    } else {
      setSprints([data, ...sprints]);
      toast.success('Sprint created');
      setShowCreateSprintModal(false);
    }
  };

  const updateSprintStatus = async (sprint, status, sprintIssues = [], skipConfirm = false) => {
    if (!sprint?.id) return;

    if (status === 'completed' && !skipConfirm) {
      const openIssues = sprintIssues.filter((issue) => issue.status !== 'done').length;
      if (openIssues > 0) {
        setPendingCompleteSprint({ sprint, issues: sprintIssues, openIssues });
        setShowCompleteSprintModal(true);
        return;
      }
    }

    const nextPayload = { status };
    if (status === 'active' && !sprint.start_date) {
      const now = new Date();
      const twoWeeksOut = new Date(now);
      twoWeeksOut.setDate(now.getDate() + 14);
      nextPayload.start_date = now.toISOString();
      nextPayload.end_date = sprint.end_date || twoWeeksOut.toISOString();
    }

    const { error } = await supabase.from('sprints').update(nextPayload).eq('id', sprint.id);
    if (error) { toast.error('Failed to update status'); }
    else {
      setSprints(sprints.map(s => s.id === sprint.id ? { ...s, ...nextPayload } : s));
      toast.success(`Sprint marked as ${status}`);

      // Trigger celebration if completed
      if (status === 'completed') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0052CC', '#22A06B', '#E34935', '#6554C0']
        });
      }
    }
  };

  const filteredCards = useMemo(() => {
    let result = [...cards];

    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      result = result.filter((card) => {
        const title = (card.title || '').toLowerCase();
        const key = (card.custom_id || '').toLowerCase();
        return title.includes(query) || key.includes(query);
      });
    }

    if (onlyMyIssues && profile?.id) {
      result = result.filter((card) => card.assignee_id === profile.id);
    }

    if (recentOnly) {
      result.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    }

    return result;
  }, [cards, onlyMyIssues, profile?.id, recentOnly, searchText]);

  const cardsBySprint = useMemo(() => {
    const map = new Map();
    filteredCards.forEach((card) => {
      if (!card.sprint_id) return;
      if (!map.has(card.sprint_id)) map.set(card.sprint_id, []);
      map.get(card.sprint_id).push(card);
    });
    return map;
  }, [filteredCards]);

  const filteredBacklog = useMemo(
    () => filteredCards.filter((card) => !card.sprint_id),
    [filteredCards]
  );

  const activeSprint = useMemo(
    () => sprints.find((sprint) => sprint.status === 'active') || sprints[0] || null,
    [sprints]
  );

  const teammateCount = useMemo(() => {
    const ids = new Set(filteredCards.map((card) => card.assignee_id).filter(Boolean));
    if (profile?.id && ids.has(profile.id)) ids.delete(profile.id);
    return ids.size;
  }, [filteredCards, profile?.id]);

  const statusCounts = useMemo(() => {
    let todo = 0;
    let inProgress = 0;
    let done = 0;

    cards.forEach((issue) => {
      const status = (issue.status || '').toLowerCase();
      if (status === 'done') {
        done += 1;
      } else if (status.includes('progress') || status.includes('review')) {
        inProgress += 1;
      } else {
        todo += 1;
      }
    });

    return { todo, inProgress, done };
  }, [cards]);

  const dispatchCreateIssue = (sprintId = null) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('niyoplan:create-issue', { detail: { sprintId } }));
  };

  const openInsightsForSprint = (sprintId) => {
    setInsightsSprintId(sprintId || activeSprint?.id || null);
    setShowInsights(true);
  };

  const openEditSprint = (sprint) => {
    setEditingSprint(sprint);
    setEditForm({
      name: sprint.name || '',
      goal: sprint.goal || '',
      start_date: sprint.start_date ? new Date(sprint.start_date).toISOString().slice(0, 10) : '',
      end_date: sprint.end_date ? new Date(sprint.end_date).toISOString().slice(0, 10) : ''
    });
    setOpenMenuSprintId(null);
  };

  const handleSaveSprintEdit = async () => {
    if (!editingSprint?.id) return;
    const payload = {
      name: editForm.name?.trim() || editingSprint.name,
      goal: editForm.goal?.trim() || null,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
      status: editingSprint.status,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('sprints')
      .update(payload)
      .eq('id', editingSprint.id)
      .eq('project_id', projectId)
      .select('*')
      .single();

    if (error) {
      toast.error('Failed to update sprint');
      return;
    }

    setSprints((prev) => prev.map((item) => item.id === data.id ? data : item));
    setEditingSprint(null);
    toast.success('Sprint updated');
  };

  const deleteSprint = async (sprint) => {
    setOpenMenuSprintId(null);
    const sprintIssues = cardsBySprint.get(sprint.id) || [];
    const warning = sprintIssues.length > 0
      ? `This sprint has ${sprintIssues.length} issue(s). They will move to Unplanned.`
      : 'Are you sure?';
    setShowDeleteConfirm({ sprint, message: warning });
  };

  const confirmDeleteSprint = async () => {
    if (!showDeleteConfirm?.sprint) return;
    const sprint = showDeleteConfirm.sprint;
    const sprintIssues = cardsBySprint.get(sprint.id) || [];
    
    setIsDeleting(true);
    try {
      if (sprintIssues.length > 0) {
        const ids = sprintIssues.map((issue) => issue.id);
        const { error: moveError } = await supabase
          .from('cards')
          .update({ sprint_id: null })
          .in('id', ids);

        if (moveError) {
          toast.error('Failed to move sprint issues');
          return;
        }

        setCards((prev) => prev.map((card) => ids.includes(card.id) ? { ...card, sprint_id: null } : card));
      }

      const { error } = await supabase
        .from('sprints')
        .delete()
        .eq('id', sprint.id);

      if (error) throw error;
      setSprints((prev) => prev.filter((s) => s.id !== sprint.id));
      toast.success('Sprint deleted');
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete sprint');
    } finally {
      setIsDeleting(false);
    }
  };

  const assignCardToSprint = async (cardId, sprintId) => {
    const previousCards = typeof structuredClone === 'function'
      ? structuredClone(cards)
      : cards.map((card) => ({ ...card }));

    setCards((prev) => prev.map((card) => (String(card.id) === String(cardId) ? { ...card, sprint_id: sprintId } : card)));

    try {
      const { error } = await supabase.from('cards').update({ sprint_id: sprintId }).eq('id', cardId);
      if (error) throw error;
    } catch (error) {
      setCards(previousCards);
      toast.error('Failed to update sprint assignment');
      return;
    }

    toast.success(sprintId ? 'Issue moved to sprint' : 'Issue moved to backlog');
  };

  const handleDragCancel = () => {
    setActiveIssue(null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveIssue(null);
    if (!active?.id || !over?.id) return;

    const activeId = String(active.id);
    if (!activeId.startsWith('card-')) return;

    const overId = String(over.id);
    let targetSprintId = null;
    if (overId.startsWith('sprint-')) {
      const targetToken = overId.replace('sprint-', '');
      targetSprintId = sprints.find((sprint) => String(sprint.id) === targetToken)?.id ?? targetToken;
    } else if (overId !== 'backlog') {
      return;
    }

    const currentCard = cards.find((card) => `card-${card.id}` === activeId);
    if (!currentCard) return;

    const currentSprintId = currentCard.sprint_id == null ? null : String(currentCard.sprint_id);
    const nextSprintId = targetSprintId == null ? null : String(targetSprintId);
    if (currentSprintId === nextSprintId) return;

    await assignCardToSprint(currentCard.id, targetSprintId);
  };

  const handleDragStart = (event) => {
    const activeId = String(event?.active?.id || '');
    if (!activeId.startsWith('card-')) return;
    const issue = cards.find((card) => `card-${card.id}` === activeId) || null;
    setActiveIssue(issue);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border-strong)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  const sprintDragOverlay = (
    <DragOverlay adjustScale={false} dropAnimation={null}>
      <DragIssueOverlay issue={activeIssue} />
    </DragOverlay>
  );

  return (
    <div className="backlog-wrapper animate-fade-in">
      <header className="backlog-header-main">
        <h2 className="backlog-title">Sprint</h2>
        <div className="backlog-header-actions">
          <button className="rounded-[3px] border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--bg-panel-hover)] transition-colors flex items-center gap-1.5" onClick={() => openInsightsForSprint(activeSprint?.id)}><MoreHorizontal size={14} /> Insights</button>
           <button className="bg-[var(--accent-primary)] text-white px-4 py-1.5 rounded-[3px] text-sm font-semibold hover:opacity-90 transition-colors" onClick={() => setShowCreateSprintModal(true)}>Create Sprint</button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="backlog-filter-bar">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search sprint issues"
            className="backlog-search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        
        <div className="avatar-filters">
           <button type="button" className="avatar-filter-btn" onClick={() => setOnlyMyIssues(true)}>
             <UserAvatar user={profile} size={24} />
           </button>
           <div className="avatar-filter-others">+{teammateCount}</div>
        </div>

        <button className="filter-text-btn" onClick={() => setOnlyMyIssues((prev) => !prev)}>{onlyMyIssues ? 'All issues' : 'Only my issues'}</button>
        <button className="filter-text-btn" onClick={() => setRecentOnly((prev) => !prev)}>{recentOnly ? 'Default order' : 'Recently updated'}</button>

        <div className="filter-spacer" />
        
        <div className="filter-stats">
          <span className="stat-pill"><span className="dot todo" /> {statusCounts.todo} Issues</span>
          <span className="stat-pill"><span className="dot inprogress" /> {statusCounts.inProgress} In Progress</span>
          <span className="stat-pill"><span className="dot done" /> {statusCounts.done} Done</span>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
        <div className="sprint-list">
          {sprints.map(sprint => {
            const sprintIssues = cardsBySprint.get(sprint.id) || [];
            const isColl = collapsed[sprint.id];
            const dates = sprint.start_date 
              ? `${new Date(sprint.start_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${sprint.end_date ? new Date(sprint.end_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'TBD'}`
              : '';
            
            return (
              <div key={sprint.id} className="sprint-block card">
                <div className="sprint-block-header">
                  <div className="sprint-block-left" onClick={() => toggleCollapse(sprint.id)}>
                    <button className="collapse-btn">
                      {isColl ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <h3 className="sprint-name">{sprint.name}</h3>
                    <span className="sprint-meta">{sprintIssues.length} issues {dates && `· ${dates}`}</span>
                  </div>
                  <div className="sprint-block-right">
                    <div className="relative">
                      <button className="btn-icon rounded p-1 hover:bg-[var(--bg-panel-hover)] transition-colors" onClick={() => setOpenMenuSprintId((prev) => prev === sprint.id ? null : sprint.id)}><MoreHorizontal size={16} /></button>
                      {openMenuSprintId === sprint.id && (
                        <div className="absolute right-0 top-8 z-20 min-w-[180px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1 shadow-lg">
                          <button className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]" onClick={() => openEditSprint(sprint)}>Edit sprint</button>
                          <button className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]" onClick={() => { openInsightsForSprint(sprint.id); setOpenMenuSprintId(null); }}>Manage sprint</button>
                          <button className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50/10" onClick={() => deleteSprint(sprint)}>Delete sprint</button>
                        </div>
                      )}
                    </div>
                    {sprint.status === 'planning' && <button className="rounded-[3px] border border-[var(--border-subtle)] px-3 py-1 text-sm font-medium hover:bg-[var(--bg-panel-hover)] transition-colors" onClick={() => updateSprintStatus(sprint, 'active', sprintIssues)}>Start Sprint</button>}
                    {sprint.status === 'active' && <button className="bg-[var(--accent-primary)] text-white px-3 py-1 rounded-[3px] text-sm font-semibold hover:opacity-90 transition-colors" onClick={() => updateSprintStatus(sprint, 'completed', sprintIssues)}>Complete Sprint</button>}
                  </div>
                </div>

                {!isColl && (
                  <DropZone id={`sprint-${sprint.id}`}>
                    {sprintIssues.length ? (
                      <div className="backlog-items">
                        {sprintIssues.map((item) => <DraggableIssue key={item.id} issue={item} />)}
                      </div>
                    ) : (
                      <div className="empty-sprint-text">Plan a sprint by dragging work items into it, or by dragging the sprint footer.</div>
                    )}
                    <button className="create-issue-inline" onClick={() => dispatchCreateIssue(sprint.id)}>+ Create issue</button>
                  </DropZone>
                )}
              </div>
            );
          })}
        </div>

        {/* Backlog Section */}
        <div className="sprint-block backlog-block">
          <div className="sprint-block-header">
            <div className="sprint-block-left" onClick={() => toggleCollapse('backlog')}>
              <button className="collapse-btn">
                {collapsed['backlog'] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
              <h3 className="sprint-name">Unplanned</h3>
              <span className="sprint-meta">({filteredBacklog.length} issues)</span>
            </div>
            <div className="sprint-block-right">
               <button className="rounded-[3px] border border-[var(--border-subtle)] px-3 py-1 text-sm font-medium hover:bg-[var(--bg-panel-hover)] transition-colors" onClick={() => setShowCreateSprintModal(true)}>Create Sprint</button>
            </div>
          </div>

          {!collapsed['backlog'] && (
            <DropZone id="backlog">
              {filteredBacklog.length ? (
                <div className="backlog-items">
                  {filteredBacklog.map((item) => <DraggableIssue key={item.id} issue={item} />)}
                </div>
              ) : (
                <div className="empty-sprint-text border-dashed">No unplanned issues.</div>
              )}
              <button className="create-issue-inline" onClick={() => dispatchCreateIssue(null)}>+ Create issue</button>
            </DropZone>
          )}
        </div>
        {isClient ? createPortal(sprintDragOverlay, document.body) : null}
      </DndContext>

      {editingSprint && (
        <div className="fixed inset-0 z-[2150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setEditingSprint(null)}>
          <div className="w-full max-w-lg rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-[var(--text-heading)]">Edit Sprint</h3>
            <div className="space-y-3">
              <input className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]" value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Sprint name" />
              <textarea className="min-h-[90px] w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]" value={editForm.goal} onChange={(e) => setEditForm((prev) => ({ ...prev, goal: e.target.value }))} placeholder="Sprint goal" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="rounded border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]" value={editForm.start_date} onChange={(e) => setEditForm((prev) => ({ ...prev, start_date: e.target.value }))} />
                <input type="date" className="rounded border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]" value={editForm.end_date} onChange={(e) => setEditForm((prev) => ({ ...prev, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded border border-[var(--border-subtle)] px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]" onClick={() => setEditingSprint(null)}>Cancel</button>
              <button className="rounded bg-[var(--accent-primary)] px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 shadow-sm" onClick={handleSaveSprintEdit}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {showInsights && insightsSprintId && (
        <SprintInsightsModal
          projectId={projectId}
          sprintId={insightsSprintId}
          onClose={() => setShowInsights(false)}
        />
      )}

      {showCompleteSprintModal && pendingCompleteSprint && (
        <Portal>
          <div className="fixed inset-0 z-[10000] bg-[#091E42]/60 backdrop-blur-[4px] flex justify-center items-center p-4" onClick={() => setShowCompleteSprintModal(false)}>
            <div className="relative w-full max-w-[560px] bg-[var(--bg-surface)] rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden transition-all ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
                <h3 className="text-xl font-bold text-[var(--text-heading)] tracking-tight">Complete Sprint</h3>
                <button
                  type="button"
                  onClick={() => setShowCompleteSprintModal(false)}
                  className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)] hover:text-[#0052CC] transition-all"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0 text-left">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  <span className="font-bold text-[var(--text-primary)]">{pendingCompleteSprint.openIssues} issue(s)</span> are not done yet. Complete sprint anyway?
                </p>
              </div>

              <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
                <button
                  className="rounded-[3px] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] active:scale-95"
                  onClick={() => setShowCompleteSprintModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-[3px] bg-[#0052CC] px-7 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00388D] active:scale-95"
                  onClick={() => {
                    setShowCompleteSprintModal(false);
                    updateSprintStatus(pendingCompleteSprint.sprint, 'completed', pendingCompleteSprint.issues, true);
                  }}
                >
                  Complete Sprint
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Create Sprint Modal */}
      <InputModal
        isOpen={showCreateSprintModal}
        onClose={() => setShowCreateSprintModal(false)}
        onSubmit={handleCreateSprint}
        title="Create Sprint"
        label="Sprint Name"
        placeholder="e.g. Sprint 4, Q1 Sprint 2"
        icon={Zap}
        submitLabel="Create Sprint"
        maxLength={50}
      />
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm !== null}
        title="Delete Sprint"
        message={showDeleteConfirm?.message || 'Are you sure you want to delete this sprint?'}
        onConfirm={confirmDeleteSprint}
        onCancel={() => setShowDeleteConfirm(null)}
        isLoading={isDeleting}
      />    </div>
  );
}
