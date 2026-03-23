'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function AIToolsPanel({ projectId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [riskText, setRiskText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [meetings, setMeetings] = useState([]);

  const loadContext = useCallback(async () => {
    if (!projectId) return;
    try {
      const safeArray = async (url) => {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };

      const loadCards = () => safeArray(`/api/projects/${projectId}/cards`);
      const loadSprints = () => safeArray(`/api/projects/${projectId}/sprints`);
      const loadMeetings = () => safeArray(`/api/projects/${projectId}/meetings/calendar`);

      const [cardsRes, sprintsRes, meetingsRes] = await Promise.all([
        loadCards(), loadSprints(), loadMeetings()
      ]);
      setCards(cardsRes);
      setSprints(sprintsRes);
      setMeetings(meetingsRes);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load AI context data');
    }
  }, [projectId]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const runTool = async (path, payload, outputKey) => {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
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
      <section className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-gray-900 text-lg font-bold">AI Assistant Toolkit</h3>
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full inline-block">
          Context: {cards.length} cards · {sprints.length} sprints · {meetings.length} meetings
        </div>

        <div className="space-y-3">
          <input
            className="w-full bg-white border border-gray-300 rounded-xl p-3.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold"
            placeholder="Ticket title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full bg-white border border-gray-300 rounded-xl p-3.5 text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium min-h-[120px] leading-relaxed"
            placeholder="Description / context"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <textarea
            className="w-full bg-white border border-gray-300 rounded-xl p-3.5 text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium min-h-[96px] leading-relaxed"
            placeholder="Risk statement"
            value={riskText}
            onChange={(e) => setRiskText(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 pt-2">
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50" disabled={loading} onClick={() => runTool('/api/ai/generate-description', { title, context: description }, 'description')}>Generate Description</button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50" disabled={loading} onClick={() => runTool('/api/ai/improve-description', { description }, 'description')}>Improve Description</button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50" disabled={loading} onClick={() => runTool('/api/ai/suggest-priority', { title, description }, 'suggestion')}>Suggest Priority</button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50" disabled={loading} onClick={() => runTool('/api/ai/sprint-summary', { sprint: sprints.find((s) => s.status === 'active') || sprints[0] || { name: 'No sprint found' }, cards }, 'summary')}>Sprint Summary</button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50" disabled={loading} onClick={() => runTool('/api/ai/meeting-summary', { meeting: meetings[0] || { title: title || 'Meeting Notes', notes: description } }, 'summary')}>Meeting Summary</button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50" disabled={loading} onClick={() => runTool('/api/ai/risk-helper', { risk: riskText || description }, 'result')}>Risk Helper</button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 md:col-span-2 xl:col-span-3 transition-colors shadow-lg" disabled={loading} onClick={() => runTool('/api/ai/goal-narrative', { goal: { title, description }, keyResults: cards.slice(0, 5).map((card) => ({ title: card.title, target_value: card.story_points || 1 })) }, 'narrative')}>Create Goal Narrative</button>
        </div>
      </section>

      <section className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm">
        <h4 className="text-gray-900 font-bold text-base mb-4">AI Intelligence Output</h4>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 min-h-[224px] text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Processing Intelligence...</span>
            </div>
          ) : (
            result || 'Run any AI utility to see intelligence output here.'
          )}
        </div>
      </section>
    </div>
  );
}
