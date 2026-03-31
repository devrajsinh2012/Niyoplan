'use client';

import React, { useState } from 'react';
import { Braces, Check, FileJson, RotateCcw } from 'lucide-react';
import { formatJsonText } from '../lib/jsonFormatter';

export default function JsonFormatterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleFormat = () => {
    try {
      if (!input.trim()) {
        throw new Error('Enter JSON to format');
      }

      const formatted = formatJsonText(input);
      setOutput(formatted);
      setError('');
    } catch (formatError) {
      setOutput('');
      setError(formatError.message || 'Invalid JSON');
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleFormat();
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]">
          <Braces size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">JSON Formatter & Validator</h2>
          <p className="text-sm text-[var(--text-secondary)]">Format JSON locally and surface validation errors.</p>
        </div>
      </div>

      <div className="space-y-3">
        <textarea
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Paste JSON here"
          className="min-h-[180px] w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3 font-mono text-sm leading-6 text-[var(--text-heading)] outline-none transition-colors focus:border-[var(--border-focus)]"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleFormat}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Check size={14} /> Format JSON
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
          >
            <RotateCcw size={14} /> Clear
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <FileJson size={12} /> Formatted output
          </div>
          <textarea
            readOnly
            value={output}
            placeholder="Formatted JSON will appear here"
            className="min-h-[180px] w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 font-mono text-sm leading-6 text-[var(--text-heading)] outline-none"
          />
        </div>
      </div>
    </section>
  );
}