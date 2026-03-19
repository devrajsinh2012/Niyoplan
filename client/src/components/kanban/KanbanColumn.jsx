import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

export default function KanbanColumn({ list, cards, onCardOpen, onQuickAddCard }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: 'List',
      list,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const cardIds = useMemo(() => cards.map(c => c.id), [cards]);

  if (isDragging) {
    return (
      <div 
        className="kanban-column dragging"
        ref={setNodeRef}
        style={style}
      >
        <div className="kanban-column-header">
          <h3 className="kanban-column-title">{list.title}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-column" ref={setNodeRef} style={style}>
      <div 
        className="kanban-column-header"
        {...attributes}
        {...listeners}
      >
        <h3 className="kanban-column-title">
          {list.title}
          <span className="card-count">{cards.length}</span>
        </h3>
        <button className="column-menu-btn">⋯</button>
      </div>

      <div className="kanban-column-body">
        <SortableContext items={cardIds}>
          {cards.map(card => (
            <KanbanCard key={card.id} card={card} onOpen={onCardOpen} />
          ))}
        </SortableContext>
        <button className="add-quick-card-btn" onClick={() => onQuickAddCard?.(list.id)}>+ Add a card</button>
      </div>
    </div>
  );
}
