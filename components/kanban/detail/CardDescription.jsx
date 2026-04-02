'use client';

import React, { useRef } from 'react';
import { AlignLeft } from 'lucide-react';

export default function CardDescription({ 
  description, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onChange,
  isSaving 
}) {
  const descriptionInputRef = useRef(null);

  const applyFormat = (format) => {
    const textarea = descriptionInputRef.current;
    if (!textarea) return;

    const value = description || '';
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const selectedText = value.slice(start, end);

    let insertion = '';
    let selectionStart = start;
    let selectionEnd = end;

    if (format === 'bold') {
      if (selectedText) {
        insertion = `**${selectedText}**`;
        selectionEnd = start + insertion.length;
      } else {
        insertion = '**bold text**';
        selectionStart = start + 2;
        selectionEnd = start + 11;
      }
    }

    if (format === 'italic') {
      if (selectedText) {
        insertion = `*${selectedText}*`;
        selectionEnd = start + insertion.length;
      } else {
        insertion = '*italic text*';
        selectionStart = start + 1;
        selectionEnd = start + 12;
      }
    }

    if (format === 'bullet') {
      if (selectedText) {
        insertion = selectedText
          .split('\n')
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return '- ';
            return trimmed.startsWith('- ') ? trimmed : `- ${trimmed}`;
          })
          .join('\n');
        selectionEnd = start + insertion.length;
      } else {
        insertion = '- ';
        selectionStart = start + 2;
        selectionEnd = start + 2;
      }
    }

    onChange(`${value.slice(0, start)}${insertion}${value.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-heading)]">
          <AlignLeft size={16} className="text-[var(--text-muted)]" /> Description
        </h3>
      </div>
      
      {isEditing ? (
        <div className="rounded-[4px] border-2 border-[var(--accent-primary)] bg-[var(--bg-surface)] p-2 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2 px-2 pt-1">
            <button
              type="button"
              className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
              onClick={() => applyFormat('bold')}
            >
              Bold
            </button>
            <button
              type="button"
              className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs font-semibold italic text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
              onClick={() => applyFormat('italic')}
            >
              Italic
            </button>
            <button
              type="button"
              className="rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
              onClick={() => applyFormat('bullet')}
            >
              Bullet List
            </button>
          </div>
          <textarea 
            ref={descriptionInputRef}
            className="w-full min-h-[160px] resize-y border-none bg-transparent p-2 text-[14px] leading-relaxed text-[var(--text-primary)] focus:outline-none" 
            placeholder="Add a more detailed description..."
            value={description}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 p-2">
            <button 
              className="rounded-[3px] bg-[var(--accent-primary)] px-4 py-1.5 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50" 
              onClick={onSave} 
              disabled={isSaving}
            >
              Save
            </button>
            <button 
              className="rounded-[3px] px-4 py-1.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]" 
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div 
          className={`group relative min-h-[60px] cursor-pointer rounded-[4px] p-3 transition-colors hover:bg-[var(--bg-panel-hover)] ${!description ? 'text-[var(--text-muted)] italic font-medium' : 'text-[var(--text-primary)] leading-relaxed'}`}
          onClick={onEdit}
        >
          {description ? (
            <p className="whitespace-pre-wrap text-[14px]">{description}</p>
          ) : (
            'Add a description...'
          )}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 rounded bg-[var(--bg-surface)] shadow-sm ring-1 ring-black/5 text-[var(--text-muted)]">
              <span className="text-[10px] font-bold px-1 uppercase">Edit</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
