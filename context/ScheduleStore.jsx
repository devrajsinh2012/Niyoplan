'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

/**
 * ScheduleStore Context
 * Unified state management for all planning views (Gantt, Calendar, Kanban, Sprint)
 * Handles:
 * - Shared schedule items and dependencies
 * - Cross-view drag/drop and edit synchronization
 * - Real-time updates via Supabase subscriptions
 * - Optimistic UI updates
 */

export const ScheduleStoreContext = createContext();

function normalizeCardAsScheduleItem(cardLike) {
  if (!cardLike) return cardLike;
  const start = cardLike.start_date || cardLike.created_at || new Date().toISOString();
  const end = cardLike.end_date || cardLike.due_date || start;

  return {
    ...cardLike,
    type: cardLike.type || 'task',
    start_date: start,
    end_date: end,
    due_date: cardLike.due_date || end,
  };
}

export function ScheduleStoreProvider({ children, projectId }) {
  // Core state
  const [scheduleItems, setScheduleItems] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscription refs to prevent memory leaks
  const cardsSubscriptionRef = useRef(null);
  const dependenciesSubscriptionRef = useRef(null);

  const getAuthHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return null;

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  /**
   * Fetch all schedule data from unified planning API
   */
  const fetchScheduleData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);

    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders) {
        // Auth can be transient during initial app boot.
        setIsLoading(false);
        return;
      }

      // Calculate date range (±30 days for full month view)
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const to = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      // Fetch from unified planning endpoint
      const fromISO = from.toISOString().split('T')[0];
      const toISO = to.toISOString().split('T')[0];

      const [planningRes, depsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/planning?from=${fromISO}&to=${toISO}`, {
          headers: authHeaders,
        }),
        fetch(`/api/projects/${projectId}/dependencies`, {
          headers: authHeaders,
        })
      ]);

      const [planningData, depsData] = await Promise.all([
        planningRes.json(),
        depsRes.json()
      ]);

      if (!planningRes.ok) throw new Error(planningData.error);
      if (!depsRes.ok) throw new Error(depsData.error);

      setScheduleItems(planningData.items || []);
      setDependencies(depsData || []);
    } catch (err) {
      console.error('Failed to fetch schedule data:', err);
      setError(err.message);
      if (!String(err?.message || '').toLowerCase().includes('unauthorized')) {
        toast.error('Failed to load schedule');
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, getAuthHeaders]);

  /**
   * Setup real-time subscriptions for cards and dependencies
   */
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!projectId) return;

    // Subscribe to cards table changes
    cardsSubscriptionRef.current = supabase
      .channel(`project-cards-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('📊 Card update:', payload.eventType, payload.new);

          if (payload.eventType === 'DELETE') {
            setScheduleItems((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          } else {
            // INSERT or UPDATE
            const normalizedPayload = normalizeCardAsScheduleItem(payload.new);
            setScheduleItems((prev) => {
              const exists = prev.some((item) => item.id === payload.new.id);
              if (exists) {
                // Update
                return prev.map((item) =>
                  item.id === payload.new.id
                    ? { ...item, ...normalizedPayload }
                    : item
                );
              } else {
                // Insert
                return [{ ...normalizedPayload }, ...prev];
              }
            });
          }
        }
      )
      .subscribe();

    // Subscribe to dependencies table changes
    dependenciesSubscriptionRef.current = supabase
      .channel(`project-deps-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_dependencies',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('🔗 Dependency update:', payload.eventType, payload.new);

          if (payload.eventType === 'DELETE') {
            setDependencies((prev) =>
              prev.filter((dep) => dep.id !== payload.old.id)
            );
          } else {
            // INSERT or UPDATE
            setDependencies((prev) => {
              const exists = prev.some((dep) => dep.id === payload.new.id);
              if (exists) {
                return prev.map((dep) =>
                  dep.id === payload.new.id ? { ...dep, ...payload.new } : dep
                );
              } else {
                return [{ ...payload.new }, ...prev];
              }
            });
          }
        }
      )
      .subscribe();
  }, [projectId]);

  // Cleanup subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (cardsSubscriptionRef.current) {
      supabase.removeChannel(cardsSubscriptionRef.current);
    }
    if (dependenciesSubscriptionRef.current) {
      supabase.removeChannel(dependenciesSubscriptionRef.current);
    }
  }, []);

  /**
   * Update a schedule item (card)
   * Used by Gantt drag/drop, Calendar drag/drop, and detail edits
   */
  const updateScheduleItem = useCallback(
    async (itemId, updates, options = {}) => {
      const { silent = false } = options;
      try {
        const normalizedUpdates = normalizeCardAsScheduleItem(updates);

        // Optimistic update
        setScheduleItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, ...normalizedUpdates } : item
          )
        );

        // Save to database
        const dbPayload = { ...updates };
        if (dbPayload.end_date && !dbPayload.due_date) {
          dbPayload.due_date = dbPayload.end_date;
          delete dbPayload.end_date;
        }

        const { error } = await supabase
          .from('cards')
          .update(dbPayload)
          .eq('id', itemId);

        if (error) {
          if (!silent) toast.error('Failed to update item');
          // Revert on error would go here
          throw error;
        }

        if (!silent) toast.success('Item updated');
      } catch (err) {
        console.error('Failed to update schedule item:', err);
        setError(err.message);
      }
    },
    []
  );

  /**
   * Create a new dependency
   */
  const createDependency = useCallback(
    async (predecessorId, successorId, type = 'finish_start', leadOrLagDays = 0) => {
      try {
        const { data, error } = await supabase
          .from('card_dependencies')
          .insert({
            project_id: projectId,
            predecessor_id: predecessorId,
            successor_id: successorId,
            type,
            lead_or_lag_days: leadOrLagDays
          })
          .select()
          .single();

        if (error) throw error;

        // Optimistic update
        setDependencies((prev) => [...prev, data]);
        toast.success('Dependency created');
        return data;
      } catch (err) {
        console.error('Failed to create dependency:', err);
        toast.error(err.message);
        throw err;
      }
    },
    [projectId]
  );

  /**
   * Update an existing dependency
   */
  const updateDependency = useCallback(
    async (depId, updates) => {
      try {
        // Optimistic update
        setDependencies((prev) =>
          prev.map((dep) => (dep.id === depId ? { ...dep, ...updates } : dep))
        );

        const { error } = await supabase
          .from('card_dependencies')
          .update(updates)
          .eq('id', depId);

        if (error) throw error;

        toast.success('Dependency updated');
      } catch (err) {
        console.error('Failed to update dependency:', err);
        toast.error('Failed to update dependency');
        throw err;
      }
    },
    []
  );

  /**
   * Delete a dependency
   */
  const deleteDependency = useCallback(
    async (depId) => {
      try {
        // Optimistic update
        setDependencies((prev) => prev.filter((dep) => dep.id !== depId));

        const { error } = await supabase
          .from('card_dependencies')
          .delete()
          .eq('id', depId);

        if (error) throw error;

        toast.success('Dependency deleted');
      } catch (err) {
        console.error('Failed to delete dependency:', err);
        toast.error('Failed to delete dependency');
        throw err;
      }
    },
    []
  );

  /**
   * Bulk update multiple items (used for multi-select operations)
   */
  const bulkUpdateItems = useCallback(
    async (itemIds, updates) => {
      try {
        // Optimistic update
        setScheduleItems((prev) =>
          prev.map((item) =>
            itemIds.includes(item.id) ? { ...item, ...updates } : item
          )
        );

        // Update in database
        const { error } = await supabase
          .from('cards')
          .update(updates)
          .in('id', itemIds);

        if (error) throw error;

        toast.success(`${itemIds.length} items updated`);
      } catch (err) {
        console.error('Failed to bulk update items:', err);
        toast.error('Failed to update items');
        throw err;
      }
    },
    []
  );

  // Initialize data and subscriptions
  useEffect(() => {
    fetchScheduleData();
    setupRealtimeSubscriptions();

    return () => {
      cleanupSubscriptions();
    };
  }, [projectId, fetchScheduleData, setupRealtimeSubscriptions, cleanupSubscriptions]);

  // Provide context value
  const value = {
    // State
    scheduleItems,
    dependencies,
    isLoading,
    error,

    // Actions
    updateScheduleItem,
    createDependency,
    updateDependency,
    deleteDependency,
    bulkUpdateItems,
    refetchScheduleData: fetchScheduleData,

    // Subscriptions (exposed if views need to manage them)
    setupRealtimeSubscriptions,
    cleanupSubscriptions
  };

  return (
    <ScheduleStoreContext.Provider value={value}>
      {children}
    </ScheduleStoreContext.Provider>
  );
}

/**
 * Hook to use the ScheduleStore in any component
 */
export function useScheduleStore() {
  const context = React.useContext(ScheduleStoreContext);
  if (!context) {
    throw new Error('useScheduleStore must be used within ScheduleStoreProvider');
  }
  return context;
}
