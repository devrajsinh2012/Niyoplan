'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCorners, TouchSensor, MouseSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import CardDetail from './CardDetail';
import './KanbanBoard.css';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const DEFAULT_LISTS = [
  { name: 'Backlog', rank: 1000 },
  { name: 'To Do', rank: 2000 },
  { name: 'In Progress', rank: 3000 },
  { name: 'In Review', rank: 4000 },
  { name: 'Done', rank: 5000 }
];

export default function KanbanBoard({ projectId, refreshNonce = 0 }) {
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  const getStatusFromList = useCallback((listId) => {
    const list = lists.find((item) => item.id === listId);
    const normalized = (list?.name || '').trim().toLowerCase();
    if (normalized === 'done') return 'done';
    if (normalized === 'in review') return 'in_review';
    if (normalized === 'in progress') return 'in_progress';
    if (normalized === 'to do' || normalized === 'todo') return 'todo';
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
    } catch (err) {
      toast.error('Failed to load board data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch lists and cards
  useEffect(() => {
    if (projectId) {
      fetchBoardData();
    }
  }, [projectId, refreshNonce, fetchBoardData]);

  useEffect(() => {
    const cardId = searchParams.get('cardId');
    if (!cardId || cards.length === 0) return;
    const card = cards.find((item) => item.id === cardId);
    if (card) {
      setSelectedCard(card);
    }
  }, [cards, searchParams]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Card') {
      setActiveCard(cards.find(c => c.id === active.id));
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
          newCards[activeIndex].listId = prev[overIndex].listId;
          newCards[activeIndex].status = prev[overIndex].status;
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
        newCards[activeIndex].listId = overId;
        newCards[activeIndex].status = getStatusFromList(overId);
        return arrayMove(newCards, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event) => {
    setActiveCard(null);
    const { active, over } = event;
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

       const listCards = cards
         .filter((item) => item.listId === card.listId)
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
           rank: newRank,
           status: getStatusFromList(card.listId)
         };
       }));

       const { error } = await supabase.from('cards')
         .update({ list_id: card.listId, rank: newRank, status: getStatusFromList(card.listId) })
         .eq('id', activeId);

       if (error) {
         toast.error('Failed to save card position');
         await fetchBoardData();
       }
    }
  };

  const handleQuickAddCard = async (listId) => {
    const title = prompt('Card title:');
    if (!title || !title.trim()) return;

    const listCards = cards.filter((item) => item.listId === listId);
    const maxRank = listCards.length ? Math.max(...listCards.map((item) => item.rank || 0)) : 0;
    const startDate = new Date().toISOString();

    const { data, error } = await supabase
      .from('cards')
      .insert({
        project_id: projectId,
        title: title.trim(),
        issue_type: 'task',
        priority: 'medium',
        status: getStatusFromList(listId),
        list_id: listId,
        rank: maxRank + 1000,
        start_date: startDate,
        due_date: startDate
      })
      .select('*')
      .single();

    if (error) {
      toast.error('Failed to add card');
      return;
    }

    setCards((prev) => [...prev, { ...data, prefix: data.custom_id, listId: data.list_id }]);
    toast.success('Card added');
  };

  const handleSaveCard = async (updates) => {
    if (!selectedCard?.id) return;

    setIsSavingCard(true);
    const mappedListId = getListIdFromStatus(updates.status);
    const payload = {
      title: updates.title,
      description: updates.description,
      priority: updates.priority,
      status: updates.status,
      story_points: updates.story_points,
      start_date: updates.start_date || null,
      due_date: updates.due_date || null,
      list_id: mappedListId || undefined
    };

    const { data, error } = await supabase
      .from('cards')
      .update(payload)
      .eq('id', selectedCard.id)
      .select('*')
      .single();

    setIsSavingCard(false);

    if (error) {
      toast.error('Failed to save card');
      return;
    }

    setCards((prev) => prev.map((item) => {
      if (item.id !== data.id) return item;
      return {
        ...item,
        ...data,
        prefix: data.custom_id,
        listId: data.list_id || item.listId
      };
    }));
    setSelectedCard((prev) => (prev && prev.id === data.id ? { ...prev, ...data } : prev));
    toast.success('Card updated');
  };

  const handleCreateList = async () => {
    const title = prompt('List Title:');
    if (!title) return;
    
    const maxRank = lists.length > 0 ? Math.max(...lists.map(l => l.rank)) : 0;
    
    const { data, error } = await supabase.from('lists').insert({
      project_id: projectId,
      name: title,
      rank: maxRank + 1000
    }).select().single();

    if (error) {
      toast.error('Failed to create list');
    } else {
      setLists([...lists, data]);
    }
  };

  if (isLoading) {
    return <div className="kanban-wrapper"><div className="p-10 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div></div></div>;
  }

  // Map db 'name' to component 'title' expected by KanbanColumn
  const displayLists = lists.map(l => ({...l, title: l.name}));

  return (
    <div className="kanban-wrapper">
      <header className="kanban-header">
        <h2 className="kanban-title">Alpha Board</h2>
        <div className="kanban-filters">
          <button className="kanban-filter-chip" title="Filter by type">
            <span>Type ▾</span>
          </button>
          <button className="kanban-filter-chip" title="Filter by priority">
            <span>Priority ▾</span>
          </button>
          <button className="kanban-filter-chip" title="Filter by label">
            <span>Label ▾</span>
          </button>
          <button className="kanban-filter-clear">Clear all</button>
        </div>
        <div className="kanban-view-toggle">
          <button className="active">Board</button>
          <button>List</button>
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
                cards={cards.filter(c => c.listId === list.id).sort((a,b) => a.rank - b.rank)} 
                onCardOpen={(card) => {
                  setSelectedCard(card);
                  router.replace(`/projects/${projectId}?tab=board&cardId=${card.id}`);
                }}
                onQuickAddCard={handleQuickAddCard}
              />
            ))}
          </SortableContext>
          <div className="kanban-add-list-container">
            <button className="add-list-btn" onClick={handleCreateList}>+ Add List</button>
          </div>
        </div>

        <DragOverlay>
          {activeCard ? <KanbanCard card={activeCard} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <CardDetail
          key={selectedCard.id}
          card={selectedCard}
          onClose={() => {
            setSelectedCard(null);
            router.replace(`/projects/${projectId}?tab=board`);
          }}
          onSave={handleSaveCard}
          isSaving={isSavingCard}
        />
      )}
    </div>
  );
}
