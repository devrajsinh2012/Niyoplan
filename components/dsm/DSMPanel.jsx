'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const moodOptions = ['great', 'good', 'okay', 'stressed'];

function getMemberStatus(submittedAt) {
  if (!submittedAt) return 'missing';
  const submitted = new Date(submittedAt);
  const now = new Date();
  const hours = Math.abs(now.getTime() - submitted.getTime()) / (1000 * 60 * 60);
  return hours <= 24 ? 'updated' : 'stale';
}

function getStatusBadge(status) {
  if (status === 'updated') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (status === 'stale') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
}

export default function DSMPanel({ projectId }) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState([]);
  const [latestByMember, setLatestByMember] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState('');
  const [form, setForm] = useState({
    yesterday_text: '',
    today_text: '',
    blockers_text: '',
    mood_rating: 'good'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: entriesData, error: entriesError } = await supabase
        .from('dsm_entries')
        .select('*, user:profiles!dsm_entries_user_id_fkey(id, full_name, avatar_url)')
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false });

      if (entriesError) throw entriesError;

      const latestRes = await fetch(`/api/projects/${projectId}/dsm/latest`);
      const latestData = await latestRes.json();

      setEntries(entriesData || []);
      setLatestByMember(Array.isArray(latestData) ? latestData : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load DSM data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId, loadData]);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries;

    return entries.filter((entry) => {
      return (
        entry.user?.full_name?.toLowerCase().includes(normalized) ||
        entry.yesterday_text?.toLowerCase().includes(normalized) ||
        entry.today_text?.toLowerCase().includes(normalized) ||
        entry.blockers_text?.toLowerCase().includes(normalized)
      );
    });
  }, [entries, query]);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.yesterday_text.trim() || !form.today_text.trim()) {
      toast.error('Yesterday and Today are required');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('dsm_entries')
        .insert({
          project_id: projectId,
          user_id: profile?.id,
          yesterday_text: form.yesterday_text.trim(),
          today_text: form.today_text.trim(),
          blockers_text: form.blockers_text.trim() || null,
          mood_rating: form.mood_rating
        })
        .select('*, user:profiles!dsm_entries_user_id_fkey(id, full_name, avatar_url)')
        .single();

      if (error) throw error;

      setEntries((prev) => [data, ...prev]);
      setLatestByMember((prev) => {
        const withoutCurrent = prev.filter((entry) => entry.user_id !== data.user_id);
        return [data, ...withoutCurrent];
      });

      setForm({
        yesterday_text: '',
        today_text: '',
        blockers_text: '',
        mood_rating: 'good'
      });

      toast.success('DSM entry submitted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit DSM entry');
    } finally {
      setSubmitting(false);
    }
  };

  const generateAiSummary = async () => {
    if (!entries.length) {
      toast.error('No DSM entries to summarize yet');
      return;
    }

    setSummarizing(true);
    try {
      const response = await fetch('/api/ai/dsm-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: entries.slice(0, 20) })
      });
      const data = await response.json();
      setSummary(data.summary || 'No summary generated.');
      toast.success('DSM summary generated');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to generate AI summary');
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 flex items-center justify-center text-slate-300">
        Loading DSM workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-5 bg-slate-900/50 border border-slate-800">
        <div className="flex flex-col lg:flex-row gap-6">
          <form className="flex-1 space-y-3" onSubmit={handleSubmit}>
            <h3 className="text-white text-lg font-semibold">Daily Standup Entry</h3>
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm min-h-[80px]"
              placeholder="What did you complete yesterday?"
              value={form.yesterday_text}
              onChange={(e) => handleInputChange('yesterday_text', e.target.value)}
            />
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm min-h-[80px]"
              placeholder="What are you doing today?"
              value={form.today_text}
              onChange={(e) => handleInputChange('today_text', e.target.value)}
            />
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm min-h-[64px]"
              placeholder="Any blockers?"
              value={form.blockers_text}
              onChange={(e) => handleInputChange('blockers_text', e.target.value)}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400 font-medium">Mood</label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none text-sm"
                value={form.mood_rating}
                onChange={(e) => handleInputChange('mood_rating', e.target.value)}
              >
                {moodOptions.map((mood) => (
                  <option value={mood} key={mood} className="bg-slate-800">{mood}</option>
                ))}
              </select>
              <button 
                type="submit" 
                className="bg-blue-600 px-6 py-2 rounded-lg text-white font-semibold hover:bg-blue-700 transition-colors ml-auto text-sm disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit DSM'}
              </button>
            </div>
          </form>

          <div className="lg:w-[420px] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">AI DSM Summary</h3>
              <button 
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-1.5 text-xs text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                onClick={generateAiSummary} 
                disabled={summarizing}
              >
                {summarizing ? 'Generating...' : 'Generate with Groq'}
              </button>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 min-h-[176px] whitespace-pre-wrap leading-relaxed">
              {summary || 'Generate a summary to see overall progress, blockers, and suggested actions.'}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5 bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-semibold">Team Grid</h3>
          <div className="text-xs text-slate-400 font-medium">Latest entry per team member</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {latestByMember.map((entry) => {
            const status = getMemberStatus(entry.submitted_at);
            return (
              <article key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold text-sm">{entry.user?.full_name || 'Unknown User'}</div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(status)}`}>
                    {status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mb-2">
                  Updated {formatDistanceToNow(new Date(entry.submitted_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-medium">Today: {entry.today_text}</p>
                {entry.blockers_text && (
                  <p className="text-xs text-rose-400 font-semibold line-clamp-2 mt-2">Blockers: {entry.blockers_text}</p>
                )}
              </article>
            );
          })}
          {latestByMember.length === 0 && (
            <div className="text-slate-500 text-sm font-medium py-10 text-center col-span-full">No team entries yet.</div>
          )}
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5 bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h3 className="text-white text-lg font-semibold">DSM History</h3>
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none text-sm max-w-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by member, yesterday, today, blockers"
          />
        </div>

        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-white text-sm">{entry.user?.full_name || 'Unknown User'}</div>
                <div className="text-[10px] text-slate-500 font-medium">{new Date(entry.submitted_at).toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed font-medium"><span className="text-slate-500 mr-1.5 font-bold uppercase text-[9px]">Yesterday:</span> {entry.yesterday_text}</p>
                <p className="text-xs text-slate-300 leading-relaxed font-medium"><span className="text-slate-500 mr-1.5 font-bold uppercase text-[9px]">Today:</span> {entry.today_text}</p>
                <p className="text-xs text-slate-300 leading-relaxed font-medium"><span className="text-slate-500 mr-1.5 font-bold uppercase text-[9px]">Blockers:</span> {entry.blockers_text || <span className="text-slate-600 font-normal">None</span>}</p>
              </div>
            </article>
          ))}
          {!filteredEntries.length && (
            <div className="text-slate-600 text-sm font-medium py-20 text-center">No entries match your search.</div>
          )}
        </div>
      </section>
    </div>
  );
}
