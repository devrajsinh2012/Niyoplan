'use client';

import React from 'react';
import { AlignLeft } from 'lucide-react';
import RichTextEditor from '@/components/ui/RichTextEditor';

export default function CardDescription({ 
  description, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onChange,
  isSaving 
}) {

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-heading)]">
          <AlignLeft size={16} className="text-[var(--text-muted)]" /> Description
        </h3>
      </div>
      
      {isEditing ? (
        <div className="rounded-[4px] border-2 border-[var(--accent-primary)] bg-[var(--bg-surface)] p-2 shadow-sm">
          <RichTextEditor
            value={description}
            onChange={onChange}
            placeholder="Add a more detailed description..."
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
            <div 
              className="prose prose-sm max-w-none text-[14px] leading-relaxed text-[var(--text-primary)] marker:text-[var(--text-primary)] prose-ul:list-disc prose-ol:list-decimal prose-blockquote:border-l-4 prose-blockquote:border-[var(--border-strong)] prose-blockquote:pl-4 prose-blockquote:italic [data-theme=dark]_&:prose-invert"
              dangerouslySetInnerHTML={{ __html: description }}
            />
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
