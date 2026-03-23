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
    transform: CSS.Transform.toString(transform),
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
      className={`kanban-card ${isOverlay ? 'overlay' : ''}`}
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => { if (!isOverlay && !isDragging && onOpen) onOpen(card); }}
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
          className="kanban-card-drag-handle"
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
      <div className="kanban-card-content">
        <p className="kanban-card-title">{card.title}</p>
      </div>

      {/* Footer: priority + ID + assignee */}
      <div className="kanban-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            className="kanban-card-priority"
            style={{ background: priorityColorMap[card.priority] || 'var(--priority-medium)' }}
            title={card.priority}
          />
          <span className="kanban-card-prefix">{card.prefix || card.custom_id}</span>
        </div>

        {/* Assignee avatar */}
        {card.assignee && (
          <div className="kanban-card-assignee" title={card.assignee?.full_name || ''}>
            <UserAvatar user={card.assignee} size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
