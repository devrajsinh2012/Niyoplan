'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCorners, pointerWithin, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import KanbanColumn from './KanbanColumn';
import { KanbanCardOverlay } from './KanbanCard';
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

const CORE_STATUS_LISTS = [
  { status: 'backlog', name: 'BACKLOG', rank: 1000 },
  { status: 'todo', name: 'TO DO', rank: 2000 },
  { status: 'in_progress', name: 'IN PROGRESS', rank: 3000 },
  { status: 'in_review', name: 'IN REVIEW', rank: 4000 },
  { status: 'done', name: 'DONE', rank: 5000 }
];

export default function KanbanBoard({ projectId, refreshNonce = 0, sharedCards = null, sharedLists = null, deletingCardIds = [], onCardUpdated = null }) {
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
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const dragSourceRef = useRef({ status: null, listId: null });
  const lastDragOverTargetRef = useRef(null);
  const dragOverAnimationFrameRef = useRef(null);
  const pendingDragOverRef = useRef(null);
  const suppressCardOpenUntilRef = useRef(0);
  const deletingCardIdSet = useMemo(() => new Set(deletingCardIds), [deletingCardIds]);
  const hasSharedLists = Array.isArray(sharedLists) && sharedLists.length > 0;
  const hasSharedCards = Array.isArray(sharedCards) && sharedCards.length > 0;

  const getListStatusKey = useCallback((name) => {
    const normalized = String(name || '').trim().toLowerCase();
    if (normalized === 'done' || normalized === 'completed' || normalized === 'resolved' || normalized === 'finished') return 'done';
    if (normalized === 'in review' || normalized === 'review' || normalized === 'testing' || normalized === 'qa') return 'in_review';
    if (normalized === 'in progress' || normalized === 'progress' || normalized === 'doing' || normalized === 'active') return 'in_progress';
    if (normalized === 'to do' || normalized === 'todo' || normalized === 'to-do' || normalized === 'upcoming') return 'todo';
    if (normalized === 'backlog') return 'backlog';
    return `custom:${normalized}`;
  }, []);

  const hasAllCoreStatusLists = useCallback((items) => {
    if (!Array.isArray(items) || items.length === 0) return false;
    const statusSet = new Set(items.map((item) => getListStatusKey(item?.name)));
    return CORE_STATUS_LISTS.every((entry) => statusSet.has(entry.status));
  }, [getListStatusKey]);

  const shouldUseSharedLists = hasSharedLists && hasAllCoreStatusLists(sharedLists);

  const isTaskLike = useCallback((card) => {
    const type = (card?.item_type || card?.type || card?.issue_type || '').toString().toLowerCase();
    return type !== 'meeting';
  }, []);

  const getCardTimestamp = useCallback((card) => {
    const rawValue = card?.updated_at || card?.updatedAt || card?.created_at || card?.createdAt || 0;
    const parsedValue = new Date(rawValue).getTime();
    return Number.isNaN(parsedValue) ? 0 : parsedValue;
  }, []);

  const getStatusFromList = useCallback((listId) => {
    const list = lists.find((item) => String(item.id) === String(listId));
    const statusKey = getListStatusKey(list?.name);
    if (statusKey === 'done' || statusKey === 'in_review' || statusKey === 'in_progress' || statusKey === 'todo' || statusKey === 'backlog') {
      return statusKey;
    }
    return 'backlog';
  }, [lists, getListStatusKey]);

  const getListIdFromStatus = useCallback((status, listCollection = lists) => {
    const normalizedStatus = (status || '').trim().toLowerCase();
    const canonicalStatus = (
      normalizedStatus === 'done' ||
      normalizedStatus === 'in_review' ||
      normalizedStatus === 'in_progress' ||
      normalizedStatus === 'todo'
    ) ? normalizedStatus : 'backlog';

    const match = (listCollection || []).find((item) => {
      return getListStatusKey(item?.name) === canonicalStatus;
    });

    return match?.id;
  }, [lists, getListStatusKey]);

  const sourceCards = useMemo(() => {
    const sourceLists = shouldUseSharedLists ? sharedLists : lists;
    const backlogList = sourceLists.find((list) => {
      const statusKey = getListStatusKey(list?.name);
      return statusKey === 'backlog' || statusKey === 'todo';
    });
    const fallbackListId = (backlogList || sourceLists[0])?.id;

    const mergedCards = new Map();

    const upsertCard = (card) => {
      if (!card?.id) return;

      const normalizedCard = {
        ...card,
        prefix: card.custom_id,
        listId: getListIdFromStatus(card.status, sourceLists) || card.list_id || fallbackListId || card.listId
      };

      const existingCard = mergedCards.get(card.id);
      if (!existingCard || getCardTimestamp(normalizedCard) >= getCardTimestamp(existingCard)) {
        mergedCards.set(card.id, normalizedCard);
      }
    };

    if (Array.isArray(storeItems) && storeItems.length > 0) {
      storeItems.filter(isTaskLike).forEach(upsertCard);
    }

    if (hasSharedCards) {
      sharedCards.filter(Boolean).forEach(upsertCard);
    }

    return Array.from(mergedCards.values());
  }, [storeItems, sharedCards, lists, getListIdFromStatus, getCardTimestamp, isTaskLike, sharedLists, hasSharedCards, shouldUseSharedLists, getListStatusKey]);
  const hasExternalCardSource = hasSharedCards || (Array.isArray(storeItems) && storeItems.length > 0);

  const triggerDoneCelebration = useCallback(() => {
    const duration = 900;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 28,
      spread: 260,
      ticks: 48,
      zIndex: 12000,
      colors: ['#0052CC', '#22A06B', '#E34935', '#6554C0']
    };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const frame = () => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return;
      }

      const particleCount = 22 * (timeLeft / duration);

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

      const missingCoreStatuses = CORE_STATUS_LISTS.filter((entry) => {
        return !boardLists.some((list) => getListStatusKey(list?.name) === entry.status);
      });

      if (missingCoreStatuses.length > 0) {
        const { data: createdLists, error: createdListsError } = await supabase
          .from('lists')
          .insert(missingCoreStatuses.map((list) => ({
            project_id: projectId,
            name: list.name,
            rank: list.rank
          })))
          .select('*')
          .order('rank', { ascending: true });

        if (createdListsError) throw createdListsError;
        boardLists = [...boardLists, ...(createdLists || [])];
      }

      boardLists = [...boardLists].sort((a, b) => (a.rank || 0) - (b.rank || 0));

      const backlogList = boardLists.find((list) => {
        const statusKey = getListStatusKey(list?.name);
        return statusKey === 'backlog' || statusKey === 'todo';
      });
      const fallbackListId = (backlogList || boardLists[0])?.id;

      const listSyncUpdates = [];

      const formattedCards = cardsRes.data.map(c => ({
        ...c,
        prefix: c.custom_id, 
        listId: getListIdFromStatus(c.status, boardLists) || c.list_id || fallbackListId
      }));

      formattedCards.forEach((card) => {
        if (card.id && card.listId && card.list_id !== card.listId) {
          listSyncUpdates.push({ id: card.id, list_id: card.listId });
        }
      });

      if (listSyncUpdates.length > 0) {
        await Promise.allSettled(
          listSyncUpdates.map((entry) => {
            return supabase
              .from('cards')
              .update({ list_id: entry.list_id })
              .eq('id', entry.id);
          })
        );
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
  }, [projectId, onCardUpdated, getListStatusKey, getListIdFromStatus]);

  // Fetch lists and cards
  useEffect(() => {
    if (!projectId) return;

    if (!shouldUseSharedLists) {
      fetchBoardData();
    } else {
      setLists(sharedLists);
    }
  }, [projectId, refreshNonce, fetchBoardData, sharedLists, shouldUseSharedLists]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!hasExternalCardSource) return;

    // When we rely on internally loaded lists, wait until at least one list exists
    // so cards can be mapped into visible columns.
    if (!shouldUseSharedLists && lists.length === 0) return;

    setCards(sourceCards);
    setIsLoading(false);
  }, [sourceCards, hasExternalCardSource, shouldUseSharedLists, lists.length]);

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

  const processQueuedDragOver = useCallback(() => {
    const queued = pendingDragOverRef.current;
    pendingDragOverRef.current = null;
    dragOverAnimationFrameRef.current = null;

    if (!queued) return;

    const { activeId, overId, isOverACard, isOverAList } = queued;

    if (isOverACard) {
      setCards((prev) => {
        const activeIndex = prev.findIndex((c) => String(c.id) === activeId);
        const overIndex = prev.findIndex((c) => String(c.id) === overId);
        if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return prev;

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

    if (isOverAList) {
      setCards((prev) => {
        const activeIndex = prev.findIndex((c) => String(c.id) === activeId);
        if (activeIndex < 0) return prev;
        if (prev[activeIndex].listId === overId) return prev;

        const newCards = [...prev];
        newCards[activeIndex] = {
          ...prev[activeIndex],
          listId: overId,
          status: getStatusFromList(overId)
        };
        return newCards;
      });
    }

    if (pendingDragOverRef.current) {
      dragOverAnimationFrameRef.current = requestAnimationFrame(processQueuedDragOver);
    }
  }, [getStatusFromList]);

  const handleDragStart = (event) => {
    const { active } = event;
    lastDragOverTargetRef.current = null;
    if (active.data.current?.type === 'Card') {
      suppressCardOpenUntilRef.current = Date.now() + 220;
      const draggedCard = cards.find((c) => String(c.id) === String(active.id)) || null;
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
    
    const activeId = String(active.id);
    const rawOverId = String(over.id);
    const overIdIsList = listIdSet.has(rawOverId);
    const resolvedOverListId = lists.find((item) => String(item.id) === rawOverId)?.id;
    const isOverAList = over.data.current?.type === 'List' || overIdIsList;
    const overId = isOverAList ? (resolvedOverListId ?? rawOverId) : rawOverId;
    
    if (activeId === overId) return;

    const overType = over.data.current?.type || 'unknown';
    const overTargetKey = `${overType}:${String(overId)}`;
    if (lastDragOverTargetRef.current === overTargetKey) return;
    lastDragOverTargetRef.current = overTargetKey;

    const isActiveACard = active.data.current?.type === 'Card';
    const isOverACard = over.data.current?.type === 'Card';

    if (!isActiveACard) return;

    pendingDragOverRef.current = {
      activeId,
      overId,
      isOverACard,
      isOverAList
    };

    if (dragOverAnimationFrameRef.current === null) {
      dragOverAnimationFrameRef.current = requestAnimationFrame(processQueuedDragOver);
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    dragSourceRef.current = { status: null, listId: null };
    lastDragOverTargetRef.current = null;
    pendingDragOverRef.current = null;
    if (dragOverAnimationFrameRef.current !== null) {
      cancelAnimationFrame(dragOverAnimationFrameRef.current);
      dragOverAnimationFrameRef.current = null;
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const dragSource = dragSourceRef.current;
    const resetDragTracking = () => {
      dragSourceRef.current = { status: null, listId: null };
      lastDragOverTargetRef.current = null;
      pendingDragOverRef.current = null;
    };

    setActiveCard(null);
    lastDragOverTargetRef.current = null;
    const queuedDragOver = pendingDragOverRef.current;
    pendingDragOverRef.current = null;
    if (dragOverAnimationFrameRef.current !== null) {
      cancelAnimationFrame(dragOverAnimationFrameRef.current);
      dragOverAnimationFrameRef.current = null;
    }
    
    const activeId = String(active.id);
    const queuedOverId = (queuedDragOver && String(queuedDragOver.activeId) === activeId)
      ? String(queuedDragOver.overId)
      : null;
    const overId = over ? String(over.id) : queuedOverId || activeId;
    const overType = over?.data?.current?.type || (queuedDragOver?.isOverAList ? 'List' : queuedDragOver?.isOverACard ? 'Card' : null);
    const overIdIsList = listIdSet.has(overId);

    const isActiveAList = active.data.current?.type === 'List';
    const isActiveACard = active.data.current?.type === 'Card';

    if (isActiveAList) {
      if (!over || activeId === overId) {
        resetDragTracking();
        return;
      }

      // Handle List Reordering
      setLists((prev) => {
        const activeIndex = prev.findIndex((l) => String(l.id) === activeId);
        const overIndex = prev.findIndex((l) => String(l.id) === overId);
        if (activeIndex < 0 || overIndex < 0) return prev;
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
        const movedList = newLists[overIndex];
        supabase.from('lists').update({ rank: newRank }).eq('id', movedList.id).then(({error}) => {
          if (error) toast.error('Failed to save list order');
        });

        return newLists;
      });

      resetDragTracking();
      return;
    }

    if (isActiveACard) {
      const card = cards.find((item) => String(item.id) === activeId);
      if (!card) {
        resetDragTracking();
        return;
      }
       
      // Use the drag-start snapshot so hover updates do not change the transition check.
      const sourceStatus = dragSource.status || getStatusFromList(dragSource.listId) || activeCard?.status || getStatusFromList(activeCard?.listId);
      const isDropOnList = overType === 'List' || overIdIsList;
      const fallbackDestinationListId = card.listId || dragSource.listId;
      const destinationListId = isDropOnList
        ? (lists.find((item) => String(item.id) === overId)?.id || overId || fallbackDestinationListId)
        : (overId !== activeId ? cards.find((item) => String(item.id) === overId)?.listId : null) || fallbackDestinationListId;
      const destinationStatus = getStatusFromList(destinationListId);
      const sourceStatusNormalized = String(sourceStatus || '').trim().toLowerCase();
      const sourceListStatus = getStatusFromList(dragSource.listId);
      const sourceListId = String(dragSource.listId || card.listId || '');
      const destinationListIdKey = String(destinationListId || '');
      const destinationStatusNormalized = String(destinationStatus || '').trim().toLowerCase();

      // Some drops can end with over === active card even after a cross-list hover.
      // Persist if the destination list or status changed from the drag source snapshot.
      if (sourceListId === destinationListIdKey && sourceStatusNormalized === destinationStatusNormalized && activeId === overId) {
        resetDragTracking();
        return;
      }

      const movedIntoDoneColumn = destinationStatus === 'done' && (
        (sourceStatusNormalized ? sourceStatusNormalized !== 'done' : sourceListStatus !== 'done')
      );

      const listCards = cards
        .filter((item) => String(String(item.id) === activeId ? destinationListId : item.listId) === destinationListIdKey)
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
      const targetIndex = listCards.findIndex((item) => String(item.id) === activeId);

      const prevCard = targetIndex > 0 ? listCards[targetIndex - 1] : null;
      const nextCard = targetIndex >= 0 ? listCards[targetIndex + 1] : null;

      let newRank;
      if (targetIndex < 0) {
        newRank = card.rank || 1000;
      } else if (!prevCard && !nextCard) {
        newRank = 1000;
      } else if (!prevCard) {
        newRank = (nextCard.rank || 1000) / 2;
      } else if (!nextCard) {
        newRank = (prevCard.rank || 1000) + 1000;
      } else {
        newRank = ((prevCard.rank || 1000) + (nextCard.rank || 1000)) / 2;
      }

      setCards((prev) => prev.map((item) => {
        if (String(item.id) !== activeId) return item;
        return {
          ...item,
          listId: destinationListId,
          rank: newRank,
          status: destinationStatus
        };
      }));

      const { error } = await supabase.from('cards')
        .update({ list_id: destinationListId, rank: newRank, status: destinationStatus })
        .eq('id', card.id);

      if (error) {
        toast.error('Failed to save card position');
        await fetchBoardData();
      } else {
        if (movedIntoDoneColumn) {
          triggerDoneCelebration();
        }
        await updateScheduleItem(card.id, {
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

      resetDragTracking();
      return;
    }

    resetDragTracking();
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

  const filteredCards = useMemo(() => cards.filter(card => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesType = !typeFilter || card.issue_type?.toLowerCase() === typeFilter.toLowerCase();
    const matchesPriority = !priorityFilter || card.priority?.toLowerCase() === priorityFilter.toLowerCase();
    const matchesSearch = !normalizedSearch || card.title.toLowerCase().includes(normalizedSearch);
    return matchesType && matchesPriority && matchesSearch;
  }), [cards, typeFilter, priorityFilter, searchQuery]);

  const cardsByList = useMemo(() => {
    const grouped = new Map();
    lists.forEach((list) => grouped.set(String(list.id), []));

    filteredCards.forEach((card) => {
      const listCards = grouped.get(String(card.listId));
      if (listCards) {
        listCards.push(card);
      }
    });

    return grouped;
  }, [lists, filteredCards]);

  const listIdSet = useMemo(() => {
    return new Set(lists.map((list) => String(list.id)));
  }, [lists]);

  const collisionDetectionStrategy = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCorners(args);
  }, []);

  const displayLists = useMemo(() => lists.map((list) => ({ ...list, title: list.name })), [lists]);

  const handleOpenCard = useCallback((card) => {
    if (Date.now() < suppressCardOpenUntilRef.current) return;
    router.replace(`/projects/${projectId}?tab=board&cardId=${card.id}`, { scroll: false });
  }, [router, projectId]);

  const handleQuickAddFromColumn = useCallback((listId) => {
    setCreateCardListId(listId);
    setShowCreateCardModal(true);
  }, []);

  if (isLoading) {
    return <KanbanPanelSkeleton />;
  }

  const dragOverlay = (
    <DragOverlay adjustScale={false} dropAnimation={null}>
      {activeCard ? (
        <div style={{ pointerEvents: 'none' }}>
          <KanbanCardOverlay card={activeCard} />
        </div>
      ) : null}
    </DragOverlay>
  );

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
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          <SortableContext items={displayLists.map((l) => String(l.id))} strategy={horizontalListSortingStrategy}>
            {displayLists.map(list => (
              <KanbanColumn
                key={list.id}
                list={list}
                cards={cardsByList.get(String(list.id)) || []}
                deletingCardIdsSet={deletingCardIdSet}
                onCardOpen={handleOpenCard}
                onQuickAddCard={handleQuickAddFromColumn}
              />
            ))}
          </SortableContext>
          <div className="kanban-add-list-container">
            <button className="add-list-btn" onClick={() => setShowCreateListModal(true)}>+ Add List</button>
          </div>
        </div>

        {isClient ? createPortal(dragOverlay, document.body) : null}
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

