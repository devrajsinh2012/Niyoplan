import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/api';

export default function WorkspaceViewsPanel({ projectId }) {
  const [viewData, setViewData] = useState({ list: [], calendar: [], myWork: [], workload: [], notifications: [] });
  const [loading, setLoading] = useState(true);

  const loadViews = useCallback(async () => {
    setLoading(true);
    try {
      const [list, calendar, myWork, workload, notifications] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/views/list`),
        apiFetch(`/api/projects/${projectId}/views/calendar`),
        apiFetch(`/api/projects/${projectId}/views/my-work`),
        apiFetch(`/api/projects/${projectId}/views/workload`),
        apiFetch(`/api/projects/${projectId}/notifications`)
      ]);

      setViewData({ list: list || [], calendar: calendar || [], myWork: myWork || [], workload: workload || [], notifications: notifications || [] });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load workspace views');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadViews();
  }, [projectId, loadViews]);

  const markRead = async (id) => {
    try {
      await apiFetch(`/api/projects/${projectId}/notifications/${id}/read`, { method: 'PATCH' });
      setViewData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      }));
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to mark notification');
    }
  };

  if (loading) return <div className="glass-panel rounded-2xl p-6 text-slate-300">Loading workspace views...</div>;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-white text-lg font-semibold mb-4">My Work View</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {viewData.myWork.map((card) => (
              <div key={card.id} className="border border-slate-800 rounded-lg px-3 py-2 bg-slate-900/40">
                <div className="text-sm text-white">{card.custom_id} • {card.title}</div>
                <div className="text-xs text-slate-400">{card.priority} • {card.status}</div>
              </div>
            ))}
            {!viewData.myWork.length && <div className="text-slate-500 text-sm">No active cards assigned to you.</div>}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-white text-lg font-semibold mb-4">Workload View</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {viewData.workload.map((member) => (
              <div key={member.id} className="border border-slate-800 rounded-lg px-3 py-2 bg-slate-900/40 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{member.full_name || 'Unnamed'}</div>
                  <div className="text-xs text-slate-400">Active: {member.active} • Done: {member.done}</div>
                </div>
                <div className="text-xs text-slate-300">Total: {member.total}</div>
              </div>
            ))}
            {!viewData.workload.length && <div className="text-slate-500 text-sm">No workload data available.</div>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-white text-lg font-semibold mb-4">Calendar View</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {viewData.calendar.map((card) => (
              <div key={card.id} className="border border-slate-800 rounded-lg px-3 py-2 bg-slate-900/40">
                <div className="text-sm text-white">{card.custom_id} • {card.title}</div>
                <div className="text-xs text-slate-400">Start: {card.start_date ? new Date(card.start_date).toLocaleDateString() : '-'} • Due: {card.due_date ? new Date(card.due_date).toLocaleDateString() : '-'}</div>
              </div>
            ))}
            {!viewData.calendar.length && <div className="text-slate-500 text-sm">No scheduled cards.</div>}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-white text-lg font-semibold mb-4">Inbox & Notifications</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {viewData.notifications.map((n) => (
              <div key={n.id} className={`border rounded-lg px-3 py-2 ${n.is_read ? 'border-slate-800 bg-slate-900/30' : 'border-blue-500/30 bg-blue-500/10'}`}>
                <div className="text-sm text-white">{n.title}</div>
                <div className="text-xs text-slate-300">{n.message || n.type}</div>
                {!n.is_read && <button className="btn-secondary text-xs mt-2" onClick={() => markRead(n.id)}>Mark read</button>}
              </div>
            ))}
            {!viewData.notifications.length && <div className="text-slate-500 text-sm">No notifications.</div>}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h3 className="text-white text-lg font-semibold mb-4">List View Snapshot</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="text-left py-2">Key</th>
                <th className="text-left py-2">Title</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Priority</th>
                <th className="text-left py-2">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {viewData.list.map((card) => (
                <tr key={card.id} className="border-b border-slate-900/60">
                  <td className="py-2 text-blue-300">{card.custom_id}</td>
                  <td className="py-2 text-slate-100">{card.title}</td>
                  <td className="py-2 text-slate-300">{card.status}</td>
                  <td className="py-2 text-slate-300">{card.priority}</td>
                  <td className="py-2 text-slate-300">{card.assignee?.full_name || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
