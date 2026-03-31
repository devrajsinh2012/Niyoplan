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
  if (t === 'bug') return { color: '#E34935', label: '🐛' };
  if (t === 'story') return { color: '#22A06B', label: '📗' };
  if (t === 'epic') return { color: '#6554C0', label: '⚡' };
  return { color: '#0C66E4', label: '✓' }; // task
};

export default function KanbanCard({ card, isOverlay, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'Card', card },
  });

  const style = {
    transition,
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
  };

  if (isDragging && !isOverlay) {
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
      className={`kanban-card ${isOverlay ? 'overlay' : ''} transition-all relative group`}
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      role="button"
      tabIndex={isOverlay ? -1 : 0}
      onClick={(e) => {
        if (isOverlay || isDragging) return;
        // Check if the click was actually on the drag handle
        if (e.target.closest('.kanban-card-drag-handle')) return;
        
        if (onOpen) onOpen(card);
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isOverlay && onOpen) {
          e.preventDefault();
          onOpen(card);
        }
      }}
    >
      {/* Drag handle (visible on hover) */}
      {!isOverlay && (
        <button
          className="kanban-card-drag-handle absolute top-2 right-2 p-1.5 rounded-md hover:bg-[var(--bg-panel-hover)] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag card"
          title="Drag card"
        >
          ⠿
        </button>
      )}

      {/* Card title */}
      <div className="kanban-card-content mb-3 pr-6">
        <p className="kanban-card-title text-[14px] leading-snug">{card.title}</p>
      </div>

      {/* Footer: ID + Type Icon (left) and Assignee (right) */}
      <div className="kanban-card-footer flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Issue Type Indicator (colored square) */}
          <div 
            className="w-3 h-3 rounded-[2px]" 
            style={{ backgroundColor: issueTypeIcon(card.issue_type).color }}
            title={card.issue_type}
          />
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
            {card.prefix || card.custom_id}
          </span>
        </div>

        {/* Assignee avatar */}
        <div className="flex -space-x-1">
          {card.assignee ? (
            <UserAvatar user={card.assignee} size={24} className="border-2 border-[var(--bg-surface)] rounded-full bg-[var(--accent-primary)]" title={card.assignee.full_name} />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--bg-panel-hover)]" title="Unassigned" />
          )}
        </div>
      </div>
    </div>
  );
}
