import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ExternalLink, FileText, Palette, BookOpen } from 'lucide-react';

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
          .select('id, custom_id, title, status, priority, created_at')
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
        velocity: doneCards ? Math.round((doneCards / Math.max(totalCards, 1)) * 100) : 0,
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

  if (isLoading) {
    return (
      <div className="flex justify-center pt-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in p-6">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          <span>Projects</span>
          <span>/</span>
          <span className="text-[var(--text-secondary)]">Niyoplan Alpha</span>
        </nav>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">Project Overview</h1>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]">
              <ExternalLink size={14} /> Share
            </button>
            <button className="flex items-center gap-2 rounded-[3px] bg-[#0052CC] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#00388D]">
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-6">

          {/* Active Sprint Card */}
          <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Active Sprint: {activeSprint?.name || 'Alpha Release V1.2'}
                  </h2>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {activeSprint
                    ? `Ends ${activeSprint.end_date ? new Date(activeSprint.end_date).toLocaleDateString() : 'TBD'}`
                    : 'Ends in 6 days (Nov 24, 2025)'}
                </p>
              </div>
              <span className="rounded-full bg-[#E3FCEF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#006644]">
                Active
              </span>
            </div>

            {/* Stats row */}
            <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: 'Resolved', value: stats.resolved, iconBg: 'bg-[#E3FCEF]', textColor: 'text-[#006644]' },
                { label: 'Open Issues', value: stats.open, iconBg: 'bg-[#DEEBFF]', textColor: 'text-[#0052CC]' },
                { label: 'Story Points', value: stats.storyPoints, iconBg: 'bg-[#F4F5F7]', textColor: 'text-[#42526E]' },
                { label: 'Velocity', value: `${stats.velocity}%`, iconBg: 'bg-[#E9F2FF]', textColor: 'text-[#0052CC]' },
              ].map(s => (
                <div key={s.label} className="text-center sm:text-left">
                  <div className={`text-2xl font-bold text-[var(--text-heading)] mb-1`}>{s.value}</div>
                  <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="mb-2 flex justify-between text-xs font-medium">
                <span className="text-[var(--text-secondary)]">Sprint Progress</span>
                <span className="text-[var(--accent-primary)] font-bold">{stats.velocity}% Complete</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-panel-hover)]">
                <div 
                  className="h-full bg-gradient-to-r from-[#0052CC] to-[#0065FF] transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${Math.min(stats.velocity, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Team Activity */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
              <h3 className="text-sm font-bold text-[var(--text-heading)] uppercase tracking-wider">
                Team Activity
              </h3>
              <button className="text-xs font-semibold text-[var(--accent-primary)] hover:underline">
                View All
              </button>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {activities.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--text-muted)]">
                  No activity recorded yet
                </div>
              ) : (
                activities.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-4 px-6 py-4 transition-colors hover:bg-[var(--bg-panel-hover)]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0C66E4] to-[#6554C0] text-xs font-bold text-white shadow-sm overflow-hidden">
                      {log.user?.avatar_url
                        ? <img src={log.user.avatar_url} alt="" className="h-full w-full object-cover" />
                        : (log.user?.full_name?.charAt(0) || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        <span className="font-bold text-[var(--text-heading)]">
                          {log.user?.full_name || 'Unknown'}
                        </span>
                        {' '}{log.action === 'created' ? 'created' : 'moved'}{' '}
                        <span className="font-mono text-xs font-bold text-[var(--accent-primary)] bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded">
                          {log.card?.custom_id}
                        </span>
                        {log.action !== 'created' && log.details?.to && (
                          <> to <span className="font-bold uppercase text-[10px] text-[var(--text-muted)] bg-[var(--bg-panel-hover)] px-1.5 py-0.5 rounded">{log.details.to.replace('_', ' ')}</span></>
                        )}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-[var(--text-muted)]">
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
        <div className="flex flex-col gap-6">

          {/* Recent Issues */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <h3 className="text-sm font-bold text-[var(--text-heading)] uppercase tracking-wider">
                Recent Issues
              </h3>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentIssues.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                  No issues yet
                </div>
              ) : (
                recentIssues.map(issue => (
                  <div
                    key={issue.id}
                    className="flex gap-3 px-5 py-3 transition-colors hover:bg-[var(--bg-panel-hover)] cursor-pointer"
                  >
                    <div 
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full" 
                      style={{ background: priorityColor(issue.priority) }} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--text-heading)]">
                        {issue.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-[var(--text-muted)]">
                        <span className="text-[var(--accent-primary)]">{issue.custom_id}</span>
                        <span>·</span>
                        <span>{relativeTime(issue.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button
                className="w-full py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
              >
                Show All
              </button>
            </div>
          </div>

          {/* Workload Balance */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <h3 className="text-sm font-bold text-[var(--text-heading)] uppercase tracking-wider">
                Workload Balance
              </h3>
            </div>
            <div className="p-5">
              {workload.length === 0 ? (
                <div className="py-4 text-center text-sm text-[var(--text-muted)]">
                  No assignments yet
                </div>
              ) : (
                workload.map((w, i) => (
                  <div key={i} className="mb-5 last:mb-0">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0C66E4] to-[#6554C0] text-[10px] font-bold text-white overflow-hidden shadow-sm">
                          {w.avatar
                            ? <img src={w.avatar} alt="" className="h-full w-full object-cover" />
                            : w.name.charAt(0)}
                        </div>
                        <span className="truncate text-xs font-bold text-[var(--text-heading)]">
                          {w.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                        {w.totalCards} Issues
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-panel-hover)]">
                      <div 
                        className="h-full bg-[#0052CC] rounded-full" 
                        style={{ width: `${Math.min((w.totalCards / 10) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))
              )}
              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#006644]" /> Done
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0052CC]" /> In Progress
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#42526E]" /> To Do
                </span>
              </div>
            </div>
          </div>

          {/* Project Resources */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <h3 className="text-sm font-bold text-[var(--text-heading)] uppercase tracking-wider">
                Resources
              </h3>
            </div>
            <div className="p-2">
              {[
                { icon: FileText, label: 'Product Requirements', color: '#0052CC' },
                { icon: Palette, label: 'Design Prototype', color: '#F24E1E' },
                { icon: BookOpen, label: 'API Documentation', color: '#006644' },
              ].map((r, i) => (
                <button
                  key={i}
                  className="flex w-full items-center gap-3 rounded-[3px] p-2.5 text-left text-xs font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)]"
                >
                  <r.icon size={14} style={{ color: r.color }} />
                  {r.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
