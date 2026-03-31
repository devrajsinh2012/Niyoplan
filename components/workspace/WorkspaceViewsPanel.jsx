'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/apiClient';

const INITIAL_VIEW_DATA = {
  list: [],
  calendar: [],
  myWork: [],
  workload: [],
  notifications: []
};

export default function WorkspaceViewsPanel({ projectId }) {
  const router = useRouter();
  const [viewData, setViewData] = useState(INITIAL_VIEW_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadViews = useCallback(async () => {
    setLoading(true);

    try {
      const loadList = async (url, label) => {
        const res = await apiFetch(url);

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || `Failed to load ${label}`);
        }

        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };

      const [list, calendar, myWork, workload, notifications] = await Promise.all([
        loadList(`/api/projects/${projectId}/views/list`, 'list view'),
        loadList(`/api/projects/${projectId}/views/calendar`, 'calendar view'),
        loadList(`/api/projects/${projectId}/views/my-work`, 'my work view'),
        loadList(`/api/projects/${projectId}/views/workload`, 'workload view'),
        loadList(`/api/projects/${projectId}/notifications`, 'notifications')
      ]);

      setViewData({ list, calendar, myWork, workload, notifications });
    } catch (error) {
      console.error(error);
      setViewData(INITIAL_VIEW_DATA);
      toast.error(error.message || 'Failed to load workspace views');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadViews();
    }
  }, [projectId, loadViews]);

  const refreshViews = async () => {
    setRefreshing(true);
    await loadViews();
    setRefreshing(false);
  };

  const markRead = async (id) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/notifications/${id}/read`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to mark notification');
      }

      setViewData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((item) => (
          item.id === id ? { ...item, is_read: true } : item
        ))
      }));
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to mark notification');
    }
  };

  const openCard = (cardId, preferredTab = 'board') => {
    if (!cardId) return;
    router.push(`/projects/${projectId}?tab=${preferredTab}&cardId=${cardId}`);
  };

  const openNotification = async (notification) => {
    if (!notification?.id) return;

    if (!notification.is_read) {
      await markRead(notification.id);
    }

    const relatedCardId = notification.metadata?.card_id || notification.card_id || null;
    if (relatedCardId) {
      openCard(relatedCardId, 'board');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 py-20 text-center font-medium text-[var(--text-muted)]">
        Loading workspace views...
      </div>
    );
  }

  const unreadCount = viewData.notifications.filter((item) => !item.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={refreshViews}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold uppercase tracking-widest text-[var(--text-heading)]">My Work View</h3>
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}?tab=list`)}
              className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] hover:opacity-80"
            >
              Open List
            </button>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {viewData.myWork.map((card) => (
              <button
                type="button"
                key={card.id}
                onClick={() => openCard(card.id)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
              >
                <div className="mb-1 text-xs font-bold text-[var(--text-primary)]">
                  <span className="mr-2 text-[var(--accent-primary)]">{card.custom_id}</span>
                  {card.title}
                </div>
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>Priority: {card.priority}</span>
                  <span>Status: {card.status}</span>
                </div>
              </button>
            ))}
            {!viewData.myWork.length && (
              <div className="py-10 text-center text-sm font-medium text-[var(--text-muted)] opacity-50">
                No active cards assigned to you.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold uppercase tracking-widest text-[var(--text-heading)]">Workload View</h3>
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}?tab=board`)}
              className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] hover:opacity-80"
            >
              Open Board
            </button>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {viewData.workload.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-3 transition-colors hover:border-[var(--border-strong)]"
              >
                <div>
                  <div className="mb-1 text-xs font-bold text-[var(--text-primary)]">{member.full_name || 'Unnamed'}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Active: {member.active} | Done: {member.done}
                  </div>
                </div>
                <div className="rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">
                  Total: {member.total}
                </div>
              </div>
            ))}
            {!viewData.workload.length && (
              <div className="py-10 text-center text-sm font-medium text-gray-400">
                No workload data available.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold uppercase tracking-widest text-[var(--text-heading)]">Calendar View</h3>
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}?tab=calendar`)}
              className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] hover:opacity-80"
            >
              Open Calendar
            </button>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {viewData.calendar.map((card) => (
              <button
                type="button"
                key={card.id}
                onClick={() => openCard(card.id, 'calendar')}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
              >
                <div className="mb-1 text-xs font-bold text-[var(--text-primary)]">
                  <span className="mr-2 text-[var(--accent-primary)]">{card.custom_id}</span>
                  {card.title}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Start: {card.start_date ? new Date(card.start_date).toLocaleDateString() : '-'} | Due: {card.due_date ? new Date(card.due_date).toLocaleDateString() : '-'}
                </div>
              </button>
            ))}
            {!viewData.calendar.length && (
              <div className="py-10 text-center text-sm font-medium text-gray-400">
                No scheduled cards.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold uppercase tracking-widest text-[var(--text-heading)]">Inbox & Notifications</h3>
            <span className="rounded-full bg-[var(--accent-primary)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              {unreadCount} unread
            </span>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {viewData.notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border px-4 py-4 transition-all ${notification.is_read ? 'border-[var(--border-subtle)] bg-[var(--bg-panel)] opacity-60' : 'border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 shadow-sm'}`}
              >
                <div className="mb-1 text-xs font-bold text-[var(--text-primary)]">{notification.title}</div>
                <div className="mb-3 text-xs font-medium leading-relaxed text-[var(--text-muted)]">
                  {notification.message || notification.type}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(notification.metadata?.card_id || notification.card_id) && (
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--text-heading)] px-3 py-1.5 text-[10px] font-bold uppercase text-[var(--bg-surface)] shadow-lg transition-all hover:opacity-80 active:scale-95"
                      onClick={() => openNotification(notification)}
                    >
                      Open card
                    </button>
                  )}
                  {!notification.is_read && (
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-[10px] font-bold uppercase text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
                      onClick={() => markRead(notification.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!viewData.notifications.length && (
              <div className="py-10 text-center text-sm font-medium text-gray-400">
                No notifications.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold uppercase tracking-widest text-[var(--text-heading)]">List View Snapshot</h3>
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}?tab=list`)}
            className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] hover:opacity-80"
          >
            Open Full List
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-xs">
            <thead className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
              <tr className="font-bold uppercase tracking-wider">
                <th className="px-4 pb-4 text-left font-black">Key</th>
                <th className="px-4 pb-4 text-left font-black">Title</th>
                <th className="px-4 pb-4 text-left font-black">Status</th>
                <th className="px-4 pb-4 text-left font-black">Priority</th>
                <th className="px-4 pb-4 text-left font-black">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {viewData.list.map((card) => (
                <tr
                  key={card.id}
                  className="cursor-pointer border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-panel-hover)]"
                  onClick={() => openCard(card.id, 'list')}
                >
                  <td className="px-4 py-4 font-bold text-[var(--accent-primary)]">{card.custom_id}</td>
                  <td className="px-4 py-4 font-semibold text-[var(--text-primary)]">{card.title}</td>
                  <td className="px-4 py-4">
                    <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      {card.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{card.priority}</span>
                  </td>
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{card.assignee?.full_name || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!viewData.list.length && (
            <div className="py-20 text-center text-sm font-medium text-gray-400">
              No cards in list.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
