import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    data: {
      type: 'Card',
      card,
    },
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
      ></div>
    );
  }

  return (
    <div 
      className={`kanban-card ${isOverlay ? 'overlay' : ''}`}
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isOverlay && !isDragging && onOpen) onOpen(card);
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !isOverlay && onOpen) {
          event.preventDefault();
          onOpen(card);
        }
      }}
    >
      {!isOverlay && (
        <button
          className="kanban-card-drag-handle"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
          aria-label="Drag card"
          title="Drag card"
        >
          ::
        </button>
      )}
      {card.labels && card.labels.length > 0 && (
        <div className="kanban-card-labels">
          {card.labels.map((label, idx) => (
            <span 
              key={idx} 
              className="kanban-label" 
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
      <div className="kanban-card-content">
        <p className="kanban-card-title">{card.title}</p>
      </div>
      <div className="kanban-card-footer">
        <span className="kanban-card-prefix">{card.prefix}</span>
      </div>
    </div>
  );
}
