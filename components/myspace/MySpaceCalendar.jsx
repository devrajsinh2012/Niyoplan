'use client';

/**
 * MySpaceCalendar — Calendar tab for My Space.
 * Plots cards by due_date. Color coded by project.
 * Implements a Google Calendar clone layout with a left filtering panel
 * and an interactive event detail popup modal.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  startOfToday,
  addDays,
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Search, 
  Filter, 
  X, 
  Clock, 
  Tag, 
  ExternalLink, 
  CheckCircle2, 
  FileText,
  User,
  Building
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Generate a stable color per project prefix
const PROJECT_COLORS = [
  '#0052CC', '#6554C0', '#00875A', '#FF5630', '#FF8B00',
  '#00A3BF', '#403294', '#BF2600', '#006644', '#0747A6',
];

function getProjectColor(prefix) {
  if (!prefix) return PROJECT_COLORS[0];
  const idx = prefix.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % PROJECT_COLORS.length;
  return PROJECT_COLORS[idx];
}

const PRIORITY_BADGES = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-amber-100 text-amber-800 border-amber-200',
  medium: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const STATUS_BADGES = {
  backlog: 'bg-gray-100 text-gray-800 border-gray-200',
  todo: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-sky-100 text-sky-800 border-sky-200',
  in_review: 'bg-purple-100 text-purple-800 border-purple-200',
  done: 'bg-green-100 text-green-800 border-green-200',
};

export default function MySpaceCalendar({ cards }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(startOfToday());
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  
  // Modal details state
  const [selectedCard, setSelectedCard] = useState(null);

  // Extract all unique projects from cards to initialize filter
  const projectsList = useMemo(() => {
    const list = new Map();
    (cards || []).forEach(card => {
      if (card.projects?.prefix) {
        list.set(card.projects.prefix, {
          prefix: card.projects.prefix,
          name: card.projects.name || card.projects.prefix,
          orgName: card.projects.organizations?.name || '',
          color: getProjectColor(card.projects.prefix)
        });
      }
    });
    return Array.from(list.values());
  }, [cards]);

  // Set default visible projects
  useEffect(() => {
    if (projectsList.length > 0 && selectedProjects.size === 0) {
      setSelectedProjects(new Set(projectsList.map(p => p.prefix)));
    }
  }, [projectsList, selectedProjects.size]);

  // Filter cards based on project checkboxes and search query
  const filteredCards = useMemo(() => {
    return (cards || []).filter(card => {
      // Must have due date
      if (!card.due_date) return false;
      
      // Project filter
      const prefix = card.projects?.prefix;
      if (prefix && !selectedProjects.has(prefix)) return false;

      // Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const titleMatch = (card.title || '').toLowerCase().includes(query);
        const idMatch = (card.custom_id || '').toLowerCase().includes(query);
        const descMatch = (card.description || '').toLowerCase().includes(query);
        if (!titleMatch && !idMatch && !descMatch) return false;
      }

      return true;
    });
  }, [cards, selectedProjects, searchQuery]);

  // Build a map of date → cards
  const cardsByDate = useMemo(() => {
    const map = {};
    filteredCards.forEach(card => {
      try {
        const dateKey = format(parseISO(card.due_date), 'yyyy-MM-dd');
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(card);
      } catch {}
    });
    return map;
  }, [filteredCards]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleToggleProject = (prefix) => {
    const next = new Set(selectedProjects);
    if (next.has(prefix)) {
      next.delete(prefix);
    } else {
      next.add(prefix);
    }
    setSelectedProjects(next);
  };

  const handleToggleAllProjects = () => {
    if (selectedProjects.size === projectsList.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projectsList.map(p => p.prefix)));
    }
  };

  // Helper count variables
  const totalCardsCount = (cards || []).length;
  const cardsWithoutDatesCount = (cards || []).filter(c => !c.due_date).length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* ── LEFT PANEL: FILTERS & DETAILS (Google Calendar style) ── */}
      <div 
        className="w-full lg:w-64 shrink-0 rounded-xl border p-4 shadow-sm"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        {/* Calendar Stats & Title */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--accent-primary)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Filters</h3>
          </div>
          <span className="text-[10px] bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded-full font-bold text-[var(--text-secondary)]">
            {filteredCards.length} of {totalCardsCount} cards
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none transition-all focus:border-[var(--accent-primary)]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Project Selector ("My Calendars") */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[var(--text-heading)]">My Calendars</h4>
            {projectsList.length > 0 && (
              <button 
                onClick={handleToggleAllProjects}
                className="text-[10px] font-semibold text-[var(--accent-primary)] hover:underline"
              >
                {selectedProjects.size === projectsList.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          
          {projectsList.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)] py-2">No projects assigned.</p>
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
              {projectsList.map(project => {
                const checked = selectedProjects.has(project.prefix);
                return (
                  <label 
                    key={project.prefix}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--bg-panel-hover)] cursor-pointer text-xs font-medium text-[var(--text-secondary)] select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleProject(project.prefix)}
                      className="rounded border-[var(--border-subtle)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]/20 cursor-pointer h-3.5 w-3.5"
                    />
                    <span 
                      className="h-2.5 w-2.5 rounded-full shrink-0 border border-black/5"
                      style={{ background: project.color }}
                    />
                    <span className="truncate flex-1" title={`${project.prefix} - ${project.name}`}>
                      <strong className="font-bold text-[var(--text-heading)] mr-1">{project.prefix}</strong>
                      <span className="opacity-85">{project.name}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend / Stats */}
        {cardsWithoutDatesCount > 0 && (
          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-start gap-2 text-[10px] text-[var(--text-muted)]">
              <Clock size={12} className="shrink-0 mt-0.5" />
              <span>
                <strong>{cardsWithoutDatesCount} tasks</strong> do not have due dates and are not shown on the calendar.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: MAIN CALENDAR GRID ── */}
      <div className="flex-1 w-full">
        {/* Calendar Navigation Toolbar */}
        <div
          className="mb-4 flex items-center justify-between rounded-xl border p-3.5 shadow-sm"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-white shadow-sm">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-heading)] leading-none">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5 uppercase tracking-wider">Month view</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentDate(d => addDays(startOfMonth(d), -1))}
              className="rounded-lg border p-2 transition-all hover:bg-[var(--bg-panel-hover)] cursor-pointer hover:border-[var(--border-strong)] active:scale-95"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
              title="Previous Month"
            >
              <ChevronLeft size={15} className="text-[var(--text-secondary)]" />
            </button>
            <button
              onClick={() => setCurrentDate(startOfToday())}
              className="rounded-lg border px-3.5 py-2 text-xs font-bold transition-all hover:bg-[var(--bg-panel-hover)] cursor-pointer hover:border-[var(--border-strong)] active:scale-95"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(d => addDays(endOfMonth(d), 1))}
              className="rounded-lg border p-2 transition-all hover:bg-[var(--bg-panel-hover)] cursor-pointer hover:border-[var(--border-strong)] active:scale-95"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
              title="Next Month"
            >
              <ChevronRight size={15} className="text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div
          className="overflow-hidden rounded-xl border shadow-sm"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          {/* Day of Week Headers */}
          <div
            className="grid grid-cols-7 border-b"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div
                key={d}
                className="py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] select-none"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border-subtle)]">
            {days.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayCards = cardsByDate[dayKey] || [];
              const isThisMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, startOfToday());

              return (
                <div
                  key={dayKey}
                  className="min-h-[110px] p-2 flex flex-col transition-colors group relative"
                  style={{
                    background: isToday
                      ? 'var(--accent-subtle)'
                      : !isThisMonth
                      ? 'var(--bg-panel)/20'
                      : 'var(--bg-surface)',
                    opacity: !isThisMonth ? 0.45 : 1,
                  }}
                >
                  {/* Day cell header */}
                  <div className="flex justify-between items-center mb-1.5 select-none">
                    <span 
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold font-sans ${
                        isToday 
                          ? 'bg-[var(--accent-primary)] text-white shadow-sm' 
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayCards.length > 0 && (
                      <span className="text-[9px] font-bold text-[var(--text-muted)] px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {dayCards.length} tasks
                      </span>
                    )}
                  </div>

                  {/* Cards container */}
                  <div className="flex-1 flex flex-col gap-1 overflow-y-hidden">
                    {dayCards.slice(0, 3).map(card => {
                      const color = getProjectColor(card.projects?.prefix);
                      const isDone = card.status === 'done';
                      return (
                        <button
                          key={card.id}
                          onClick={() => setSelectedCard(card)}
                          className={`w-full truncate text-[10px] px-2 py-1 font-semibold rounded text-left border select-none transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                            isDone 
                              ? 'opacity-65 line-through decoration-black/40 border-black/10' 
                              : 'shadow-sm hover:brightness-[0.97]'
                          }`}
                          style={{
                            background: isDone ? 'var(--bg-panel-hover)' : `${color}15`,
                            color: isDone ? 'var(--text-secondary)' : color,
                            borderColor: isDone ? 'var(--border-subtle)' : `${color}35`,
                            borderLeft: `3px solid ${color}`,
                          }}
                          title={`${card.custom_id ? card.custom_id + ' : ' : ''}${card.title}`}
                        >
                          <span className="truncate flex-1">
                            {card.custom_id ? `${card.custom_id} ` : ''}{card.title}
                          </span>
                          {isDone && <CheckCircle2 size={10} className="shrink-0 text-green-600 ml-1" />}
                        </button>
                      );
                    })}
                    
                    {/* +N more indicator */}
                    {dayCards.length > 3 && (
                      <div className="text-[9px] font-extrabold text-[var(--text-muted)] pl-1.5 mt-0.5 select-none">
                        +{dayCards.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CARD DETAIL POPUP MODAL (Google Calendar style) ── */}
      {selectedCard && (() => {
        const card = selectedCard;
        const color = getProjectColor(card.projects?.prefix);
        const priorityClass = PRIORITY_BADGES[card.priority] || PRIORITY_BADGES.medium;
        const statusClass = STATUS_BADGES[card.status] || STATUS_BADGES.todo;
        
        return (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
            <div 
              className="w-full max-w-md rounded-xl border bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-scale-in relative border-[var(--border-subtle)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Colored top-border matching project */}
              <div className="h-2 w-full" style={{ background: color }} />

              {/* Close Button */}
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute right-3.5 top-5 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>

              {/* Modal Body */}
              <div className="p-5">
                {/* Project Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded bg-[var(--accent-subtle)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                    {card.custom_id || 'TASK'}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                    {card.projects?.organizations?.name && (
                      <>
                        <Building size={12} className="text-[var(--text-muted)]" />
                        <span className="font-semibold">{card.projects.organizations.name}</span>
                        <span>•</span>
                      </>
                    )}
                    <span className="opacity-90">{card.projects?.name || 'Personal'}</span>
                  </div>
                </div>

                {/* Card Title */}
                <h3 
                  className={`text-lg font-bold text-[var(--text-heading)] mb-4 leading-snug pr-6 ${
                    card.status === 'done' ? 'line-through decoration-black/30 text-[var(--text-muted)]' : ''
                  }`}
                >
                  {card.title}
                </h3>

                {/* Metadata details rows */}
                <div className="space-y-3.5 mb-6 text-xs">
                  {/* Due Date row */}
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <Clock size={14} className="text-[var(--text-muted)] shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-heading)]">Due Date:</span>
                      <span>
                        {card.due_date 
                          ? new Date(card.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                          : 'No due date set'}
                      </span>
                    </div>
                  </div>

                  {/* Status row */}
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <CheckCircle2 size={14} className="text-[var(--text-muted)] shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-heading)]">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                        {card.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Priority row */}
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <Tag size={14} className="text-[var(--text-muted)] shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-heading)]">Priority:</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${priorityClass}`}>
                        {card.priority}
                      </span>
                    </div>
                  </div>

                  {/* Assignee row */}
                  {card.assignee?.full_name && (
                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                      <User size={14} className="text-[var(--text-muted)] shrink-0" />
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-heading)]">Assignee:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[var(--accent-primary)]">
                            {card.assignee.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span>{card.assignee.full_name}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description segment */}
                  <div className="pt-3 border-t border-[var(--border-subtle)] flex gap-3 text-[var(--text-secondary)]">
                    <FileText size={14} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold text-[var(--text-heading)] block mb-1">Description</span>
                      <p className="text-[11px] leading-relaxed text-[var(--text-secondary)] bg-[var(--bg-panel)]/40 p-2.5 rounded-lg border border-[var(--border-subtle)]/50 max-h-[100px] overflow-y-auto whitespace-pre-line">
                        {card.description?.trim() || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-panel-hover)] px-3.5 py-2 text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer focus:outline-none"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCard(null);
                      router.push(`/projects/${card.project_id}?tab=board&cardId=${card.id}`);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer focus:outline-none"
                  >
                    <span>View on Board</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
