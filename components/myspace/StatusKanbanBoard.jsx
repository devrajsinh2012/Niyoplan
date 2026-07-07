'use client';

/**
 * StatusKanbanBoard — A reusable, status-grouped kanban board using @dnd-kit.
 * Used by both MySpaceListBoard (board mode) and OrgCentralKanban.
 *
 * Props:
 *   cards       — array of card objects (must have `status` field)
 *   onStatusChange(cardId, newStatus) — called when a card is dropped into a new column
 *   showProject — whether to show org/project badge on each card (true for My Space, false optional for Org Kanban)
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';

const STATUS_COLUMNS = [
  { id: 'backlog',     label: 'Backlog',      color: 'var(--text-muted)' },
  { id: 'todo',        label: 'To Do',        color: 'var(--status-todo-text, var(--text-secondary))' },
  { id: 'in_progress', label: 'In Progress',  color: 'var(--status-inprogress-text, #0052CC)' },
  { id: 'in_review',   label: 'In Review',    color: 'var(--status-inreview-text, #6554C0)' },
  { id: 'done',        label: 'Done',         color: 'var(--status-done-text, #006644)' },
];

const PRIORITY_COLORS = {
  urgent:  { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  high:    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  medium:  { bg: '#E0E7FF', text: '#3730A3', border: '#6366F1' },
  low:     { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
};

/* ─── Droppable Column Container ─────────────────────────────────────── */
function DroppableColumn({ col, children, colCards }) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: { type: 'Column', columnId: col.id },
  });

  return (
    <div
      className="flex w-[290px] shrink-0 flex-col rounded-xl border shadow-sm transition-shadow duration-200"
      style={{
        background: isOver ? 'var(--bg-panel-hover)' : 'var(--bg-panel)',
        borderColor: isOver ? col.color : 'var(--border-subtle)',
        minWidth: '260px',
        borderTop: `3px solid ${col.color}`,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3.5 py-3 select-none">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {col.label}
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: 'var(--bg-panel-hover)', color: 'var(--text-muted)' }}
        >
          {colCards.length}
        </span>
      </div>

      {/* Cards area */}
      <SortableContext
        items={colCards.map(c => String(c.id))}
        strategy={verticalListSortingStrategy}
        id={col.id}
      >
        <div
          ref={setNodeRef}
          className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 scrollbar-thin"
          style={{ minHeight: '150px' }}
        >
          {colCards.length === 0 ? (
            <div
              className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs transition-colors"
              style={{
                borderColor: isOver ? col.color : 'var(--border-subtle)',
                color: isOver ? col.color : 'var(--text-muted)',
                background: isOver ? 'color-mix(in srgb, var(--bg-panel-hover) 80%, transparent)' : 'transparent',
              }}
            >
              Drag tasks here
            </div>
          ) : (
            children
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/* ─── Draggable Card ──────────────────────────────────────────────────── */
function DraggableCard({ card, showProject }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(card.id),
    data: { type: 'Card', card },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, opacity: 0.3, background: 'var(--bg-panel-hover)', border: '1px dashed var(--border-subtle)', minHeight: '90px' }}
        className="mb-2.5 rounded-lg"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardDisplay card={card} showProject={showProject} />
    </div>
  );
}

