import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/api';

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
      const [pm, hr, cal] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/meetings/pm`),
        apiFetch(`/api/projects/${projectId}/meetings/hr`).catch(() => []),
        apiFetch(`/api/projects/${projectId}/meetings/calendar`)
      ]);
      setPmReviews(pm || []);
      setHrReviews(hr || []);
      setCalendarRows(cal || []);
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

      await apiFetch(`/api/projects/${projectId}/meetings/pm`, {
        method: 'POST',
        body: JSON.stringify({ ...pmForm, action_items: actionItems })
      });

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
      await apiFetch(`/api/projects/${projectId}/meetings/hr`, {
        method: 'POST',
        body: JSON.stringify(hrForm)
      });

      setHrForm((prev) => ({ ...prev, employee_notes: '', manager_notes: '', action_plan: '' }));
      toast.success('HR review saved');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create HR review');
    }
  };

  const convertActionItem = async (actionItemId) => {
    try {
      await apiFetch(`/api/projects/${projectId}/meetings/action-items/${actionItemId}/convert-to-card`, {
        method: 'POST'
      });
      toast.success('Action item converted to board card');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to convert action item');
    }
  };

  if (loading) {
    return <div className="glass-panel rounded-2xl p-6 text-slate-300">Loading meeting reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-5">
        <h3 className="text-white text-lg font-semibold mb-4">Weekly PM Review Sheet</h3>
        <form className="grid grid-cols-1 lg:grid-cols-2 gap-4" onSubmit={submitPmReview}>
          <div className="space-y-3">
            <input
              type="date"
              className="input-dark"
              value={pmForm.meeting_date}
              onChange={(e) => setPmForm((prev) => ({ ...prev, meeting_date: e.target.value }))}
            />
            <select
              className="input-dark"
              value={pmForm.rag_status}
              onChange={(e) => setPmForm((prev) => ({ ...prev, rag_status: e.target.value }))}
            >
              <option value="red">Red</option>
              <option value="amber">Amber</option>
              <option value="green">Green</option>
            </select>
            <textarea className="input-dark min-h-24" placeholder="Summary" value={pmForm.summary} onChange={(e) => setPmForm((prev) => ({ ...prev, summary: e.target.value }))} />
            <textarea className="input-dark min-h-24" placeholder="Decisions" value={pmForm.decisions} onChange={(e) => setPmForm((prev) => ({ ...prev, decisions: e.target.value }))} />
          </div>
          <div className="space-y-3">
            <textarea className="input-dark min-h-24" placeholder="Risks" value={pmForm.risks} onChange={(e) => setPmForm((prev) => ({ ...prev, risks: e.target.value }))} />
            <textarea
              className="input-dark min-h-36"
              placeholder="Action items (one line per item)"
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
            />
            <button type="submit" className="btn-primary w-full">Save PM Review</button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h3 className="text-white text-lg font-semibold mb-4">HR Review Sheet</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submitHrReview}>
          <input type="date" className="input-dark md:col-span-2" value={hrForm.review_date} onChange={(e) => setHrForm((prev) => ({ ...prev, review_date: e.target.value }))} />
          <textarea className="input-dark min-h-24" placeholder="Employee Notes" value={hrForm.employee_notes} onChange={(e) => setHrForm((prev) => ({ ...prev, employee_notes: e.target.value }))} />
          <textarea className="input-dark min-h-24" placeholder="Manager Notes" value={hrForm.manager_notes} onChange={(e) => setHrForm((prev) => ({ ...prev, manager_notes: e.target.value }))} />
          <textarea className="input-dark min-h-24 md:col-span-2" placeholder="Action Plan" value={hrForm.action_plan} onChange={(e) => setHrForm((prev) => ({ ...prev, action_plan: e.target.value }))} />
          <button type="submit" className="btn-primary md:col-span-2">Save HR Review</button>
        </form>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-white text-lg font-semibold mb-4">PM Reviews & Action Items</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {pmReviews.map((review) => (
              <article key={review.id} className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
                <div className="text-sm text-slate-400 mb-1">{review.meeting_date} • RAG: {review.rag_status?.toUpperCase()}</div>
                <h4 className="text-white font-medium mb-2">{review.summary || 'No summary'}</h4>
                <p className="text-sm text-slate-300 mb-2">{review.decisions || 'No decisions captured.'}</p>
                <div className="space-y-2">
                  {(review.action_items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-sm border border-slate-800 rounded-lg px-3 py-2">
                      <span className="text-slate-200">{item.title}</span>
                      {item.linked_card_id ? (
                        <span className="text-emerald-300 text-xs">Linked</span>
                      ) : (
                        <button className="btn-secondary text-xs" onClick={() => convertActionItem(item.id)}>Convert to Card</button>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {!pmReviews.length && <div className="text-slate-500 text-sm">No PM reviews yet.</div>}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-white text-lg font-semibold mb-4">Meeting Calendar View</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {calendarRows.map((row) => (
              <div key={`${row.type}-${row.id}`} className="border border-slate-800 rounded-lg p-3 bg-slate-900/40">
                <div className="text-xs text-slate-400">{row.date} • {row.type.replace('_', ' ')}</div>
                <div className="text-sm text-white font-medium">{row.title}</div>
                <div className="text-xs text-slate-300 mt-1">{row.details || 'No details'}</div>
              </div>
            ))}
            {!calendarRows.length && <div className="text-slate-500 text-sm">No calendar entries available.</div>}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h3 className="text-white text-lg font-semibold mb-4">HR Review History</h3>
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {hrReviews.map((review) => (
            <article key={review.id} className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
              <div className="text-xs text-slate-400">{review.review_date}</div>
              <p className="text-sm text-slate-200 mt-1">{review.manager_notes || review.employee_notes || 'No notes yet.'}</p>
            </article>
          ))}
          {!hrReviews.length && <div className="text-slate-500 text-sm">No HR reviews yet.</div>}
        </div>
      </section>
    </div>
  );
}
