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
      className={`kanban-card ${isOverlay ? 'overlay' : ''} bg-white border border-transparent rounded-[4px] p-3 shadow-[0_1px_2px_0_rgba(9,30,66,0.31)] hover:bg-[#F4F5F7] transition-all relative group`}
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
          className="kanban-card-drag-handle absolute top-2 right-2 p-1.5 rounded-md hover:bg-[#EBECF0] text-[#6B778C] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
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
        <p className="kanban-card-title text-[14px] leading-snug text-[#172B4D] font-normal">{card.title}</p>
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
          <span className="text-[11px] font-medium text-[#6B778C] uppercase tracking-wide">
            {card.prefix || card.custom_id}
          </span>
        </div>

        {/* Assignee avatar */}
        <div className="flex -space-x-1">
          {card.assignee ? (
            <UserAvatar user={card.assignee} size={24} className="border-2 border-white rounded-full bg-blue-600" />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-[#DFE1E6]" />
          )}
        </div>
      </div>
    </div>
  );
}
