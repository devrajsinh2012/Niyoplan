'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp, Activity, X } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import Portal from '@/components/modals/Portal';

function LineChart({ points = [], lines = [], width = 760, height = 240 }) {
  const padding = { top: 16, right: 16, bottom: 26, left: 36 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxY = Math.max(
    1,
    ...points.map((point) => Math.max(...lines.map((line) => Number(point[line.key]) || 0)))
  );

  const xFor = (index) => {
    if (points.length <= 1) return padding.left;
    return padding.left + ((innerWidth / (points.length - 1)) * index);
  };

  const yFor = (value) => {
    const normalized = (Number(value) || 0) / maxY;
    return padding.top + (innerHeight - (normalized * innerHeight));
  };

  const pathFor = (line) => points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point[line.key])}`)
    .join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = Math.round(maxY * ratio);
    return {
      value,
      y: yFor(value),
    };
  });

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sprint chart">
      <rect x="0" y="0" width={width} height={height} fill="transparent" />

      {yTicks.map((tick) => (
        <g key={tick.value}>
          <line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} stroke="rgba(9,30,66,0.1)" />
          <text x={8} y={tick.y + 4} fontSize="11" fill="#6B778C">{tick.value}</text>
        </g>
      ))}

      {lines.map((line) => (
        <path
          key={line.key}
          d={pathFor(line)}
          fill="none"
          stroke={line.color}
          strokeWidth={line.strokeWidth || 2}
          strokeDasharray={line.dashed ? '5 4' : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {points.map((point, index) => (
        <circle
          key={`${point.date}-${index}`}
          cx={xFor(index)}
          cy={yFor(point.actualRemaining)}
          r={2.5}
          fill="#0C66E4"
        />
      ))}

      <text x={padding.left} y={height - 6} fontSize="11" fill="#6B778C">{points[0]?.date || ''}</text>
      <text x={width - padding.right - 56} y={height - 6} fontSize="11" fill="#6B778C">{points[points.length - 1]?.date || ''}</text>
    </svg>
  );
}

export default function SprintInsightsModal({ projectId, sprintId, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchMetrics() {
      if (!projectId || !sprintId) return;
      setIsLoading(true);
      setError('');
      setMetrics(null);

      try {
        const res = await apiFetch(`/api/projects/${projectId}/sprints/${sprintId}/metrics`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || 'Failed to load sprint insights');
        }

        const data = await res.json();
        if (mounted) setMetrics(data);
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load sprint insights');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchMetrics();
    return () => {
      mounted = false;
    };
  }, [projectId, sprintId]);

  const summary = metrics?.summary;
  const trend = useMemo(() => metrics?.velocityTrend ?? [], [metrics?.velocityTrend]);

  const avgVelocity = useMemo(() => {
    if (!trend.length) return 0;
    return Math.round(trend.reduce((sum, row) => sum + row.velocityPercent, 0) / trend.length);
  }, [trend]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000] bg-[#091E42]/60 backdrop-blur-[4px] flex justify-center items-center p-4" onClick={onClose}>
        <div className="relative w-full max-w-6xl bg-[var(--bg-surface)] rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden transition-all ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
          <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-heading)] tracking-tight">Sprint Insights</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{metrics?.sprint?.name || 'Current sprint'}</p>
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)] hover:text-[#0052CC] transition-all"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 custom-scrollbar min-h-0 text-left">
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-[var(--text-secondary)]">
                <Loader2 className="mr-2 animate-spin" size={18} /> Loading metrics...
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-[3px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            )}

            {!isLoading && !error && summary && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Completion</div>
                    <div className="mt-1 text-2xl font-bold text-[var(--text-heading)]">{summary.completionPercent}%</div>
                  </div>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Velocity</div>
                    <div className="mt-1 text-2xl font-bold text-[var(--text-heading)]">{summary.velocityPoints}</div>
                  </div>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Remaining</div>
                    <div className="mt-1 text-2xl font-bold text-[var(--text-heading)]">{summary.remainingPoints}</div>
                  </div>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Elapsed</div>
                    <div className="mt-1 text-2xl font-bold text-[var(--text-heading)]">{summary.daysElapsed}/{summary.daysTotal}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <Activity size={16} /> Burndown
                  </div>
                  <LineChart
                    points={metrics.burndown || []}
                    lines={[
                      { key: 'idealRemaining', color: '#8FB8FF', dashed: true },
                      { key: 'actualRemaining', color: '#0C66E4' },
                    ]}
                  />
                </div>

                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <TrendingUp size={16} /> Velocity Trend
                  </div>
                  <div className="mb-3 text-xs text-[var(--text-secondary)]">Average velocity: {avgVelocity}%</div>
                  <div className="space-y-2">
                    {trend.map((item) => (
                      <div key={item.sprintId} className="flex items-center gap-3">
                        <div className="w-36 truncate text-sm text-[var(--text-primary)]" title={item.name}>{item.name}</div>
                        <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--bg-panel-hover)]">
                          <div className="absolute left-0 top-0 h-3 rounded-full bg-[#0C66E4]" style={{ width: `${Math.min(item.velocityPercent, 100)}%` }} />
                        </div>
                        <div className="w-24 text-right text-xs font-semibold text-[var(--text-secondary)]">{item.completedPoints}/{item.plannedPoints}</div>
                        <div className="w-12 text-right text-xs font-bold text-[var(--text-heading)]">{item.velocityPercent}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !error && !summary && (
              <div className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                No sprint insights available yet.
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[3px] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
