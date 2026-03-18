import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/api';

export default function GoalsPanel({ projectId }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    target_date: '',
    key_results: [{ title: '', start_value: 0, target_value: 100, unit: 'points' }]
  });

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/projects/${projectId}/goals`);
      setGoals(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadGoals();
  }, [projectId, loadGoals]);

  const createGoal = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...goalForm,
        key_results: goalForm.key_results.filter((kr) => kr.title)
      };
      await apiFetch(`/api/projects/${projectId}/goals`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setGoalForm({
        title: '',
        description: '',
        target_date: '',
        key_results: [{ title: '', start_value: 0, target_value: 100, unit: 'points' }]
      });
      toast.success('Goal created');
      loadGoals();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create goal');
    }
  };

  const updateKr = (index, field, value) => {
    setGoalForm((prev) => {
      const updated = [...prev.key_results];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, key_results: updated };
    });
  };

  const addKrRow = () => {
    setGoalForm((prev) => ({
      ...prev,
      key_results: [...prev.key_results, { title: '', start_value: 0, target_value: 100, unit: 'points' }]
    }));
  };

  const generateNarrative = async (goal) => {
    try {
      const response = await apiFetch('/api/ai/goal-narrative', {
        method: 'POST',
        body: JSON.stringify({ goal, keyResults: goal.key_results || [] })
      });
      toast.success('Narrative generated');
      alert(response.narrative || 'No narrative returned');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to generate narrative');
    }
  };

  if (loading) return <div className="glass-panel rounded-2xl p-6 text-slate-300">Loading goals...</div>;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-5">
        <h3 className="text-white text-lg font-semibold mb-4">Goals / OKRs</h3>
        <form onSubmit={createGoal} className="space-y-3">
          <input className="input-dark" placeholder="Goal title" value={goalForm.title} onChange={(e) => setGoalForm((prev) => ({ ...prev, title: e.target.value }))} />
          <textarea className="input-dark min-h-24" placeholder="Goal description" value={goalForm.description} onChange={(e) => setGoalForm((prev) => ({ ...prev, description: e.target.value }))} />
          <input type="date" className="input-dark max-w-xs" value={goalForm.target_date} onChange={(e) => setGoalForm((prev) => ({ ...prev, target_date: e.target.value }))} />

          <div className="space-y-2">
            <div className="text-sm text-slate-300 font-medium">Key Results</div>
            {goalForm.key_results.map((kr, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input className="input-dark md:col-span-2" placeholder="KR title" value={kr.title} onChange={(e) => updateKr(index, 'title', e.target.value)} />
                <input type="number" className="input-dark" placeholder="Start" value={kr.start_value} onChange={(e) => updateKr(index, 'start_value', Number(e.target.value || 0))} />
                <input type="number" className="input-dark" placeholder="Target" value={kr.target_value} onChange={(e) => updateKr(index, 'target_value', Number(e.target.value || 0))} />
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addKrRow}>+ Add KR</button>
          </div>

          <button type="submit" className="btn-primary">Create Goal</button>
        </form>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {goals.map((goal) => (
          <article key={goal.id} className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="text-white font-semibold">{goal.title}</h4>
              <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-300">{goal.progress || 0}%</span>
            </div>
            <p className="text-sm text-slate-300 mb-3">{goal.description || 'No description'}</p>
            <div className="space-y-2 mb-3">
              {(goal.key_results || []).map((kr) => (
                <div key={kr.id} className="border border-slate-800 rounded-lg p-3 bg-slate-900/50">
                  <div className="text-sm text-white">{kr.title}</div>
                  <div className="text-xs text-slate-400">{kr.current_value} / {kr.target_value} {kr.unit}</div>
                </div>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => generateNarrative(goal)}>Generate Goal Narrative</button>
          </article>
        ))}
        {!goals.length && <div className="text-slate-500 text-sm">No goals created yet.</div>}
      </section>
    </div>
  );
}
