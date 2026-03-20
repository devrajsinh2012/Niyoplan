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
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <div className="animate-spin" style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '2.5px solid var(--border-strong)',
          borderTopColor: 'var(--accent-primary)',
        }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Projects &rsaquo; Niyoplan Alpha
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
            Project Overview
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" style={{ fontSize: 13 }}>
              <ExternalLink size={14} /> Share
            </button>
            <button className="btn-outline" style={{ fontSize: 13 }}>Export</button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Active Sprint Card */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Active Sprint: {activeSprint?.name || 'Alpha Release V1.2'}
                  </h2>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  {activeSprint
                    ? `Ends ${activeSprint.end_date ? new Date(activeSprint.end_date).toLocaleDateString() : 'TBD'}`
                    : 'Ends in 6 days (Nov 24, 2025)'}
                </p>
              </div>
              <span style={{
                background: 'var(--accent-primary)',
                color: '#fff', fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                textTransform: 'uppercase',
              }}>Active</span>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Resolved', value: stats.resolved, color: 'var(--status-done)' },
                { label: 'Open Issues', value: stats.open, color: 'var(--status-inprogress)' },
                { label: 'Story Points', value: stats.storyPoints, color: 'var(--priority-medium)' },
                { label: 'Velocity', value: `${stats.velocity}%`, color: 'var(--accent-primary)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-heading)' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span>Sprint Progress</span>
                <span>{stats.velocity}% Complete</span>
              </div>
              <div style={{
                height: 8, borderRadius: 'var(--radius-full)',
                background: 'var(--bg-panel-hover)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(90deg, var(--accent-primary), #6366F1)',
                  width: `${Math.min(stats.velocity, 100)}%`,
                  transition: 'width 1s ease-out',
                }} />
              </div>
            </div>
          </div>

          {/* Team Activity */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
                Team Activity
              </h3>
              <button className="btn-ghost" style={{ fontSize: 12 }}>View All Activity</button>
            </div>
            <div>
              {activities.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No activity recorded yet
                </div>
              ) : (
                activities.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex', gap: 12, padding: '12px 20px',
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-panel-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--accent-primary), #6554C0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 600, overflow: 'hidden',
                    }}>
                      {log.user?.avatar_url
                        ? <img src={log.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (log.user?.full_name?.charAt(0) || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                          {log.user?.full_name || 'Unknown'}
                        </span>
                        {' '}{log.action === 'created' ? 'created' : 'moved'}{' '}
                        <span style={{ color: 'var(--accent-text)', fontWeight: 500 }}>
                          {log.card?.custom_id}
                        </span>
                        {log.action !== 'created' && log.details?.to && (
                          <> to <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>{log.details.to}</span></>
                        )}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Recent Issues */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
                Recent Issues
              </h3>
            </div>
            <div>
              {recentIssues.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No issues yet
                </div>
              ) : (
                recentIssues.map(issue => (
                  <div
                    key={issue.id}
                    style={{
                      display: 'flex', gap: 10, padding: '10px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-panel-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                      background: priorityColor(issue.priority),
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--text-heading)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {issue.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {issue.custom_id} · {relativeTime(issue.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 12 }}
              >
                Show More
              </button>
            </div>
          </div>

          {/* Workload Balance */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
                Workload Balance
              </h3>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {workload.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No assignments yet
                </div>
              ) : (
                workload.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--accent-primary), #6554C0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 600, overflow: 'hidden',
                    }}>
                      {w.avatar
                        ? <img src={w.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : w.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-heading)', marginBottom: 4 }}>
                        {w.name}
                      </div>
                      <div style={{ display: 'flex', gap: 4, height: 5, borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ flex: w.totalCards, background: 'var(--accent-primary)', borderRadius: 'var(--radius-full)' }} />
                        <div style={{ flex: Math.max(10 - w.totalCards, 1), background: 'var(--bg-panel-hover)', borderRadius: 'var(--radius-full)' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {w.totalCards} Issues
                    </div>
                  </div>
                ))
              )}
              <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-done)' }} /> Done
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-inprogress)' }} /> In Progress
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-todo)' }} /> To Do
                </span>
              </div>
            </div>
          </div>

          {/* Project Resources */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
                Project Resources
              </h3>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {[
                { icon: FileText, label: 'Product Requirements', color: 'var(--accent-text)' },
                { icon: Palette, label: 'Design Prototype (Figma)', color: '#F24E1E' },
                { icon: BookOpen, label: 'API Documentation', color: 'var(--status-done)' },
              ].map((r, i) => (
                <button
                  key={i}
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '8px 8px', fontSize: 13 }}
                >
                  <r.icon size={15} style={{ color: r.color }} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
