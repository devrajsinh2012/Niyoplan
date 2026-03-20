'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import './SprintManager.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, MoreHorizontal, Search } from 'lucide-react';

const issueTypeIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'bug') return { color: '#E34935', bg: 'rgba(227,73,53,0.15)', icon: '🐛' };
  if (t === 'story') return { color: '#22A06B', bg: 'rgba(34,160,107,0.15)', icon: '📖' };
  if (t === 'epic') return { color: '#6554C0', bg: 'rgba(101,84,192,0.15)', icon: '⚡' };
  return { color: '#0C66E4', bg: 'rgba(12,102,228,0.15)', icon: '✅' }; // task
};

function DraggableIssue({ issue }) {
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

  const initials = issue.assignee?.full_name
    ? issue.assignee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

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
        {(issue.assignee || initials) && (
          <div className="row-assignee" title={issue.assignee?.full_name || ''}>
            {issue.assignee?.avatar_url
              ? <Image src={issue.assignee.avatar_url} alt="" width={24} height={24} />
              : initials}
          </div>
        )}
        <div className="story-points">{issue.story_points || '-'}</div>
      </div>
    </div>
  );
}

function DropZone({ id, children }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`sprint-dropzone ${isOver ? 'dropzone-over' : ''}`}>
      {children}
    </div>
  );
}

export default function SprintManager({ projectId, refreshNonce = 0 }) {
  const { profile } = useAuth();
  const [sprints, setSprints] = useState([]);
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  const handleCreateSprint = async () => {
    const name = prompt('Sprint Name (e.g. Sprint 4):');
    if (!name) return;

    const { data, error } = await supabase.from('sprints').insert({
      project_id: projectId, name, status: 'planning'
    }).select().single();

    if (error) { toast.error('Failed to create sprint'); }
    else {
      setSprints([data, ...sprints]);
      toast.success('Sprint created');
    }
  };

  const updateSprintStatus = async (id, status) => {
    const { error } = await supabase.from('sprints').update({ status }).eq('id', id);
    if (error) { toast.error('Failed to update status'); }
    else {
      setSprints(sprints.map(s => s.id === id ? { ...s, status } : s));
      toast.success(`Sprint marked as ${status}`);
    }
  };

  const backlog = useMemo(() => cards.filter((card) => !card.sprint_id), [cards]);

  const cardsBySprint = useMemo(() => {
    const map = new Map();
    cards.forEach((card) => {
      if (!card.sprint_id) return;
      if (!map.has(card.sprint_id)) map.set(card.sprint_id, []);
      map.get(card.sprint_id).push(card);
    });
    return map;
  }, [cards]);

  const assignCardToSprint = async (cardId, sprintId) => {
    const previousCards = cards;
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, sprint_id: sprintId } : card)));

    const { error } = await supabase.from('cards').update({ sprint_id: sprintId }).eq('id', cardId);
    if (error) {
      setCards(previousCards);
      toast.error('Failed to update sprint assignment');
      return;
    }
    toast.success(sprintId ? 'Issue moved to sprint' : 'Issue moved to backlog');
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!active?.id || !over?.id) return;

    const activeId = String(active.id);
    if (!activeId.startsWith('card-')) return;
    const cardId = activeId.replace('card-', '');

    const overId = String(over.id);
    let targetSprintId = null;
    if (overId.startsWith('sprint-')) {
      targetSprintId = overId.replace('sprint-', '');
    } else if (overId !== 'backlog') {
      return;
    }

    const currentCard = cards.find((card) => card.id === cardId);
    if (!currentCard || currentCard.sprint_id === targetSprintId) return;
    await assignCardToSprint(cardId, targetSprintId);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border-strong)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  const getStatusCounts = (issues) => {
    let todo = 0, inProgress = 0, done = 0;
    issues.forEach(i => {
      const s = (i.status || '').toLowerCase();
      if (s === 'done') done++;
      else if (s.includes('progress') || s.includes('review')) inProgress++;
      else todo++;
    });
    return { todo, inProgress, done };
  };

  return (
    <div className="backlog-wrapper animate-fade-in">
      <header className="backlog-header-main">
        <h2 className="backlog-title">Backlog</h2>
        <div className="backlog-header-actions">
           <button className="rounded-[3px] border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--bg-panel-hover)] transition-colors flex items-center gap-1.5"><MoreHorizontal size={14} /> Insights</button>
           <button className="bg-[#0052CC] text-white px-4 py-1.5 rounded-[3px] text-sm font-semibold hover:bg-[#0065FF] transition-colors" onClick={handleCreateSprint}>Create Sprint</button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="backlog-filter-bar">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input type="text" placeholder="Search backlog" className="backlog-search" />
        </div>
        
        <div className="avatar-filters">
           <div className="avatar-filter-btn">
             {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={24} height={24} /> : (profile?.full_name?.charAt(0) || 'U')}
           </div>
           <div className="avatar-filter-others">+5</div>
        </div>

        <button className="filter-text-btn">Only my issues</button>
        <button className="filter-text-btn">Recently updated</button>

        <div className="filter-spacer" />
        
        <div className="filter-stats">
          <span className="stat-pill"><span className="dot todo" /> {getStatusCounts(cards).todo} Issues</span>
          <span className="stat-pill"><span className="dot inprogress" /> {getStatusCounts(cards).inProgress} In Progress</span>
          <span className="stat-pill"><span className="dot done" /> {getStatusCounts(cards).done} Done</span>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
                    <button className="btn-icon rounded p-1 hover:bg-slate-200 transition-colors"><MoreHorizontal size={16} /></button>
                    {sprint.status === 'planning' && <button className="rounded-[3px] border border-[var(--border-subtle)] px-3 py-1 text-sm font-medium hover:bg-slate-200 transition-colors" onClick={() => updateSprintStatus(sprint.id, 'active')}>Start Sprint</button>}
                    {sprint.status === 'active' && <button className="bg-[#0052CC] text-white px-3 py-1 rounded-[3px] text-sm font-semibold hover:bg-[#0065FF] transition-colors" onClick={() => updateSprintStatus(sprint.id, 'completed')}>Complete Sprint</button>}
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
                    <button className="create-issue-inline">+ Create issue</button>
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
              <h3 className="sprint-name">Backlog</h3>
              <span className="sprint-meta">({backlog.length} issues)</span>
            </div>
            <div className="sprint-block-right">
               <button className="rounded-[3px] border border-[var(--border-subtle)] px-3 py-1 text-sm font-medium hover:bg-slate-200 transition-colors" onClick={handleCreateSprint}>Create Sprint</button>
            </div>
          </div>

          {!collapsed['backlog'] && (
            <DropZone id="backlog">
              {backlog.length ? (
                <div className="backlog-items">
                  {backlog.map((item) => <DraggableIssue key={item.id} issue={item} />)}
                </div>
              ) : (
                <div className="empty-sprint-text border-dashed">Your backlog is empty.</div>
              )}
              <button className="create-issue-inline">+ Create issue</button>
            </DropZone>
          )}
        </div>
      </DndContext>
    </div>
  );
}
