'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import UserAvatar from '@/components/ui/UserAvatar';
import WelcomeModal from '@/components/ui/WelcomeModal';
import BrandMark from '@/components/ui/BrandMark';
import { DashboardPageSkeleton } from '@/components/ui/PageSkeleton';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';

const EMPTY_TODAY_STATS = {
  total: 0,
  completed: 0,
  pending: 0,
  highPriority: 0,
  plannedHours: 0,
  linkedIssues: 0,
  assignees: 0,
  completionRate: 0,
};

const buildTodayStats = (items = []) => {
  const completed = items.filter((item) => item.is_done).length;
  const pending = items.length - completed;
  const highPriority = items.filter((item) => {
    const priority = (item.priority || '').toLowerCase();
    return !item.is_done && (priority === 'high' || priority === 'highest');
  }).length;
  const plannedHours = Math.round(((items.reduce((sum, item) => sum + (item.estimate_mins || 0), 0) / 60) * 10)) / 10;
  const linkedIssues = items.filter((item) => item.type === 'card').length;
  const assignees = new Set(items.map((item) => item.user_id).filter(Boolean)).size;

  return {
    total: items.length,
    completed,
    pending,
    highPriority,
    plannedHours,
    linkedIssues,
    assignees,
    completionRate: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const [stats, setStats] = useState({ resolved: 0, open: 0, storyPoints: 0, velocity: 0 });
  const [todayStats, setTodayStats] = useState(EMPTY_TODAY_STATS);
  const [activities, setActivities] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [activeSprintCount, setActiveSprintCount] = useState(0);
  const [activeSprints, setActiveSprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const organizationId = activeOrganization?.id;

      if (!organizationId) {
        setStats({ resolved: 0, open: 0, storyPoints: 0, velocity: 0 });
        setTodayStats(EMPTY_TODAY_STATS);
        setActiveSprint(null);
        setActiveSprintCount(0);
        setActiveSprints([]);
        setActivities([]);
        setRecentIssues([]);
        setWorkload([]);
        return;
      }

      const todayKey = new Date().toISOString().split('T')[0];

      const [{ data: orgProjects }, { data: todayTaskData }] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, prefix')
          .eq('organization_id', organizationId),
        supabase
          .from('daily_tasks')
          .select('id, user_id, estimate_mins, priority, is_done, type, done_at')
          .eq('organization_id', organizationId)
          .or(`is_done.eq.false,done_at.eq.${todayKey}`),
      ]);

      setTodayStats(buildTodayStats(todayTaskData || []));

      const projectIds = (orgProjects || []).map((p) => p.id);

      if (projectIds.length === 0) {
        setStats({ resolved: 0, open: 0, storyPoints: 0, velocity: 0 });
        setActiveSprint(null);
        setActiveSprintCount(0);
        setActiveSprints([]);
        setActivities([]);
        setRecentIssues([]);
        setWorkload([]);
        return;
      }

      const [
        { count: totalCards },
        { count: doneCards },
        { data: activityLogsAll },
        { data: recent },
        { data: sprintData },
        { data: cardData },
      ] = await Promise.all([
        supabase.from('cards').select('*', { count: 'exact', head: true }).in('project_id', projectIds),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'done').in('project_id', projectIds),
        supabase.from('activity_log')
          .select('*, user:profiles(full_name, avatar_url), card:cards(project_id, custom_id, title)')
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('cards')
          .select('id, custom_id, title, status, priority, created_at, project_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('sprints')
          .select('*')
          .eq('status', 'active')
          .in('project_id', projectIds)
          .order('start_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(25),
        supabase.from('cards')
          .select('assignee_id, sprint_id, status, story_points, profiles:assignee_id(full_name, avatar_url)')
          .in('project_id', projectIds)
          .not('assignee_id', 'is', null),
      ]);

      const sprint = sprintData?.[0] || null;
      const projectIdSet = new Set(projectIds);
      const activityLogs = (activityLogsAll || [])
        .filter((log) => projectIdSet.has(log.card?.project_id))
        .slice(0, 8);
      const openCount = (totalCards || 0) - (doneCards || 0);
      const totalSP = (cardData || []).reduce((sum, c) => sum + (c.story_points || 0), 0);

      setStats({
        resolved: doneCards || 0,
        open: openCount,
        storyPoints: totalSP,
        velocity: (totalCards && totalCards > 0) ? Math.round(((doneCards || 0) / totalCards) * 100) : 0,
      });
      setActiveSprint(sprint);
      setActiveSprintCount((sprintData || []).length);

      const sprintProgressMap = (cardData || []).reduce((acc, card) => {
        if (!card.sprint_id) return acc;
        if (!acc[card.sprint_id]) {
          acc[card.sprint_id] = { total: 0, done: 0 };
        }
        acc[card.sprint_id].total += 1;
        if (card.status === 'done') {
          acc[card.sprint_id].done += 1;
        }
        return acc;
      }, {});

      const sprintPortfolio = (sprintData || []).slice(0, 4).map((entry) => {
        const projectMeta = (orgProjects || []).find((project) => project.id === entry.project_id);
        const progress = sprintProgressMap[entry.id] || { total: 0, done: 0 };
        const completionPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

        const now = new Date();
        const endDate = entry?.end_date ? new Date(entry.end_date) : null;
        const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

        let riskLabel = 'On track';
        let riskTone = 'low';
        let riskScore = 1;

        if (!endDate) {
          riskLabel = 'No deadline';
          riskTone = 'neutral';
          riskScore = 0;
        } else if (daysLeft < 0 && completionPercent < 100) {
          riskLabel = 'Overdue';
          riskTone = 'high';
          riskScore = 3;
        } else if (daysLeft <= 2 && completionPercent < 70) {
          riskLabel = 'At risk';
          riskTone = 'high';
          riskScore = 3;
        } else if (daysLeft <= 5 && completionPercent < 50) {
          riskLabel = 'Watch';
          riskTone = 'medium';
          riskScore = 2;
        }

        return {
          ...entry,
          completionPercent,
          daysLeft,
          riskLabel,
          riskTone,
          riskScore,
          projectName: projectMeta?.name || 'Project',
          projectPrefix: projectMeta?.prefix || '',
        };
      });

      setActiveSprints(sprintPortfolio);
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
  }, [activeOrganization?.id]);

  useEffect(() => {
    if (orgLoading) return;
    setIsLoading(true);
    fetchDashboardData();
  }, [fetchDashboardData, orgLoading]);

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

  const handleViewHistory = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Showing latest team activity on this page.');
  };

  const topRiskSprint = activeSprints
    .slice()
    .sort((a, b) => {
      if ((b.riskScore || 0) !== (a.riskScore || 0)) return (b.riskScore || 0) - (a.riskScore || 0);
      const aDays = typeof a.daysLeft === 'number' ? a.daysLeft : 9999;
      const bDays = typeof b.daysLeft === 'number' ? b.daysLeft : 9999;
      return aDays - bDays;
    })[0];

  if (isLoading) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in p-6 pb-20 text-primary">
      <WelcomeModal />

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <BrandMark size={40} />
          <nav className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Dashboard</span>
          </nav>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <h1 className="text-3xl font-extrabold text-[var(--text-heading)] tracking-tight">Project Overview</h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-10">

          {/* Active Sprint Card */}
          <div
            className={`rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 shadow-sm transition-all hover:shadow-md ${activeSprint?.project_id ? 'cursor-pointer hover:border-[var(--accent-primary)]' : ''}`}
            onClick={() => {
              if (activeSprint?.project_id) {
                router.push(`/projects/${activeSprint.project_id}?tab=backlog`);
              }
            }}
          >
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Active Sprint
                  </h2>
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-heading)] leading-tight">
                  {activeSprint?.name || 'No active sprint'}
                </h3>
                <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
                  {activeSprint
                    ? `${getSprintTimelineText(activeSprint)}${activeSprintCount > 1 ? ` • ${activeSprintCount} active sprints in workspace` : ''}`
                    : 'Create and start a sprint in any project to see it here'}
                </p>
              </div>
              <span className={`rounded-[3px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border ${activeSprint ? 'bg-[#E3FCEF] text-[#006644] border-[#006644]/15' : 'bg-[var(--bg-panel-hover)] text-[var(--text-muted)] border-[var(--border-subtle)]'}`}>
                {activeSprint ? 'Active' : 'No Sprint'}
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

          {/* Workspace Active Sprints */}
          <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5 bg-[var(--bg-panel)]">
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">
                Workspace Active Sprints
              </h3>
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">
                {activeSprintCount} Total
              </span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {activeSprints.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--text-muted)] opacity-70">
                  No active sprints across this company yet
                </div>
              ) : (
                activeSprints.map((sprint) => (
                  <button
                    key={sprint.id}
                    onClick={() => router.push(`/projects/${sprint.project_id}?tab=backlog`)}
                    className="w-full px-6 py-5 text-left transition-colors hover:bg-[var(--bg-panel-hover)]"
                  >
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-heading)]">{sprint.name}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                          {sprint.projectPrefix ? `${sprint.projectPrefix} • ` : ''}{sprint.projectName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-[3px] border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                          sprint.riskTone === 'high'
                            ? 'border-[#FF5630]/30 bg-[#FF5630]/10 text-[#BF2600]'
                            : sprint.riskTone === 'medium'
                            ? 'border-[#FFAB00]/30 bg-[#FFAB00]/10 text-[#974F0C]'
                            : sprint.riskTone === 'neutral'
                            ? 'border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] text-[var(--text-muted)]'
                            : 'border-[#36B37E]/30 bg-[#36B37E]/10 text-[#006644]'
                        }`}>
                          {sprint.riskLabel}
                        </span>
                        <span className="rounded-[3px] border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                          {sprint.completionPercent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-panel-hover)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0052CC] to-[#2684FF] transition-all duration-500"
                        style={{ width: `${Math.min(sprint.completionPercent, 100)}%` }}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {topRiskSprint && (
            <div className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Priority Attention</p>
                  <p className="mt-1 text-sm font-bold text-[var(--text-heading)]">
                    {topRiskSprint.projectName} • {topRiskSprint.name}
                  </p>
                </div>
                <span className={`rounded-[3px] border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  topRiskSprint.riskTone === 'high'
                    ? 'border-[#FF5630]/30 bg-[#FF5630]/10 text-[#BF2600]'
                    : topRiskSprint.riskTone === 'medium'
                    ? 'border-[#FFAB00]/30 bg-[#FFAB00]/10 text-[#974F0C]'
                    : topRiskSprint.riskTone === 'neutral'
                    ? 'border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] text-[var(--text-muted)]'
                    : 'border-[#36B37E]/30 bg-[#36B37E]/10 text-[#006644]'
                }`}>
                  {topRiskSprint.riskLabel}
                </span>
              </div>
            </div>
          )}

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
                      <UserAvatar
                        user={log.user}
                        size={44}
                        className="shrink-0 shadow-md ring-2 ring-transparent group-hover:ring-[var(--accent-subtle)] transition-all"
                      />
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
                className="block w-full py-4 text-[10px] font-black text-center text-[var(--text-muted)] uppercase tracking-[0.2em] transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] bg-[var(--bg-panel)]/30"
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
                        <UserAvatar
                          user={{ full_name: w.name, avatar_url: w.avatar, id: w.id }}
                          size={32}
                          className="shrink-0 shadow-sm ring-1 ring-white"
                        />
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
                Today Focus
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-[var(--text-heading)]">Execution pulse for today</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Live stats from the Today workspace across your active organization.
                  </p>
                </div>
                <span className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {todayStats.total === 0 ? (
                <div className="rounded-[4px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)]/40 px-4 py-6 text-sm text-[var(--text-muted)]">
                  No tasks have been added to Today yet. Start planning the day to see completion, effort, and focus stats here.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Focus Items', value: todayStats.total, sub: 'Tracked today' },
                      { label: 'Completed', value: todayStats.completed, sub: `${todayStats.completionRate}% finished` },
                      { label: 'High Priority', value: todayStats.highPriority, sub: 'Still pending' },
                      { label: 'Planned Effort', value: `${todayStats.plannedHours}h`, sub: 'Estimated load' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-panel)]/50 px-4 py-4"
                      >
                        <p className="text-2xl font-bold leading-none text-[var(--text-heading)]">{item.value}</p>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{item.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      <span>Completion</span>
                      <span>{todayStats.completionRate}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-panel-hover)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0F766E] to-[#22C55E] transition-all duration-700"
                        style={{ width: `${Math.min(todayStats.completionRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-2 text-sm text-[var(--text-secondary)]">
                    <p>{todayStats.pending} items are still in progress across the team.</p>
                    <p>{todayStats.linkedIssues} items were pulled directly from project issues.</p>
                    <p>{todayStats.assignees} teammates currently have Today tasks assigned.</p>
                  </div>
                </>
              )}

              <Link
                href="/today"
                className="mt-6 inline-flex items-center justify-center rounded-[4px] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
              >
                Open Today Workspace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
