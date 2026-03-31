'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCorners, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import './KanbanBoard.css';
import { supabase } from '@/lib/supabase';
import { useScheduleStore } from '@/context/ScheduleStore';
import toast from 'react-hot-toast';
import { Plus, LayoutGrid } from 'lucide-react';
import confetti from 'canvas-confetti';

import InputModal from '@/components/ui/InputModal';
import { KanbanPanelSkeleton } from '@/components/ui/PageSkeleton';

const DEFAULT_LISTS = [
  { name: 'BACKLOG', rank: 1000 },
  { name: 'TO DO', rank: 2000 },
  { name: 'IN PROGRESS', rank: 3000 },
  { name: 'IN REVIEW', rank: 4000 },
  { name: 'DONE', rank: 5000 }
];

export default function KanbanBoard({ projectId, refreshNonce = 0, sharedCards = null, sharedLists = null, onCardUpdated = null }) {
  const { scheduleItems: storeItems, updateScheduleItem } = useScheduleStore();
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [createCardListId, setCreateCardListId] = useState(null);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const dragSourceRef = useRef({ status: null, listId: null });

  const getStatusFromList = useCallback((listId) => {
    const list = lists.find((item) => item.id === listId);
    const normalized = (list?.name || '').trim().toLowerCase();
    if (normalized === 'done' || normalized === 'completed' || normalized === 'resolved' || normalized === 'finished') return 'done';
    if (normalized === 'in review' || normalized === 'testing') return 'in_review';
    if (normalized === 'in progress' || normalized === 'doing' || normalized === 'active') return 'in_progress';
    if (normalized === 'to do' || normalized === 'todo' || normalized === 'upcoming') return 'todo';
    return 'backlog';
  }, [lists]);

  const getListIdFromStatus = useCallback((status) => {
    const normalizedStatus = (status || '').trim().toLowerCase();
    const match = lists.find((item) => {
      const name = (item.name || '').trim().toLowerCase();
      if (normalizedStatus === 'done') return name === 'done';
      if (normalizedStatus === 'in_review') return name === 'in review';
      if (normalizedStatus === 'in_progress') return name === 'in progress';
      if (normalizedStatus === 'todo') return name === 'to do' || name === 'todo';
      return name === 'backlog';
    });
    return match?.id;
  }, [lists]);

  const triggerDoneCelebration = useCallback(() => {
    const duration = 2200;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 38,
      spread: 300,
      ticks: 80,
      zIndex: 1000,
      colors: ['#0052CC', '#22A06B', '#E34935', '#6554C0']
    };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const frame = () => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return;
      }

      const particleCount = 40 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.2, 0.4) },
        angle: randomInRange(55, 125)
      });

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.2, 0.4) },
        angle: randomInRange(55, 125)
      });

      requestAnimationFrame(frame);
    };

    frame();
  }, []);

  const fetchBoardData = useCallback(async () => {
    try {
      const [listsRes, cardsRes] = await Promise.all([
        supabase.from('lists').select('*').eq('project_id', projectId).order('rank', { ascending: true }),
        supabase.from('cards').select('*, assignee:profiles!cards_assignee_id_fkey(full_name, avatar_url)').eq('project_id', projectId).order('rank', { ascending: true })
      ]);

      if (listsRes.error) throw listsRes.error;
      if (cardsRes.error) throw cardsRes.error;

      let boardLists = listsRes.data || [];

      if (boardLists.length === 0) {
        const { data: createdLists, error: createdListsError } = await supabase
          .from('lists')
          .insert(DEFAULT_LISTS.map((list) => ({
            project_id: projectId,
            name: list.name,
            rank: list.rank
          })))
          .select('*')
          .order('rank', { ascending: true });

        if (createdListsError) throw createdListsError;
        boardLists = createdLists || [];
      }

      const backlogList = boardLists.find((list) => {
        const normalized = (list.name || '').trim().toLowerCase();
        return normalized === 'backlog' || normalized === 'to do' || normalized === 'todo';
      });
      const fallbackListId = (backlogList || boardLists[0])?.id;

      // Ensure cards have prefix property matching Phase 2 mock expectations (using custom_id)
      const formattedCards = cardsRes.data.map(c => ({
        ...c,
        prefix: c.custom_id, 
        listId: c.list_id || fallbackListId // Map DB column to component prop
      }));

      const orphanCardIds = cardsRes.data
        .filter((card) => !card.list_id && fallbackListId)
        .map((card) => card.id);

      if (orphanCardIds.length > 0) {
        const { error: reassignError } = await supabase
          .from('cards')
          .update({ list_id: fallbackListId })
          .in('id', orphanCardIds);

        if (reassignError) {
          console.error(reassignError);
        }
      }

      setLists(boardLists);
      setCards(formattedCards);

      if (typeof onCardUpdated === 'function') {
        formattedCards.forEach((card) => {
          onCardUpdated({ ...card, list_id: card.listId || card.list_id });
        });
      }
    } catch (err) {
      toast.error('Failed to load board data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, onCardUpdated]);

  // Fetch lists and cards
  useEffect(() => {
    if (projectId && !sharedLists) {
      fetchBoardData();
    } else if (sharedLists) {
      setLists(sharedLists);
      setIsLoading(false);
    }
  }, [projectId, refreshNonce, fetchBoardData, sharedLists]);



  useEffect(() => {
    const isTaskLike = (card) => {
      const type = (card?.item_type || card?.type || card?.issue_type || '').toString().toLowerCase();
      return type !== 'meeting';
    };

    const sourceLists = Array.isArray(sharedLists) ? sharedLists : lists;
    const backlogList = sourceLists.find((list) => {
      const normalized = (list.name || '').trim().toLowerCase();
      return normalized === 'backlog' || normalized === 'to do' || normalized === 'todo';
    });
    const fallbackListId = (backlogList || sourceLists[0])?.id;

    const sourceCards = Array.isArray(storeItems) && storeItems.length > 0
      ? storeItems.filter(isTaskLike)
      : (Array.isArray(sharedCards) ? sharedCards : []);

    if (sourceCards.length === 0) return;

    const normalizedCards = sourceCards.map((card) => ({
      ...card,
      prefix: card.custom_id,
      listId: card.list_id || getListIdFromStatus(card.status) || fallbackListId || card.listId
    }));

    setCards(normalizedCards);
    if (sharedCards) setIsLoading(false);
  }, [storeItems, sharedCards, lists, getListIdFromStatus]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Card') {
      const draggedCard = cards.find(c => c.id === active.id) || null;
      dragSourceRef.current = {
        status: draggedCard?.status || null,
        listId: draggedCard?.listId || null
      };
      setActiveCard(draggedCard);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    if (activeId === overId) return;

    const isActiveACard = active.data.current?.type === 'Card';
    const isOverACard = over.data.current?.type === 'Card';
    const isOverAList = over.data.current?.type === 'List';

    if (!isActiveACard) return;

    // Dropping a card over another card
    if (isActiveACard && isOverACard) {
      setCards((prev) => {
        const activeIndex = prev.findIndex(c => c.id === activeId);
        const overIndex = prev.findIndex(c => c.id === overId);
        if (activeIndex < 0 || overIndex < 0) return prev;
        
        if (prev[activeIndex].listId !== prev[overIndex].listId) {
          const newCards = [...prev];
          newCards[activeIndex] = {
            ...prev[activeIndex],
            listId: prev[overIndex].listId,
            status: prev[overIndex].status
          };
          return arrayMove(newCards, activeIndex, overIndex);
        }
        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    // Dropping a card over an empty list
    if (isActiveACard && isOverAList) {
      setCards((prev) => {
        const activeIndex = prev.findIndex(c => c.id === activeId);
        if (activeIndex < 0) return prev;
        const newCards = [...prev];
        newCards[activeIndex] = {
          ...prev[activeIndex],
          listId: overId,
          status: getStatusFromList(overId)
        };
        return arrayMove(newCards, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const dragSource = dragSourceRef.current;
    setActiveCard(null);
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    if (activeId === overId) return;

    const isActiveAList = active.data.current?.type === 'List';
    const isActiveACard = active.data.current?.type === 'Card';

    if (isActiveAList) {
      // Handle List Reordering
      setLists((prev) => {
        const activeIndex = prev.findIndex(l => l.id === activeId);
        const overIndex = prev.findIndex(l => l.id === overId);
        const newLists = arrayMove(prev, activeIndex, overIndex);
        
        // Optimistically calculate new rank (average of neighbors)
        const prevList = newLists[overIndex - 1];
        const nextList = newLists[overIndex + 1];
        
        let newRank;
        if (!prevList) newRank = nextList.rank / 2;
        else if (!nextList) newRank = prevList.rank + 1000;
        else newRank = (prevList.rank + nextList.rank) / 2;

        newLists[overIndex].rank = newRank;

        // Persist to DB
        supabase.from('lists').update({ rank: newRank }).eq('id', activeId).then(({error}) => {
          if (error) toast.error('Failed to save list order');
        });

        return newLists;
      });
    }

    if (isActiveACard) {
       const card = cards.find((item) => item.id === activeId);
       if (!card) return;
       
       // Use the drag-start snapshot so hover updates do not change the transition check.
      const sourceStatus = dragSource.status || getStatusFromList(dragSource.listId) || activeCard?.status || getStatusFromList(activeCard?.listId);
       const destinationListId = over.data.current?.type === 'List'
         ? over.id
         : cards.find((item) => item.id === over.id)?.listId || card.listId;
       const destinationStatus = getStatusFromList(destinationListId);

       const listCards = cards
         .filter((item) => (item.id === activeId ? destinationListId : item.listId) === destinationListId)
         .sort((a, b) => (a.rank || 0) - (b.rank || 0));
       const targetIndex = listCards.findIndex((item) => item.id === activeId);

       const prevCard = listCards[targetIndex - 1];
       const nextCard = listCards[targetIndex + 1];

       let newRank;
       if (!prevCard && !nextCard) {
         newRank = 1000;
       } else if (!prevCard) {
         newRank = (nextCard.rank || 1000) / 2;
       } else if (!nextCard) {
         newRank = (prevCard.rank || 1000) + 1000;
       } else {
         newRank = ((prevCard.rank || 1000) + (nextCard.rank || 1000)) / 2;
       }

       setCards((prev) => prev.map((item) => {
         if (item.id !== activeId) return item;
         return {
           ...item,
           listId: destinationListId,
           rank: newRank,
           status: destinationStatus
         };
       }));

        const { error } = await supabase.from('cards')
          .update({ list_id: destinationListId, rank: newRank, status: destinationStatus })
          .eq('id', activeId);

        if (error) {
          toast.error('Failed to save card position');
          await fetchBoardData();
        } else {
          if (sourceStatus !== 'done' && destinationStatus === 'done') {
            triggerDoneCelebration();
          }
          await updateScheduleItem(activeId, {
          list_id: destinationListId,
          status: destinationStatus,
          rank: newRank
        }, { silent: true });
        if (typeof onCardUpdated === 'function') {
          onCardUpdated({
            ...card,
            list_id: destinationListId,
            status: destinationStatus,
            rank: newRank
          });
        }
       }
    }

     dragSourceRef.current = { status: null, listId: null };
  };

  const handleQuickAddCard = async (title) => {
    if (!title?.trim() || !createCardListId) return;

    const listCards = cards.filter((item) => item.listId === createCardListId);
    const maxRank = listCards.length ? Math.max(...listCards.map((item) => item.rank || 0)) : 0;
    const startDate = new Date().toISOString();

    const payload = {
      project_id: projectId,
      title: title.trim(),
      issue_type: 'task',
      priority: 'medium',
      status: getStatusFromList(createCardListId),
      list_id: createCardListId,
      rank: maxRank + 1000,
      start_date: startDate,
      due_date: startDate
    };

    const { data: newCard, error: createError } = await supabase
      .from('cards')
      .insert(payload)
      .select(`*, assignee:profiles!cards_assignee_id_fkey(id, full_name, avatar_url), reporter:profiles!cards_reporter_id_fkey(id, full_name, avatar_url)`)
      .single();

    if (createError) {
      toast.error('Failed to create card');
      return;
    }

    const formattedCard = {
      ...newCard,
      prefix: newCard.custom_id,
      listId: newCard.list_id
    };

    setCards([formattedCard, ...cards]);
    if (typeof onCardUpdated === 'function') {
      onCardUpdated(formattedCard);
    }

    await updateScheduleItem(newCard.id, {
      list_id: newCard.list_id,
      status: newCard.status,
      rank: newCard.rank,
      start_date: newCard.start_date,
      due_date: newCard.due_date
    }, { silent: true });
    
    toast.success('Card added');
    setShowCreateCardModal(false);
    setCreateCardListId(null);
  };

  const handleSaveCard = async (updates) => {
    // Card saving is handled by the parent ProjectDetailPage now.
  };

  const handleCreateList = async (title) => {
    if (!title?.trim()) return;

    const maxRank = lists.length > 0 ? Math.max(...lists.map(l => l.rank)) : 0;

    const { data, error } = await supabase.from('lists').insert({
      project_id: projectId,
      name: title.trim(),
      rank: maxRank + 1000
    }).select().single();

    if (error) {
      toast.error('Failed to create list');
    } else {
      setLists([...lists, data]);
      toast.success('List created');
      setShowCreateListModal(false);
    }
  };

  if (isLoading) {
    return <KanbanPanelSkeleton />;
  }

  // Map db 'name' to component 'title' expected by KanbanColumn
  const displayLists = lists.map(l => ({...l, title: l.name}));

  const filteredCards = cards.filter(card => {
    const matchesType = !typeFilter || card.issue_type?.toLowerCase() === typeFilter.toLowerCase();
    const matchesPriority = !priorityFilter || card.priority?.toLowerCase() === priorityFilter.toLowerCase();
    const matchesSearch = !searchQuery || card.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesPriority && matchesSearch;
  });

  return (
    <div className="kanban-wrapper">
      <header className="kanban-header">
        <div className="kanban-filters flex-1 pt-1 flex items-center gap-3">
          <div className="relative">
            <select 
              className="kanban-filter-chip kanban-filter-select appearance-none bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[3px] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--bg-panel-hover)] transition-colors text-[var(--text-primary)]"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="story">Story</option>
              <option value="epic">Epic</option>
            </select>
          </div>
          
          <div className="relative">
            <select 
              className="kanban-filter-chip kanban-filter-select appearance-none bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[3px] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--bg-panel-hover)] transition-colors text-[var(--text-primary)]"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="lowest">Lowest</option>
            </select>
          </div>

          <div className="relative flex-1 max-w-[280px]">
            <input 
              type="text"
              placeholder="Search cards..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-[3px] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {(typeFilter || priorityFilter || searchQuery) && (
            <button 
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline px-2"
              onClick={() => {
                setTypeFilter('');
                setPriorityFilter('');
                setSearchQuery('');
              }}
            >
              Clear all
            </button>
          )}
        </div>
      </header>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          <SortableContext items={displayLists.map(l => l.id)}>
            {displayLists.map(list => (
              <KanbanColumn
                key={list.id}
                list={list}
                cards={filteredCards.filter(c => c.listId === list.id).sort((a,b) => (a.rank || 0) - (b.rank || 0))}
                onCardOpen={(card) => {
                  router.replace(`/projects/${projectId}?tab=board&cardId=${card.id}`, { scroll: false });
                }}
                onQuickAddCard={(listId) => {
                  setCreateCardListId(listId);
                  setShowCreateCardModal(true);
                }}
              />
            ))}
          </SortableContext>
          <div className="kanban-add-list-container">
            <button className="add-list-btn" onClick={() => setShowCreateListModal(true)}>+ Add List</button>
          </div>
        </div>

        <DragOverlay adjustScale={false} dropAnimation={null}>
          {activeCard ? (
            <div style={{ pointerEvents: 'none' }}>
              <KanbanCard card={activeCard} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>



      {/* Create Card Modal */}
      <InputModal
        isOpen={showCreateCardModal}
        onClose={() => {
          setShowCreateCardModal(false);
          setCreateCardListId(null);
        }}
        onSubmit={handleQuickAddCard}
        title="Create Card"
        label="Card Title"
        placeholder="What needs to be done?"
        icon={Plus}
        submitLabel="Create Card"
        maxLength={100}
      />

      {/* Create List Modal */}
      <InputModal
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        onSubmit={handleCreateList}
        title="Create List"
        label="List Name"
        placeholder="e.g. In Progress, Testing"
        icon={LayoutGrid}
        submitLabel="Create List"
        maxLength={50}
      />
    </div>
  );
}

