'use client';

/**
 * MySpaceListBoard — List/Board tab for My Space.
 * Has an internal toggle (local state) between List view and Board view.
 * Board mode uses StatusKanbanBoard (status-grouped, dnd-kit drag).
 * List mode groups cards by due date buckets.
 */

import React, { useState, useMemo } from 'react';
import { apiFetch } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import StatusKanbanBoard from './StatusKanbanBoard';
import { List, LayoutGrid, AlertCircle, Clock, CalendarDays, Calendar, Inbox } from 'lucide-react';
import {
  isToday,
  isThisWeek,
  isPast,
  parseISO,
} from 'date-fns';

const PRIORITY_COLORS = {
  urgent:  { bg: '#FFEBE6', text: '#BF2600', border: '#FF5630' },
  high:    { bg: '#FFF3CD', text: '#974F0C', border: '#FFAB00' },
  medium:  { bg: '#EAE6FF', text: '#403294', border: '#6554C0' },
  low:     { bg: '#E3FCEF', text: '#006644', border: '#36B37E' },
};

const STATUS_LABELS = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

function bucketsFromCards(cards) {
  const overdue = [];
  const today = [];
  const thisWeek = [];
  const later = [];
  const noDate = [];

  cards.forEach(card => {
    if (!card.due_date) {
      noDate.push(card);
      return;
    }
    const d = parseISO(card.due_date);
    if (isToday(d)) {
      today.push(card);
    } else if (isPast(d)) {
      overdue.push(card);
    } else if (isThisWeek(d, { weekStartsOn: 1 })) {
      thisWeek.push(card);
    } else {
      later.push(card);
    }
  });

  return [
    { label: 'Overdue', cards: overdue, icon: AlertCircle, color: '#BF2600' },
    { label: 'Today',   cards: today,   icon: Clock,        color: 'var(--accent-primary)' },
    { label: 'This Week', cards: thisWeek, icon: CalendarDays, color: '#6554C0' },
    { label: 'Later',   cards: later,   icon: Calendar,     color: 'var(--text-secondary)' },
    { label: 'No Date', cards: noDate,  icon: Inbox,        color: 'var(--text-muted)' },
  ];
}

function CardRow({ card }) {
  const priority = card.priority || 'medium';
  const pColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  const orgName = card.projects?.organizations?.name;
  const projectPrefix = card.projects?.prefix;
  const statusLabel = STATUS_LABELS[card.status] || card.status;

  return (
    <div
      className="flex items-center gap-4 border-b px-4 py-3 transition-colors hover:bg-[var(--bg-panel-hover)]"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {/* Priority dot */}
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: pColor.text }}
        title={priority}
      />

      {/* Card ID */}
      {card.custom_id && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
          style={{
            background: 'var(--accent-subtle)',
            color: 'var(--accent-primary)',
            border: '1px solid var(--accent-primary)',
            opacity: 0.85,
          }}
        >
          {card.custom_id}
        </span>
      )}

      {/* Title */}
      <span
        className="flex-1 truncate text-sm font-medium"
        style={{ color: 'var(--text-heading)' }}
      >
        {card.title}
      </span>

      {/* Org + Project badge */}
      {(orgName || projectPrefix) && (
        <span
          className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wider sm:block"
          style={{ color: 'var(--text-muted)' }}
        >
          {orgName && `${orgName} · `}{projectPrefix}
        </span>
      )}

      {/* Status */}
      <span
        className="shrink-0 rounded-[3px] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{
          background: 'var(--bg-panel-hover)',
          color: 'var(--text-secondary)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {statusLabel}
      </span>

      {/* Priority badge */}
      <span
        className="shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: pColor.bg, color: pColor.text, borderColor: pColor.border + '40' }}
      >
        {priority}
      </span>

      {/* Due date */}
      <span
        className="shrink-0 text-[11px] font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        {card.due_date
          ? new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—'}
      </span>
    </div>
  );
}

function BucketSection({ bucket }) {
  const Icon = bucket.icon;
  if (bucket.cards.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Section header */}
      <div
        className="flex items-center gap-2 border-b px-4 py-2"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
      >
        <Icon size={14} style={{ color: bucket.color }} />
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: bucket.color }}
        >
          {bucket.label}
        </span>
        <span
          className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-black"
          style={{ background: 'var(--bg-panel-hover)', color: 'var(--text-muted)' }}
        >
          {bucket.cards.length}
        </span>
      </div>
      {bucket.cards.map(card => (
        <CardRow key={card.id} card={card} />
      ))}
    </div>
  );
}

export default function MySpaceListBoard({ cards, onCardsChange }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'

  const buckets = useMemo(() => bucketsFromCards(cards), [cards]);
  const hasCards = cards && cards.length > 0;

  async function handleStatusChange(cardId, newStatus) {
    // Optimistic update
    const prev = cards;
    onCardsChange(cards.map(c => c.id === cardId ? { ...c, status: newStatus } : c));

    try {
      const res = await apiFetch('/api/my-work', {
        method: 'PATCH',
        body: JSON.stringify({ cardId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Card status updated');
    } catch (err) {
      onCardsChange(prev); // rollback
      toast.error(err.message || 'Failed to update card status');
    }
  }

  return (
    <div>
      {/* View toggle */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {cards.length} card{cards.length !== 1 ? 's' : ''} assigned to you
        </p>
        <div
          className="flex items-center gap-1 rounded-[6px] border p-0.5"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
        >
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <List size={13} /> List
          </button>
          <button
            onClick={() => setViewMode('board')}
            className="flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: viewMode === 'board' ? 'var(--accent-primary)' : 'transparent',
              color: viewMode === 'board' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <LayoutGrid size={13} /> Board
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!hasCards && (
        <div
          className="flex flex-col items-center justify-center rounded-[8px] border border-dashed py-20 text-center"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Inbox size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
          <p className="text-base font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Nothing assigned to you yet
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Cards assigned to you across all organizations will appear here.
          </p>
        </div>
      )}

      {/* List mode */}
      {hasCards && viewMode === 'list' && (
        <div
          className="overflow-hidden rounded-[8px] border"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          {/* Column headers */}
          <div
            className="flex items-center gap-4 border-b px-4 py-2.5"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-panel)',
            }}
          >
            {['', 'ID', 'Title', 'Project', 'Status', 'Priority', 'Due'].map((h, i) => (
              <span
                key={i}
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: 'var(--text-muted)', flex: h === 'Title' ? 1 : 'none' }}
              >
                {h}
              </span>
            ))}
          </div>
          {buckets.map(bucket => (
            <BucketSection key={bucket.label} bucket={bucket} />
          ))}
        </div>
      )}

      {/* Board mode */}
      {hasCards && viewMode === 'board' && (
        <StatusKanbanBoard
          cards={cards}
          onStatusChange={handleStatusChange}
          showProject={true}
        />
      )}
    </div>
  );
}
