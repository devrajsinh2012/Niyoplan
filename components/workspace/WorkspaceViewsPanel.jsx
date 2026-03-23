'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function WorkspaceViewsPanel({ projectId }) {
  const [viewData, setViewData] = useState({ list: [], calendar: [], myWork: [], workload: [], notifications: [] });
  const [loading, setLoading] = useState(true);

  const loadViews = useCallback(async () => {
    setLoading(true);
    try {
      const safeJsonList = async (url) => {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };

      const loadList = () => safeJsonList(`/api/projects/${projectId}/views/list`);
      const loadCalendar = () => safeJsonList(`/api/projects/${projectId}/views/calendar`);
      const loadMyWork = () => safeJsonList(`/api/projects/${projectId}/views/my-work`);
      const loadWorkload = () => safeJsonList(`/api/projects/${projectId}/views/workload`);
      const loadNotifications = () => safeJsonList(`/api/projects/${projectId}/notifications`);

      const [list, calendar, myWork, workload, notifications] = await Promise.all([
        loadList(), loadCalendar(), loadMyWork(), loadWorkload(), loadNotifications()
      ]);

      setViewData({ list, calendar, myWork, workload, notifications });
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
      const res = await fetch(`/api/projects/${projectId}/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark notification');
      setViewData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      }));
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to mark notification');
    }
  };

  if (loading) return <div className="glass-panel rounded-2xl p-6 text-slate-300 font-medium text-center py-20">Loading workspace views...</div>;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800">
          <h3 className="text-white text-base font-bold uppercase tracking-widest mb-4">My Work View</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {viewData.myWork.map((card) => (
              <div key={card.id} className="border border-slate-800 rounded-xl px-4 py-3 bg-slate-900/80 hover:border-slate-700 transition-colors">
                <div className="text-xs font-bold text-white mb-1"><span className="text-blue-400 mr-2">{card.custom_id}</span> {card.title}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex gap-3">
                  <span>Priority: {card.priority}</span>
                  <span>Status: {card.status}</span>
                </div>
              </div>
            ))}
            {!viewData.myWork.length && <div className="text-slate-600 text-sm font-medium py-10 text-center">No active cards assigned to you.</div>}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800">
          <h3 className="text-white text-base font-bold uppercase tracking-widest mb-4">Workload View</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {viewData.workload.map((member) => (
              <div key={member.id} className="border border-slate-800 rounded-xl px-4 py-3 bg-slate-900/80 hover:border-slate-700 transition-colors flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white mb-1">{member.full_name || 'Unnamed'}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active: {member.active} • Done: {member.done}</div>
                </div>
                <div className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30 uppercase tracking-widest">Total: {member.total}</div>
              </div>
            ))}
            {!viewData.workload.length && <div className="text-slate-600 text-sm font-medium py-10 text-center">No workload data available.</div>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800">
          <h3 className="text-white text-base font-bold uppercase tracking-widest mb-4">Calendar View</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {viewData.calendar.map((card) => (
              <div key={card.id} className="border border-slate-800 rounded-xl px-4 py-3 bg-slate-900/80 hover:border-slate-700 transition-colors">
                <div className="text-xs font-bold text-white mb-1"><span className="text-blue-400 mr-2">{card.custom_id}</span> {card.title}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Start: {card.start_date ? new Date(card.start_date).toLocaleDateString() : '-'} • Due: {card.due_date ? new Date(card.due_date).toLocaleDateString() : '-'}
                </div>
              </div>
            ))}
            {!viewData.calendar.length && <div className="text-slate-600 text-sm font-medium py-10 text-center">No scheduled cards.</div>}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800">
          <h3 className="text-white text-base font-bold uppercase tracking-widest mb-4">Inbox & Notifications</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {viewData.notifications.map((n) => (
              <div key={n.id} className={`border rounded-xl px-4 py-4 transition-all ${n.is_read ? 'border-slate-800 bg-slate-900/30 opacity-60' : 'border-blue-500/30 bg-blue-500/10 shadow-[inner_0_0_12px_rgba(59,130,246,0.1)]'}`}>
                <div className="text-xs font-bold text-white mb-1">{n.title}</div>
                <div className="text-xs text-slate-400 leading-relaxed font-medium mb-3">{n.message || n.type}</div>
                {!n.is_read && (
                  <button 
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-all shadow-lg active:scale-95" 
                    onClick={() => markRead(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
            {!viewData.notifications.length && <div className="text-slate-600 text-sm font-medium py-10 text-center">No notifications.</div>}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800">
        <h3 className="text-white text-base font-bold uppercase tracking-widest mb-4">List View Snapshot</h3>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
          <table className="w-full min-w-[800px] text-xs">
            <thead className="text-slate-500 border-b border-slate-800 font-bold uppercase tracking-wider">
              <tr>
                <th className="text-left pb-4 px-4 font-black">Key</th>
                <th className="text-left pb-4 px-4 font-black">Title</th>
                <th className="text-left pb-4 px-4 font-black">Status</th>
                <th className="text-left pb-4 px-4 font-black">Priority</th>
                <th className="text-left pb-4 px-4 font-black">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {viewData.list.map((card) => (
                <tr key={card.id} className="border-b border-slate-900/60 hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 px-4 text-blue-400 font-bold">{card.custom_id}</td>
                  <td className="py-4 px-4 text-slate-200 font-semibold">{card.title}</td>
                  <td className="py-4 px-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">{card.status}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.priority}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-300 font-medium">{card.assignee?.full_name || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!viewData.list.length && <div className="text-slate-600 text-sm font-medium py-20 text-center">No cards in list.</div>}
        </div>
      </section>
    </div>
  );
}
