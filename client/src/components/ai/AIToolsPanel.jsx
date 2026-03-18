import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../lib/api';

export default function AIToolsPanel() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [riskText, setRiskText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const runTool = async (path, payload, outputKey) => {
    setLoading(true);
    try {
      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setResult(data[outputKey] || JSON.stringify(data, null, 2));
      toast.success('AI response ready');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-5 space-y-3">
        <h3 className="text-white text-lg font-semibold">AI Assistant Toolkit (Phase 9)</h3>
        <input className="input-dark" placeholder="Ticket title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input-dark min-h-24" placeholder="Description / context" value={description} onChange={(e) => setDescription(e.target.value)} />
        <textarea className="input-dark min-h-20" placeholder="Risk statement" value={riskText} onChange={(e) => setRiskText(e.target.value)} />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          <button className="btn-secondary" disabled={loading} onClick={() => runTool('/api/ai/generate-description', { title, context: description }, 'description')}>Generate Description</button>
          <button className="btn-secondary" disabled={loading} onClick={() => runTool('/api/ai/improve-description', { description }, 'description')}>Improve Description</button>
          <button className="btn-secondary" disabled={loading} onClick={() => runTool('/api/ai/suggest-priority', { title, description }, 'suggestion')}>Suggest Priority</button>
          <button className="btn-secondary" disabled={loading} onClick={() => runTool('/api/ai/sprint-summary', { sprint: { name: 'Current Sprint' }, cards: [] }, 'summary')}>Sprint Summary</button>
          <button className="btn-secondary" disabled={loading} onClick={() => runTool('/api/ai/meeting-summary', { meeting: { title, notes: description } }, 'summary')}>Meeting Summary</button>
          <button className="btn-secondary" disabled={loading} onClick={() => runTool('/api/ai/risk-helper', { risk: riskText || description }, 'result')}>Risk Helper</button>
          <button className="btn-primary md:col-span-2 xl:col-span-3" disabled={loading} onClick={() => runTool('/api/ai/goal-narrative', { goal: { title, description }, keyResults: [] }, 'narrative')}>Goal Narrative</button>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h4 className="text-white font-semibold mb-2">AI Output</h4>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 min-h-56 text-sm text-slate-200 whitespace-pre-wrap">
          {result || 'Run any AI utility to see output.'}
        </div>
      </section>
    </div>
  );
}
