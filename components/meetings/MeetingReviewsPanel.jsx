'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MeetingsPanelSkeleton } from '@/components/ui/PageSkeleton';

export default function MeetingReviewsPanel({ projectId }) {
  const [pmReviews, setPmReviews] = useState([]);
  const [hrReviews, setHrReviews] = useState([]);
  const [calendarRows, setCalendarRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionDraft, setActionDraft] = useState('');
  const [pmForm, setPmForm] = useState({
    meeting_date: new Date().toISOString().slice(0, 10),
    rag_status: 'amber',
    summary: '',
    decisions: '',
    risks: ''
  });
  const [hrForm, setHrForm] = useState({
    review_date: new Date().toISOString().slice(0, 10),
    employee_notes: '',
    manager_notes: '',
    action_plan: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const loadPm = async () => {
        const res = await fetch(`/api/projects/${projectId}/meetings/pm`);
        if (!res.ok) return [];
        return res.json();
      };
      const loadHr = async () => {
        const res = await fetch(`/api/projects/${projectId}/meetings/hr`);
        if (!res.ok) return [];
        return res.json();
      };
      const loadCal = async () => {
        const res = await fetch(`/api/projects/${projectId}/meetings/calendar`);
        if (!res.ok) return [];
        return res.json();
      };

      const [pm, hr, cal] = await Promise.all([loadPm(), loadHr(), loadCal()]);
      setPmReviews(Array.isArray(pm) ? pm : []);
      setHrReviews(Array.isArray(hr) ? hr : []);
      setCalendarRows(Array.isArray(cal) ? cal : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load meetings data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId, loadData]);

  const submitPmReview = async (event) => {
    event.preventDefault();
    try {
      const actionItems = actionDraft
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((title) => ({ title }));

      const res = await fetch(`/api/projects/${projectId}/meetings/pm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pmForm, action_items: actionItems })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save PM review');
      }

      setPmForm((prev) => ({ ...prev, summary: '', decisions: '', risks: '' }));
      setActionDraft('');
      toast.success('PM review saved');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create PM review');
    }
  };

  const submitHrReview = async (event) => {
    event.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings/hr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hrForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save HR review');
      }

      setHrForm((prev) => ({ ...prev, employee_notes: '', manager_notes: '', action_plan: '' }));
      toast.success('HR review saved');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create HR review');
    }
  };

  const deleteReview = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type} review?`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings/${type}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`Failed to delete ${type} review`);
      toast.success(`${type.toUpperCase()} review deleted`);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete review');
    }
  };

  if (loading) {
    return <MeetingsPanelSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm">
        <h3 className="text-gray-900 text-lg font-semibold mb-4">Weekly PM Review Sheet</h3>
        <form className="grid grid-cols-1 lg:grid-cols-2 gap-4" onSubmit={submitPmReview}>
          <div className="space-y-3">
            <input
              type="date"
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
              value={pmForm.meeting_date}
              onChange={(e) => setPmForm((prev) => ({ ...prev, meeting_date: e.target.value }))}
            />
            <select
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
              value={pmForm.rag_status}
              onChange={(e) => setPmForm((prev) => ({ ...prev, rag_status: e.target.value }))}
            >
              <option value="red">Red</option>
              <option value="amber">Amber</option>
              <option value="green">Green</option>
            </select>
            <textarea
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm min-h-[96px]"
              placeholder="Summary"
              value={pmForm.summary}
              onChange={(e) => setPmForm((prev) => ({ ...prev, summary: e.target.value }))}
            />
            <textarea
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm min-h-[96px]"
              placeholder="Decisions"
              value={pmForm.decisions}
              onChange={(e) => setPmForm((prev) => ({ ...prev, decisions: e.target.value }))}
            />
          </div>
          <div className="space-y-3">
            <textarea
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm min-h-[96px]"
              placeholder="Risks"
              value={pmForm.risks}
              onChange={(e) => setPmForm((prev) => ({ ...prev, risks: e.target.value }))}
            />
            <textarea
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm min-h-[144px]"
              placeholder="Action items (one line per item)"
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 px-6 py-2.5 rounded-lg text-white font-semibold hover:bg-blue-700 transition-colors text-sm"
            >
              Save PM Review
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm">
        <h3 className="text-gray-900 text-lg font-semibold mb-4">HR Review Sheet</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submitHrReview}>
          <input
            type="date"
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm md:col-span-2"
            value={hrForm.review_date}
            onChange={(e) => setHrForm((prev) => ({ ...prev, review_date: e.target.value }))}
          />
          <textarea
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm min-h-[96px]"
            placeholder="Employee Notes"
            value={hrForm.employee_notes}
            onChange={(e) => setHrForm((prev) => ({ ...prev, employee_notes: e.target.value }))}
          />
          <textarea
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm min-h-[96px]"
            placeholder="Manager Notes"
            value={hrForm.manager_notes}
            onChange={(e) => setHrForm((prev) => ({ ...prev, manager_notes: e.target.value }))}
          />
          <textarea
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm min-h-[96px] md:col-span-2"
            placeholder="Action Plan"
            value={hrForm.action_plan}
            onChange={(e) => setHrForm((prev) => ({ ...prev, action_plan: e.target.value }))}
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 px-6 py-2.5 rounded-lg text-white font-semibold hover:bg-indigo-700 transition-colors text-sm md:col-span-2"
          >
            Save HR Review
          </button>
        </form>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm">
          <h3 className="text-gray-900 text-lg font-semibold mb-4">PM Reviews & Action Items</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {pmReviews.map((review) => (
              <article key={review.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:border-gray-300 transition-colors relative group/item">
                <button 
                  className="absolute top-3 right-3 text-gray-400 hover:text-rose-500 opacity-0 group-item-hover:opacity-100 transition-all p-1"
                  onClick={() => deleteReview('pm', review.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${
                    review.rag_status === 'red' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                    review.rag_status === 'green' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                    'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  }`} />
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{review.meeting_date} • RAG: {review.rag_status?.toUpperCase()}</div>
                </div>
                <h4 className="text-gray-900 font-semibold mb-2 text-sm">{review.summary || 'No summary'}</h4>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{review.decisions || 'No decisions captured.'}</p>
                <div className="space-y-1.5">
                  {(review.action_items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white">
                      <span className="text-gray-700 font-medium">{item.title}</span>
                      {item.linked_card_id ? (
                        <span className="text-emerald-600 text-[10px] font-bold uppercase">Linked</span>
                      ) : (
                        <button
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold transition-colors"
                          onClick={() => convertActionItem(item.id)}
                        >
                          Convert to Card
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {!pmReviews.length && <div className="text-gray-400 text-sm font-medium py-10 text-center">No PM reviews yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm">
          <h3 className="text-gray-900 text-lg font-semibold mb-4">Meeting Calendar View</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {calendarRows.map((row) => (
              <div key={`${row.type}-${row.id}`} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:border-gray-300 transition-colors">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{row.date || '-'} • {(row.type || 'event').replace('_', ' ')}</div>
                <div className="text-sm text-gray-900 font-semibold mt-0.5">{row.title}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{row.details || 'No details'}</div>
              </div>
            ))}
            {!calendarRows.length && <div className="text-gray-400 text-sm font-medium py-10 text-center">No calendar entries available.</div>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm">
        <h3 className="text-gray-900 text-lg font-semibold mb-4">HR Review History</h3>
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {hrReviews.map((review) => (
            <article key={review.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:border-gray-300 transition-colors relative group/item">
              <button 
                className="absolute top-3 right-3 text-gray-400 hover:text-rose-500 opacity-0 group-item-hover:opacity-100 transition-all p-1"
                onClick={() => deleteReview('hr', review.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{review.review_date}</div>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed font-medium">{review.manager_notes || review.employee_notes || 'No notes yet.'}</p>
            </article>
          ))}
          {!hrReviews.length && <div className="text-gray-400 text-sm font-medium py-10 text-center">No HR reviews yet.</div>}
        </div>
      </section>
    </div>
  );
}
