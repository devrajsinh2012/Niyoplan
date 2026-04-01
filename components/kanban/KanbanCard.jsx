'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import UserAvatar from '@/components/ui/UserAvatar';

const priorityColorMap = {
  highest: 'var(--priority-highest)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
  lowest: 'var(--priority-lowest)',
};

const issueTypeIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'bug') return { color: 'var(--priority-highest)', label: '🐛' };
  if (t === 'story') return { color: 'var(--status-done-text)', label: '📗' };
  if (t === 'epic') return { color: 'var(--status-inreview-text)', label: '⚡' };
  return { color: 'var(--accent-primary)', label: '✓' }; // task
};

function KanbanCardContent({ card }) {
  return (
    <>
      <div className="kanban-card-content mb-3">
        <p className="kanban-card-title text-[14px] leading-snug">{card.title}</p>
      </div>

      <div className="kanban-card-footer flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-[2px]"
            style={{ backgroundColor: issueTypeIcon(card.issue_type).color }}
            title={card.issue_type}
          />
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
            {card.prefix || card.custom_id}
          </span>
        </div>

        <div className="flex -space-x-1">
          {card.assignee ? (
            <UserAvatar user={card.assignee} size={24} className="border-2 border-[var(--bg-surface)] rounded-full bg-[var(--accent-primary)]" title={card.assignee.full_name} />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--bg-panel-hover)]" title="Unassigned" />
          )}
        </div>
      </div>
    </>
  );
}

export function KanbanCardOverlay({ card }) {
  if (!card) return null;

  return (
    <div className="kanban-card overlay relative" role="presentation">
      <KanbanCardContent card={card} />
    </div>
  );
}

export default function KanbanCard({ card, isDeleting = false, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(card.id),
    disabled: isDeleting,
    data: { type: 'Card', card },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        className="kanban-card dragging-placeholder"
        ref={setNodeRef}
        style={style}
      />
    );
  }


  return (
    <div
      className={`kanban-card ${isDeleting ? 'deleting' : ''} relative`}
      ref={setNodeRef}
      style={style}
      {...(!isDeleting ? attributes : {})}
      {...(!isDeleting ? listeners : {})}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isDragging || isDeleting) return;
        if (onOpen) onOpen(card);
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isDeleting && onOpen) {
          e.preventDefault();
          onOpen(card);
        }
      }}
    >
      <KanbanCardContent card={card} />
    </div>
  );
}
