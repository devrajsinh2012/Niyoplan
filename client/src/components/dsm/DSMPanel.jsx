import React, { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

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

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entriesRes, latestRes] = await Promise.all([
        supabase
          .from('dsm_entries')
          .select('*, user:profiles!dsm_entries_user_id_fkey(id, full_name, avatar_url)')
          .eq('project_id', projectId)
          .order('submitted_at', { ascending: false }),
        apiFetch(`/api/projects/${projectId}/dsm/latest`)
      ]);

      if (entriesRes.error) throw entriesRes.error;

      setEntries(entriesRes.data || []);
      setLatestByMember(Array.isArray(latestRes) ? latestRes : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load DSM data');
    } finally {
      setLoading(false);
    }
  };

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
      const response = await apiFetch('/api/ai/dsm-summary', {
        method: 'POST',
        body: JSON.stringify({ entries: entries.slice(0, 20) })
      });
      setSummary(response.summary || 'No summary generated.');
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
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          <form className="flex-1 space-y-3" onSubmit={handleSubmit}>
            <h3 className="text-white text-lg font-semibold">Daily Standup Entry</h3>
            <textarea
              className="input-dark min-h-20"
              placeholder="What did you complete yesterday?"
              value={form.yesterday_text}
              onChange={(e) => handleInputChange('yesterday_text', e.target.value)}
            />
            <textarea
              className="input-dark min-h-20"
              placeholder="What are you doing today?"
              value={form.today_text}
              onChange={(e) => handleInputChange('today_text', e.target.value)}
            />
            <textarea
              className="input-dark min-h-16"
              placeholder="Any blockers?"
              value={form.blockers_text}
              onChange={(e) => handleInputChange('blockers_text', e.target.value)}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400">Mood</label>
              <select
                className="input-dark max-w-44"
                value={form.mood_rating}
                onChange={(e) => handleInputChange('mood_rating', e.target.value)}
              >
                {moodOptions.map((mood) => (
                  <option value={mood} key={mood}>{mood}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary ml-auto" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit DSM'}
              </button>
            </div>
          </form>

          <div className="lg:w-[420px] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">AI DSM Summary</h3>
              <button className="btn-secondary" onClick={generateAiSummary} disabled={summarizing}>
                {summarizing ? 'Generating...' : 'Generate with Groq'}
              </button>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 min-h-44 whitespace-pre-wrap">
              {summary || 'Generate a summary to see overall progress, blockers, and suggested actions.'}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-semibold">Team Grid</h3>
          <div className="text-xs text-slate-400">Latest entry per team member</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {latestByMember.map((entry) => {
            const status = getMemberStatus(entry.submitted_at);
            return (
              <article key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-medium">{entry.user?.full_name || 'Unknown User'}</div>
                  <span className={`px-2 py-0.5 rounded-full border text-xs ${getStatusBadge(status)}`}>
                    {status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Updated {formatDistanceToNow(new Date(entry.submitted_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-slate-300 line-clamp-2">Today: {entry.today_text}</p>
                {entry.blockers_text && (
                  <p className="text-xs text-amber-300/90 line-clamp-2 mt-1">Blockers: {entry.blockers_text}</p>
                )}
              </article>
            );
          })}
          {latestByMember.length === 0 && (
            <div className="text-slate-500 text-sm">No team entries yet.</div>
          )}
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h3 className="text-white text-lg font-semibold">DSM History</h3>
          <input
            className="input-dark max-w-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by member, yesterday, today, blockers"
          />
        </div>

        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-white">{entry.user?.full_name || 'Unknown User'}</div>
                <div className="text-xs text-slate-400">{new Date(entry.submitted_at).toLocaleString()}</div>
              </div>
              <p className="text-sm text-slate-300"><span className="text-slate-400">Yesterday:</span> {entry.yesterday_text}</p>
              <p className="text-sm text-slate-300"><span className="text-slate-400">Today:</span> {entry.today_text}</p>
              <p className="text-sm text-slate-300"><span className="text-slate-400">Blockers:</span> {entry.blockers_text || 'None'}</p>
            </article>
          ))}
          {!filteredEntries.length && (
            <div className="text-slate-500 text-sm">No entries match your search.</div>
          )}
        </div>
      </section>
    </div>
  );
}
