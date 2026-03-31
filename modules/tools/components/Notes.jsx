'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, FileText, Plus, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'niyoplan-tools-notes';
const ACTIVE_NOTE_KEY = 'niyoplan-tools-active-note';

const createNote = () => ({
  id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  content: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const formatTimestamp = (value) => {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export default function NotesTool() {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedNotes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const safeNotes = Array.isArray(storedNotes)
        ? storedNotes.filter((note) => note && typeof note === 'object' && typeof note.id === 'string')
        : [];

      setNotes(safeNotes);
      setSelectedId(localStorage.getItem(ACTIVE_NOTE_KEY) || safeNotes[0]?.id || null);
    } catch (error) {
      console.error('Failed to load notes', error);
      setNotes([]);
      setSelectedId(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) || null,
    [notes, selectedId]
  );

  useEffect(() => {
    setDraft(selectedNote?.content || '');
  }, [selectedNote?.id]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    localStorage.setItem(ACTIVE_NOTE_KEY, selectedId || '');
  }, [hydrated, notes, selectedId]);

  useEffect(() => {
    if (!hydrated || !selectedNote) {
      return;
    }

    if (selectedNote.content === draft) {
      return;
    }

    const timestamp = new Date().toISOString();
    setNotes((currentNotes) => currentNotes.map((note) => (
      note.id === selectedNote.id
        ? { ...note, content: draft, updatedAt: timestamp }
        : note
    )));
  }, [draft, hydrated, selectedNote]);

  const handleCreateNote = () => {
    const note = createNote();
    setNotes((currentNotes) => [note, ...currentNotes]);
    setSelectedId(note.id);
    setDraft('');
  };

  const handleSelectNote = (noteId) => {
    setSelectedId(noteId);
  };

  const handleDeleteNote = (noteId) => {
    setNotes((currentNotes) => {
      const remainingNotes = currentNotes.filter((note) => note.id !== noteId);

      if (selectedId === noteId) {
        setSelectedId(remainingNotes[0]?.id || null);
        setDraft(remainingNotes[0]?.content || '');
      }

      return remainingNotes;
    });
  };

  const displayedNotes = [...notes].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-heading)]">Notes</h2>
            <p className="text-sm text-[var(--text-secondary)]">Autosaved quick notes for daily work.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateNote}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
        >
          <Plus size={14} /> New note
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {displayedNotes.length} notes
          </div>

          {displayedNotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
              No notes yet. Create one to get started.
            </div>
          ) : displayedNotes.map((note) => {
            const preview = note.content.trim() || 'Untitled note';
            const isActive = note.id === selectedId;

            return (
              <div
                key={note.id}
                className={`rounded-lg border p-3 transition-colors ${isActive ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'}`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectNote(note.id)}
                  className="w-full text-left"
                >
                  <div className="truncate text-sm font-semibold text-[var(--text-heading)]">{preview}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Clock3 size={12} />
                    {formatTimestamp(note.updatedAt)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            );
          })}
        </aside>

        <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text-heading)]">
                {selectedNote ? 'Edit note' : 'No note selected'}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {selectedNote ? `Last saved ${formatTimestamp(selectedNote.updatedAt)}` : 'Create a note to start typing.'}
              </div>
            </div>
          </div>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!selectedNote}
            placeholder="Write a quick note here..."
            className="min-h-[260px] w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3 text-sm leading-6 text-[var(--text-heading)] outline-none transition-colors focus:border-[var(--border-focus)] disabled:cursor-not-allowed disabled:bg-[var(--bg-panel)]"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <span>Autosaves locally in your browser.</span>
            {selectedNote && (
              <button
                type="button"
                onClick={() => handleDeleteNote(selectedNote.id)}
                className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700"
              >
                <Trash2 size={12} /> Delete selected note
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}