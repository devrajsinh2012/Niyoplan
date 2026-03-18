import React, { useState, useEffect } from 'react';
import { DndContext, closestCorners, TouchSensor, MouseSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import './KanbanBoard.css';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

export default function KanbanBoard({ projectId }) {
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch lists and cards
  useEffect(() => {
    if (projectId) {
      fetchBoardData();
    }
  }, [projectId]);

  const fetchBoardData = async () => {
    try {
      const [listsRes, cardsRes] = await Promise.all([
        supabase.from('lists').select('*').eq('project_id', projectId).order('rank', { ascending: true }),
        supabase.from('cards').select('*, assignee:profiles!cards_assignee_id_fkey(full_name, avatar_url)').eq('project_id', projectId).order('rank', { ascending: true })
      ]);

      if (listsRes.error) throw listsRes.error;
      if (cardsRes.error) throw cardsRes.error;

      // Ensure cards have prefix property matching Phase 2 mock expectations (using custom_id)
      const formattedCards = cardsRes.data.map(c => ({
        ...c,
        prefix: c.custom_id, 
        listId: c.list_id // Map DB column to component prop
      }));

      setLists(listsRes.data);
      setCards(formattedCards);
    } catch (err) {
      toast.error('Failed to load board data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
        
        if (prev[activeIndex].listId !== prev[overIndex].listId) {
          const newCards = [...prev];
          newCards[activeIndex].listId = prev[overIndex].listId;
          return arrayMove(newCards, activeIndex, overIndex);
        }
        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    // Dropping a card over an empty list
    if (isActiveACard && isOverAList) {
      setCards((prev) => {
        const activeIndex = prev.findIndex(c => c.id === activeId);
        const newCards = [...prev];
        newCards[activeIndex].listId = overId;
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
       // Find the card's new position in the cards array to calculate rank
       const cardIndex = cards.findIndex(c => c.id === activeId);
       const card = cards[cardIndex];
       
       // Get all cards in the same list sorted by their current index
       const listCards = cards.filter(c => c.listId === card.listId);
       const targetIndex = listCards.findIndex(c => c.id === activeId);
       
       const prevCard = listCards[targetIndex - 1];
       const nextCard = listCards[targetIndex + 1];
       
       let newRank;
       if (!prevCard && !nextCard) {
         newRank = 1000; // First card in empty list
       } else if (!prevCard) {
         newRank = nextCard.rank / 2;
       } else if (!nextCard) {
         newRank = prevCard.rank + 1000;
       } else {
         newRank = (prevCard.rank + nextCard.rank) / 2;
       }

       // Update state
       setCards(prev => {
         const newCards = [...prev];
         newCards[cardIndex].rank = newRank;
         return newCards;
       });

       // Persist to DB
       const { error } = await supabase.from('cards')
         .update({ list_id: card.listId, rank: newRank })
         .eq('id', activeId);
         
       if (error) toast.error('Failed to save card position');
    }
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
        <h2 className="kanban-title">Active Board</h2>
        <div className="kanban-actions">
           {/* Add Card handled via parent UI preferably, or a modal link here */}
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
    </div>
  );
}
