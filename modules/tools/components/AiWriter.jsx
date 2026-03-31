'use client';

import React, { useState } from 'react';
import { Copy, Loader2, WandSparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/apiClient';

export default function AiWriterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refineText = async () => {
    if (!input.trim()) {
      setError('Enter text to refine');
      setOutput('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/ai/refine-text', {
        method: 'POST',
        body: JSON.stringify({ text: input }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to refine text');
      }

      setOutput(payload?.result || '');
      toast.success('Text refined');
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || 'Failed to refine text');
      setOutput('');
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = async () => {
    if (!output.trim()) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is not available');
      }

      await navigator.clipboard.writeText(output);
      toast.success('Copied refined text');
    } catch (copyError) {
      console.error(copyError);
      toast.error(copyError.message || 'Unable to copy text');
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]">
          <WandSparkles size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">AI Writing Assistant</h2>
          <p className="text-sm text-[var(--text-secondary)]">Refine text into a concise professional tone.</p>
        </div>
      </div>

      <div className="space-y-3">
        <textarea
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError('');
          }}
          placeholder="Paste text to refine"
          className="min-h-[170px] w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3 text-sm leading-6 text-[var(--text-heading)] outline-none transition-colors focus:border-[var(--border-focus)]"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refineText}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}
            {loading ? 'Refining...' : 'Refine Text'}
          </button>

          <button
            type="button"
            onClick={copyOutput}
            disabled={!output.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy size={14} /> Copy output
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Refined output</div>
          <textarea
            readOnly
            value={output}
            placeholder="The refined version will appear here"
            className="min-h-[180px] w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm leading-6 text-[var(--text-heading)] outline-none"
          />
        </div>
      </div>
    </section>
  );
}