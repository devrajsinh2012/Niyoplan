'use client';

/**
 * MySpaceDashboard — Dashboard tab for My Space.
 * Personal stats computed client-side from the cards prop.
 * No separate API call needed.
 */

import React, { useMemo } from 'react';
import {
  isToday,
  isThisWeek,
  isPast,
  parseISO,
} from 'date-fns';
import { AlertCircle, Clock, CheckCircle2, BarChart2, Layers } from 'lucide-react';

const PRIORITY_COLORS = {
  urgent: { bg: '#FFEBE6', text: '#BF2600', border: '#FF5630' },
  high:   { bg: '#FFF3CD', text: '#974F0C', border: '#FFAB00' },
  medium: { bg: '#EAE6FF', text: '#403294', border: '#6554C0' },
  low:    { bg: '#E3FCEF', text: '#006644', border: '#36B37E' },
};

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[8px] border p-5"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <div
        className="mt-1 text-3xl font-extrabold leading-none"
        style={{ color: 'var(--text-heading)' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function MySpaceDashboard({ cards }) {
  const stats = useMemo(() => {
    const open = (cards || []).filter(c => c.status !== 'done');
    const done = (cards || []).filter(c => c.status === 'done');

    let overdue = 0;
    let dueToday = 0;
    let dueThisWeek = 0;

    open.forEach(card => {
      if (!card.due_date) return;
      try {
        const d = parseISO(card.due_date);
        if (isToday(d)) dueToday++;
        else if (isPast(d)) overdue++;
        else if (isThisWeek(d, { weekStartsOn: 1 })) dueThisWeek++;
      } catch {}
    });

    // Priority breakdown (open only)
    const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
    open.forEach(c => {
      const p = c.priority || 'medium';
      if (byPriority[p] !== undefined) byPriority[p]++;
    });

    // Breakdown by organization
    const byOrg = {};
    (cards || []).forEach(c => {
      const org = c.projects?.organizations?.name || 'Unknown';
      if (!byOrg[org]) byOrg[org] = { open: 0, done: 0 };
      if (c.status === 'done') byOrg[org].done++;
      else byOrg[org].open++;
    });

    return { open: open.length, done: done.length, overdue, dueToday, dueThisWeek, byPriority, byOrg };
  }, [cards]);

  const total = (cards || []).length;
  const completionRate = total > 0 ? Math.round((stats.done / total) * 100) : 0;

  if (total === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-[8px] border border-dashed py-20 text-center"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <BarChart2 size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.4 }} />
        <p className="text-base font-semibold" style={{ color: 'var(--text-secondary)' }}>
          No data yet
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Your personal stats will appear once cards are assigned to you.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          color="#BF2600"
          sub="Need immediate attention"
        />
        <StatCard
          label="Due Today"
          value={stats.dueToday}
          icon={Clock}
          color="var(--accent-primary)"
          sub="On your plate today"
        />
        <StatCard
          label="Total Open"
          value={stats.open}
          icon={Layers}
          color="var(--text-secondary)"
          sub={`${stats.dueThisWeek} due this week`}
        />
        <StatCard
          label="Completed"
          value={stats.done}
          icon={CheckCircle2}
          color="#006644"
          sub={`${completionRate}% completion rate`}
        />
      </div>

      {/* Completion progress */}
      <div
        className="rounded-[8px] border p-5"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Overall Progress
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>
            {completionRate}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-panel-hover)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${completionRate}%`,
              background: 'linear-gradient(90deg, #0052CC, #36B37E)',
            }}
          />
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {stats.done} of {total} cards completed
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Priority breakdown */}
        <div
          className="rounded-[8px] border p-5"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <h3
            className="mb-4 text-[11px] font-black uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Open by Priority
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byPriority).map(([priority, count]) => {
              const pColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
              const pct = stats.open > 0 ? Math.round((count / stats.open) * 100) : 0;
              return (
                <div key={priority}>
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className="rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: pColor.bg, color: pColor.text, borderColor: pColor.border + '40' }}
                    >
                      {priority}
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-panel-hover)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: pColor.text }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Organization breakdown */}
        <div
          className="rounded-[8px] border p-5"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <h3
            className="mb-4 text-[11px] font-black uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            By Organization
          </h3>
          {Object.keys(stats.byOrg).length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No org data available.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.byOrg).map(([org, counts]) => (
                <div key={org} className="flex items-center justify-between gap-4">
                  <span
                    className="truncate text-sm font-medium"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {org}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="rounded-[3px] border px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: 'var(--bg-panel-hover)',
                        color: 'var(--text-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {counts.open} open
                    </span>
                    <span
                      className="rounded-[3px] border px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: '#E3FCEF',
                        color: '#006644',
                        borderColor: '#36B37E40',
                      }}
                    >
                      {counts.done} done
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