/* ─── Card Display ────────────────────────────────────────────────────── */
function CardDisplay({ card, showProject }) {
  const priority = card.priority || 'medium';
  const pColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  const orgName = card.projects?.organizations?.name;
  const projectName = card.projects?.name;
  const projectPrefix = card.projects?.prefix;
  const isCompleted = card.status === 'done';

  return (
    <div
      className={`mb-2.5 rounded-lg border p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/40 transition-all duration-200 select-none bg-[var(--bg-surface)] ${isCompleted ? 'opacity-75' : ''}`}
      style={{
        borderColor: 'var(--border-subtle)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Card ID + title */}
      <div className="mb-2 flex items-start gap-2">
        {card.custom_id && (
          <span
            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--accent-primary)',
              opacity: 0.8,
            }}
          >
            {card.custom_id}
          </span>
        )}
        <p className={`text-sm font-semibold leading-snug text-[var(--text-heading)] ${isCompleted ? 'line-through text-[var(--text-muted)]' : ''}`}>
          {card.title}
        </p>
      </div>

      {/* Project / org badge */}
      {showProject && (projectPrefix || orgName) && (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {orgName && `${orgName} • `}{projectPrefix || projectName}
        </p>
      )}

      {/* Bottom row: priority + due date + assignee */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]/60">
        <span
          className="rounded-[4px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ background: pColor.bg, color: pColor.text, borderColor: pColor.border + '30' }}
        >
          {priority}
        </span>

        {card.due_date && (
          <span className="text-[10px] font-medium text-[var(--text-muted)]">
            {new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Assignee avatar */}
        {card.assignee?.full_name && (
          <div
            className="ml-auto flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-[var(--bg-surface)] shadow-sm uppercase bg-[var(--accent-primary)] text-white"
            title={`Assigned to ${card.assignee.full_name}`}
          >
            {card.assignee.full_name.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Board Component ────────────────────────────────────────────── */
export default function StatusKanbanBoard({ cards, onStatusChange, showProject = true }) {
  // Refs — identical pattern to KanbanBoard.jsx
  const dragOverAnimationFrameRef = useRef(null);
  const pendingDragOverRef = useRef(null);
  const lastDragOverTargetRef = useRef(null);   // deduplication ref (key fix)
  const dragSourceRef = useRef({ status: null }); // snapshot at drag-start

  // Set of column IDs for quick lookup
  const columnIdSet = useMemo(() => new Set(STATUS_COLUMNS.map(col => col.id)), []);

  const [activeCard, setActiveCard] = useState(null);
  const [localCards, setLocalCards] = useState(cards || []);

  // Sync incoming cards prop
  useEffect(() => {
    setLocalCards(cards || []);
  }, [cards]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (dragOverAnimationFrameRef.current !== null) {
      cancelAnimationFrame(dragOverAnimationFrameRef.current);
      dragOverAnimationFrameRef.current = null;
    }
    pendingDragOverRef.current = null;
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Combined collision detection — same as KanbanBoard
  const collisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCorners(args);
  }, []);

  const triggerDoneCelebration = useCallback(() => {
    const duration = 900;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 28, spread: 260, ticks: 48, zIndex: 12000, colors: ['#0052CC', '#22A06B', '#E34935', '#6554C0'] };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;
    const frame = () => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return;
      const particleCount = 22 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.2, 0.4) }, angle: randomInRange(55, 125) });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.2, 0.4) }, angle: randomInRange(55, 125) });
      requestAnimationFrame(frame);
    };
    frame();
  }, []);

  /* ── Grouped cards by status (derived from localCards during drag) ─── */
  const cardsByStatus = useMemo(() => {
    const map = {};
    STATUS_COLUMNS.forEach(col => { map[col.id] = []; });
    (localCards || []).forEach(card => {
      const bucket = map[card.status];
      if (bucket) bucket.push(card);
    });
    return map;
  }, [localCards]);

  /* ── Throttled drag-over processor — identical logic to KanbanBoard ── */
  const processQueuedDragOver = useCallback(() => {
    const queued = pendingDragOverRef.current;
    pendingDragOverRef.current = null;
    dragOverAnimationFrameRef.current = null;

    if (!queued) return;

    const { activeId, overId, isOverACard, isOverAColumn } = queued;

    if (isOverACard) {
      setLocalCards(prev => {
        const activeIndex = prev.findIndex(c => String(c.id) === activeId);
        const overIndex   = prev.findIndex(c => String(c.id) === overId);
        if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return prev;

        // Cross-column card drag — update status to match target card's column
        if (prev[activeIndex].status !== prev[overIndex].status) {
          const newCards = [...prev];
          newCards[activeIndex] = { ...prev[activeIndex], status: prev[overIndex].status };
          return arrayMove(newCards, activeIndex, overIndex);
        }

        // Same-column reorder
        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    if (isOverAColumn) {
      setLocalCards(prev => {
        const activeIndex = prev.findIndex(c => String(c.id) === activeId);
        if (activeIndex < 0) return prev;
        if (prev[activeIndex].status === overId) return prev; // already in this column

        const newCards = [...prev];
        newCards[activeIndex] = { ...prev[activeIndex], status: overId };
        return newCards;
      });
    }

    // If another event queued while we processed, schedule another frame
    if (pendingDragOverRef.current) {
      dragOverAnimationFrameRef.current = requestAnimationFrame(processQueuedDragOver);
    }
  }, []);

  /* ── Drag handlers ────────────────────────────────────────────────── */
  const handleDragStart = useCallback(({ active }) => {
    lastDragOverTargetRef.current = null;
    if (active.data.current?.type === 'Card') {
      const card = (localCards || []).find(c => String(c.id) === String(active.id)) || null;
      dragSourceRef.current = { status: card?.status || null };
      setActiveCard(card);
    }
  }, [localCards]);

  const handleDragOver = useCallback(({ active, over }) => {
    if (!over) return;

    const activeId  = String(active.id);
    const rawOverId = String(over.id);

    const isOverAColumn = columnIdSet.has(rawOverId) || over.data?.current?.type === 'Column';
    const overId = rawOverId;

    if (activeId === overId) return;

    // Deduplicate — skip if we already processed this target
    const overType = over.data?.current?.type || (isOverAColumn ? 'Column' : 'unknown');
    const overTargetKey = `${overType}:${overId}`;
    if (lastDragOverTargetRef.current === overTargetKey) return;
    lastDragOverTargetRef.current = overTargetKey;

    // Only process card drags
    if (active.data.current?.type !== 'Card') return;

    const isOverACard = over.data?.current?.type === 'Card';

    pendingDragOverRef.current = { activeId, overId, isOverACard, isOverAColumn };

    if (dragOverAnimationFrameRef.current === null) {
      dragOverAnimationFrameRef.current = requestAnimationFrame(processQueuedDragOver);
    }
  }, [columnIdSet, processQueuedDragOver]);

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
    dragSourceRef.current = { status: null };
    lastDragOverTargetRef.current = null;
    pendingDragOverRef.current = null;
    if (dragOverAnimationFrameRef.current !== null) {
      cancelAnimationFrame(dragOverAnimationFrameRef.current);
      dragOverAnimationFrameRef.current = null;
    }
    setLocalCards(cards || []);
  }, [cards]);

  const handleDragEnd = useCallback(({ active, over }) => {
    const dragSource = dragSourceRef.current;

    setActiveCard(null);
    lastDragOverTargetRef.current = null;

    // Cancel any pending animation frame (don't process — end takes priority)
    const queuedDragOver = pendingDragOverRef.current;
    pendingDragOverRef.current = null;
    if (dragOverAnimationFrameRef.current !== null) {
      cancelAnimationFrame(dragOverAnimationFrameRef.current);
      dragOverAnimationFrameRef.current = null;
    }

    if (!active || active.data.current?.type !== 'Card') return;

    const activeId = String(active.id);

    // Determine where the card was dropped
    const queuedOverId = (queuedDragOver && String(queuedDragOver.activeId) === activeId)
      ? String(queuedDragOver.overId)
      : null;
    const rawOverId = over ? String(over.id) : queuedOverId || activeId;
    const isDropOnColumn = columnIdSet.has(rawOverId) || over?.data?.current?.type === 'Column'
      || queuedDragOver?.isOverAColumn;

    let targetStatus;
    if (isDropOnColumn) {
      targetStatus = rawOverId;
    } else {
      // Dropped on a card — use that card's current status from localCards
      const targetCard = (localCards || []).find(c => String(c.id) === rawOverId);
      targetStatus = targetCard?.status;
    }

    // If no valid target, revert
    if (!targetStatus) {
      setLocalCards(cards || []);
      dragSourceRef.current = { status: null };
      return;
    }

    const sourceStatus = dragSource.status;

    if (sourceStatus !== targetStatus) {
      // Status changed — fire celebration and persist
      if (targetStatus === 'done' && sourceStatus !== 'done') {
        triggerDoneCelebration();
      }
      onStatusChange(activeId, targetStatus);
    }
    // If same status, localCards already reflects the correct order from drag-over updates

    dragSourceRef.current = { status: null };
  }, [cards, localCards, columnIdSet, onStatusChange, triggerDoneCelebration]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin h-full flex-1"
        style={{ minHeight: '500px' }}
      >
        {STATUS_COLUMNS.map(col => {
          const colCards = cardsByStatus[col.id] || [];
          return (
            <DroppableColumn key={col.id} col={col} colCards={colCards}>
              {colCards.map(card => (
                <DraggableCard key={card.id} card={card} showProject={showProject} />
              ))}
            </DroppableColumn>
          );
        })}
      </div>

      {/* Drag overlay — dropAnimation null removes the bounce-back */}
      <DragOverlay adjustScale={false} dropAnimation={null}>
        {activeCard ? (
          <div style={{ pointerEvents: 'none' }}>
            <CardDisplay card={activeCard} showProject={showProject} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
