'use client';

import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import toast from 'react-hot-toast';

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
        <h3 className="kanban-column-title uppercase text-[11px] font-bold tracking-wider text-[#5E6C84]">
          {list.title}
          <span className="card-count ml-2 bg-[#EBECF0] text-[#42526E] px-1.5 py-0.5 rounded-full text-[10px]">{cards.length}</span>
        </h3>
        <button className="column-menu-btn text-[#6B778C] hover:bg-[#EBECF0] p-1 rounded-md transition-colors" onClick={() => toast('List options coming soon')}>
          <span className="text-lg leading-none">⋯</span>
        </button>
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
