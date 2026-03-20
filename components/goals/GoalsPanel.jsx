'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function GoalsPanel({ projectId }) {
  const [goals, setGoals] = useState([]);
  const [narrative, setNarrative] = useState('');
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
      const res = await fetch(`/api/projects/${projectId}/goals`);
      const data = await res.json();
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
      
      const res = await fetch(`/api/projects/${projectId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create goal');
      }

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
      const res = await fetch('/api/ai/goal-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, keyResults: goal.key_results || [] })
      });
      const data = await res.json();
      setNarrative(data.narrative || 'No narrative returned');
      toast.success('Narrative generated');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to generate narrative');
    }
  };

  if (loading) return <div className="glass-panel rounded-2xl p-6 text-slate-300">Loading goals...</div>;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800">
        <h3 className="text-white text-lg font-semibold mb-4">Goals / OKRs</h3>
        <form onSubmit={createGoal} className="space-y-4">
          <input 
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm font-medium" 
            placeholder="Goal title" 
            value={goalForm.title} 
            onChange={(e) => setGoalForm((prev) => ({ ...prev, title: e.target.value }))} 
          />
          <textarea 
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm font-medium min-h-[96px]" 
            placeholder="Goal description" 
            value={goalForm.description} 
            onChange={(e) => setGoalForm((prev) => ({ ...prev, description: e.target.value }))} 
          />
          <input 
            type="date" 
            className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none text-sm max-w-[200px]" 
            value={goalForm.target_date} 
            onChange={(e) => setGoalForm((prev) => ({ ...prev, target_date: e.target.value }))} 
          />

          <div className="space-y-3">
            <div className="text-sm text-slate-400 font-bold uppercase tracking-wider">Key Results</div>
            {goalForm.key_results.map((kr, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none text-xs font-semibold md:col-span-2" 
                  placeholder="KR title" 
                  value={kr.title} 
                  onChange={(e) => updateKr(index, 'title', e.target.value)} 
                />
                <input 
                  type="number" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none text-xs font-semibold" 
                  placeholder="Start" 
                  value={kr.start_value} 
                  onChange={(e) => updateKr(index, 'start_value', Number(e.target.value || 0))} 
                />
                <input 
                  type="number" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none text-xs font-semibold" 
                  placeholder="Target" 
                  value={kr.target_value} 
                  onChange={(e) => updateKr(index, 'target_value', Number(e.target.value || 0))} 
                />
              </div>
            ))}
            <button 
              type="button" 
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg px-4 py-2 text-xs font-bold transition-colors" 
              onClick={addKrRow}
            >
              + Add KR
            </button>
          </div>

          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 text-sm font-bold transition-colors w-full md:w-auto"
          >
            Create Goal
          </button>
        </form>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {goals.map((goal) => (
          <article key={goal.id} className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-white font-bold text-base">{goal.title}</h4>
              <span className="text-[10px] px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold uppercase tracking-widest">{goal.progress || 0}% PROGRESS</span>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed font-medium">{goal.description || 'No description'}</p>
            <div className="space-y-2 mb-5">
              {(goal.key_results || []).map((kr) => (
                <div key={kr.id} className="border border-slate-800 rounded-xl p-4 bg-slate-900/80">
                  <div className="text-xs text-white font-bold mb-1">{kr.title}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{kr.current_value} / {kr.target_value} {kr.unit}</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${Math.min(100, (kr.current_value / kr.target_value) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            <button 
              className="w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors" 
              onClick={() => generateNarrative(goal)}
            >
              Generate Goal Narrative
            </button>
          </article>
        ))}
        {!goals.length && <div className="text-slate-600 text-sm font-medium py-10 text-center col-span-full">No goals created yet.</div>}
      </section>

      <section className="glass-panel rounded-2xl p-6 bg-slate-900/50 border border-slate-800">
        <h4 className="text-white font-bold text-base mb-3">Goal Narrative Output</h4>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 min-h-[160px] text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">
          {narrative || 'Generate a narrative from any goal card to see stakeholder-ready text here.'}
        </div>
      </section>
    </div>
  );
}
