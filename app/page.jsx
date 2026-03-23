'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ExternalLink, FileText, Palette, BookOpen } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState({ resolved: 0, open: 0, storyPoints: 0, velocity: 0 });
  const [activities, setActivities] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [
        { count: totalCards },
        { count: doneCards },
        { data: activityLogs },
        { data: recent },
        { data: sprintData },
        { data: cardData },
      ] = await Promise.all([
        supabase.from('cards').select('*', { count: 'exact', head: true }),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'done'),
        supabase.from('activity_log')
          .select('*, user:profiles(full_name, avatar_url), card:cards(custom_id, title)')
          .order('created_at', { ascending: false }).limit(8),
        supabase.from('cards')
          .select('id, custom_id, title, status, priority, created_at, project_id')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('sprints')
          .select('*')
          .eq('status', 'active')
          .limit(1),
        supabase.from('cards')
          .select('assignee_id, story_points, profiles:assignee_id(full_name, avatar_url)')
          .not('assignee_id', 'is', null),
      ]);

      const sprint = sprintData?.[0] || null;
      const openCount = (totalCards || 0) - (doneCards || 0);
      const totalSP = (cardData || []).reduce((sum, c) => sum + (c.story_points || 0), 0);

      setStats({
        resolved: doneCards || 0,
        open: openCount,
        storyPoints: totalSP,
        velocity: (totalCards && totalCards > 0) ? Math.round(((doneCards || 0) / totalCards) * 100) : 0,
      });
      setActiveSprint(sprint);
      setActivities(activityLogs || []);
      setRecentIssues(recent || []);

      // Compute workload per user
      const userMap = {};
      (cardData || []).forEach(c => {
        const uid = c.assignee_id;
        if (!uid) return;
        if (!userMap[uid]) {
          userMap[uid] = {
            name: c.profiles?.full_name || 'Unknown',
            avatar: c.profiles?.avatar_url,
            totalCards: 0,
            totalSP: 0,
          };
        }
        userMap[uid].totalCards++;
        userMap[uid].totalSP += (c.story_points || 0);
      });
      setWorkload(Object.values(userMap).sort((a, b) => b.totalCards - a.totalCards).slice(0, 5));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const relativeTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  const priorityColor = (p) => {
    if (!p) return 'var(--priority-medium)';
    const pl = p.toLowerCase();
    if (pl === 'highest') return 'var(--priority-highest)';
    if (pl === 'high') return 'var(--priority-high)';
    if (pl === 'medium') return 'var(--priority-medium)';
    if (pl === 'low') return 'var(--priority-low)';
    return 'var(--priority-lowest)';
  };

  const getSprintTimelineText = (sprint) => {
    if (!sprint?.end_date) return 'End date not set';
    const now = new Date();
    const endDate = new Date(sprint.end_date);
    const dayDiff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const label = endDate.toLocaleDateString();
    if (dayDiff > 1) return `Ends in ${dayDiff} days (${label})`;
    if (dayDiff === 1) return `Ends tomorrow (${label})`;
    if (dayDiff === 0) return `Ends today (${label})`;
    if (dayDiff === -1) return `Ended yesterday (${label})`;
    return `Ended ${Math.abs(dayDiff)} days ago (${label})`;
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Dashboard link copied.');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      stats,
      activeSprint,
      recentIssues,
      activities,
      workload,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'niyoplan-dashboard-export.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Dashboard export downloaded.');
  };

  const handleViewHistory = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Showing latest team activity on this page.');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center pt-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in p-6 pb-20 text-primary">
      {/* Header */}
      <div className="mb-12">
        <nav className="mb-4 flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          <span>Projects</span>
          <span>/</span>
          <span className="text-[var(--text-secondary)]">Niyoplan Alpha</span>
        </nav>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <h1 className="text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">Project Overview</h1>
          <div className="flex gap-3">
            <button onClick={handleShare} className="flex items-center gap-2 rounded-[3px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] shadow-sm">
              <ExternalLink size={14} /> Share
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 rounded-[3px] bg-[#0052CC] px-6 py-2 text-[11px] font-bold text-white uppercase tracking-wider transition-all hover:bg-[#00388D] shadow-md hover:shadow-lg active:scale-95">
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-10">

          {/* Active Sprint Card */}
          <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 shadow-sm transition-all hover:shadow-md">
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Active Sprint
                  </h2>
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-heading)] leading-tight">
                  {activeSprint?.name || 'Alpha Release V1.2'}
                </h3>
                <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
                  {activeSprint ? getSprintTimelineText(activeSprint) : 'No active sprint'}
                </p>
              </div>
              <span className="rounded-[3px] bg-[#E3FCEF] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#006644] border border-[#006644]/15">
                Active
              </span>
            </div>

            {/* Stats row */}
            <div className="mb-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                { label: 'Resolved', value: stats.resolved, sub: 'Issues' },
                { label: 'Open', value: stats.open, sub: 'Issues' },
                { label: 'Story Points', value: stats.storyPoints, sub: 'Total' },
                { label: 'Velocity', value: `${stats.velocity}%`, sub: 'Progress' },
              ].map(s => (
                <div key={s.label} className="group cursor-default flex flex-col gap-1">
                  <div className="text-2xl font-bold text-[var(--text-heading)] tracking-tight group-hover:text-[var(--accent-primary)] transition-colors line-height-1 leading-none">{s.value}</div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em]">{s.label}</div>
                  <div className="text-[9px] text-[var(--text-muted)] opacity-60 uppercase tracking-tighter">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="pt-2 border-t border-[var(--border-subtle)] mt-2">
              <div className="mb-3 flex justify-between items-end">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Sprint Progress</span>
                <span className="text-sm font-bold text-[var(--accent-primary)]">{stats.velocity}% <span className="text-[10px] font-normal text-[var(--text-muted)] uppercase ml-1">Complete</span></span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-panel-hover)]">
                <div 
                  className="h-full bg-gradient-to-r from-[#0052CC] to-[#01B8FA] transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(0,82,204,0.3)]"
                  style={{ width: `${Math.min(stats.velocity, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Team Activity */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5 bg-[var(--bg-panel)]">
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">
                Team Activity
              </h3>
              <button onClick={handleViewHistory} className="text-[11px] font-bold text-[var(--accent-primary)] uppercase tracking-wider hover:underline">
                View History
              </button>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {activities.length === 0 ? (
                <div className="py-16 text-center text-sm text-[var(--text-muted)] opacity-60">
                  No activity recorded yet
                </div>
              ) : (
                activities.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-6 px-6 py-6 transition-colors hover:bg-[var(--bg-panel-hover)] group"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0C66E4] to-[#6554C0] text-sm font-bold text-white shadow-md overflow-hidden ring-2 ring-transparent group-hover:ring-[var(--accent-subtle)] transition-all">
                        {log.user?.avatar_url
                          ? <img src={log.user.avatar_url} alt="" className="h-full w-full object-cover" />
                          : (log.user?.full_name?.charAt(0) || '?')}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="text-sm text-[var(--text-primary)] leading-relaxed">
                          <span className="font-bold text-[var(--text-heading)] hover:text-[var(--accent-primary)] cursor-pointer">
                            {log.user?.full_name || 'Unknown'}
                          </span>
                          {' '}<span className="text-[var(--text-secondary)]">{log.action === 'created' ? 'created' : 'moved'}</span>{' '}
                          <span className="font-mono text-xs font-bold text-[var(--accent-primary)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded border border-[var(--accent-primary)]/20">
                            {log.card?.custom_id}
                          </span>
                          {log.action !== 'created' && log.details?.to && (
                            <span className="text-[var(--text-secondary)]"> to <span className="font-bold uppercase text-[10px] text-[var(--text-muted)] bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">{log.details.to.replace('_', ' ')}</span></span>
                          )}
                        </div>
                        <p className="mt-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-80">
                          {relativeTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-8">

          {/* Recent Issues */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="border-b border-[var(--border-subtle)] px-6 py-5 bg-[var(--bg-panel)]">
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">
                Recent Issues
              </h3>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentIssues.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--text-muted)] opacity-60">
                  No issues found
                </div>
              ) : (
                recentIssues.map(issue => (
                  <Link
                    href={`/projects/${issue.project_id}?tab=board&cardId=${issue.id}`}
                    key={issue.id}
                    className="flex gap-6 px-6 py-5 transition-colors hover:bg-[var(--bg-panel-hover)] cursor-pointer group"
                  >
                    <div className="mt-1.5 flex flex-col items-center">
                      <div 
                        className="h-3 w-3 shrink-0 rounded-full shadow-sm ring-2 ring-white" 
                        style={{ background: priorityColor(issue.priority) }} 
                      />
                      <div className="w-[1px] h-full bg-[var(--border-subtle)] mt-3 hidden group-last:hidden sm:block" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--text-heading)] group-hover:text-[var(--accent-primary)] transition-colors leading-snug">
                        {issue.title}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        <span className="text-[var(--accent-primary)] font-mono bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded">{issue.custom_id}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                        <span>{relativeTime(issue.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
              <Link
                href="/projects"
                className="w-full py-4 text-[10px] font-black text-center text-[var(--text-muted)] uppercase tracking-[0.2em] transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] bg-[var(--bg-panel)]/30"
              >
                Go to Projects
              </Link>
            </div>
          </div>

          {/* Workload Balance */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="border-b border-[var(--border-subtle)] px-6 py-6 bg-[var(--bg-panel)]">
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
                Workload Balance
              </h3>
            </div>
            <div className="p-8">
              {workload.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--text-muted)] opacity-60">
                  No active assignments
                </div>
              ) : (
                workload.map((w, i) => (
                  <div key={i} className="mb-8 last:mb-0 group cursor-default">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0C66E4] to-[#6554C0] text-[11px] font-bold text-white overflow-hidden shadow-sm ring-1 ring-white">
                          {w.avatar
                            ? <img src={w.avatar} alt="" className="h-full w-full object-cover" />
                            : w.name.charAt(0)}
                        </div>
                        <span className="truncate text-sm font-bold text-[var(--text-heading)] group-hover:text-[var(--accent-primary)] transition-colors">
                          {w.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-panel-hover)] px-2.5 py-1 rounded border border-[var(--border-subtle)]">
                        {w.totalCards} Open
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-panel-hover)]">
                      <div 
                        className="h-full bg-gradient-to-r from-[#0052CC] to-[#2684FF] rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(0,82,204,0.2)]" 
                        style={{ width: `${Math.min((w.totalCards / 10) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))
              )}
              <div className="mt-10 pt-8 border-t border-[var(--border-subtle)] flex flex-wrap gap-x-6 gap-y-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                <span className="flex items-center gap-2 group cursor-default hover:text-[#006644] transition-colors">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#006644] shadow-[0_0_5px_rgba(0,102,68,0.4)]" /> Done
                </span>
                <span className="flex items-center gap-2 group cursor-default hover:text-[#0052CC] transition-colors">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0052CC] shadow-[0_0_5px_rgba(0,82,204,0.4)]" /> In Progress
                </span>
                <span className="flex items-center gap-2 group cursor-default hover:text-[#42526E] transition-colors">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#42526E] shadow-[0_0_5px_rgba(66,82,110,0.4)]" /> To Do
                </span>
              </div>
            </div>
          </div>

          {/* Project Resources */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="border-b border-[var(--border-subtle)] px-6 py-6 bg-[var(--bg-panel)]">
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
                Quick Links
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 gap-1.5">
              {[
                { icon: FileText, label: 'Product Requirements', color: '#0052CC' },
                { icon: Palette, label: 'Design Prototype', color: '#F24E1E' },
                { icon: BookOpen, label: 'API Documentation', color: '#006644' },
              ].map((r, i) => (
                <button
                  key={i}
                  className="flex w-full items-center gap-5 rounded-[4px] p-4 text-left transition-all hover:bg-[var(--bg-panel-hover)] group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] group-hover:border-transparent group-hover:shadow-md transition-all">
                    <r.icon size={18} style={{ color: r.color }} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] group-hover:text-[var(--text-primary)] transition-colors">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
