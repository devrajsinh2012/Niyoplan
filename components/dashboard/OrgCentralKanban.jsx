'use client';

/**
 * OrgCentralKanban — Organization-wide kanban board for the Dashboard.
 * Shows ALL cards from ALL projects inside the currently active org.
 * Grouped by card_status enum. Drag-and-drop updates status.
 * Mounted inside app/dashboard/page.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { apiFetch } from '@/lib/apiClient';
import StatusKanbanBoard from '@/components/myspace/StatusKanbanBoard';
import { KanbanPanelSkeleton } from '@/components/ui/PageSkeleton';
import toast from 'react-hot-toast';
import { Kanban } from 'lucide-react';

export default function OrgCentralKanban({ isFullPage = false }) {
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCards = useCallback(async () => {
    const orgId = activeOrganization?.id;
    if (!orgId) {
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/organizations/${orgId}/central-kanban`);
      if (!res.ok) throw new Error('Failed to load kanban data');
      const data = await res.json();
      setCards(data.cards || []);
    } catch (err) {
      setError(err.message || 'Failed to load cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [activeOrganization?.id]);

  useEffect(() => {
    if (orgLoading) return;
    fetchCards();
  }, [fetchCards, orgLoading]);

  async function handleStatusChange(cardId, newStatus) {
    const orgId = activeOrganization?.id;
    if (!orgId) return;

    // Optimistic update
    const prev = cards;
    setCards(cards.map(c => c.id === cardId ? { ...c, status: newStatus } : c));

    try {
      const res = await apiFetch(`/api/organizations/${orgId}/central-kanban`, {
        method: 'PATCH',
        body: JSON.stringify({ cardId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Card status updated');
    } catch (err) {
      setCards(prev); // rollback
      toast.error(err.message || 'Failed to update card status');
    }
  }

  const containerClassName = isFullPage 
    ? "overflow-hidden flex flex-col h-full flex-1"
    : "overflow-hidden rounded-[4px] border flex flex-col h-full flex-1";

  return (
    <div
      className={containerClassName}
      style={{ borderColor: isFullPage ? 'transparent' : 'var(--border-subtle)', background: 'var(--bg-surface)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-6 py-5"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
      >
        <div className="flex items-center gap-2">
          <Kanban size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Organization Central Kanban
          </h3>
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-[0.15em]"
          style={{ color: 'var(--text-muted)' }}
        >
          {cards.length} cards
        </span>
      </div>

      {(orgLoading || loading) ? (
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <KanbanPanelSkeleton />
        </div>
      ) : error ? (
        <div className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          {error}
        </div>
      ) : cards.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          No cards in this organization yet.
        </div>
      ) : (
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <StatusKanbanBoard
            cards={cards}
            onStatusChange={handleStatusChange}
            showProject={true}
          />
        </div>
      )}
    </div>
  );
}
