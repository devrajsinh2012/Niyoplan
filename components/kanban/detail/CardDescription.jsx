'use client';

import React from 'react';
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
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-heading)]">
          <AlignLeft size={16} className="text-[#42526E]" /> Description
        </h3>
      </div>
      
      {isEditing ? (
        <div className="rounded-[4px] border-2 border-[#0052CC] bg-white p-2 shadow-sm">
          <textarea 
            className="w-full min-h-[160px] resize-y border-none bg-transparent p-2 text-[14px] leading-relaxed text-[var(--text-primary)] focus:outline-none" 
            placeholder="Add a more detailed description..."
            value={description}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 p-2">
            <button 
              className="rounded-[3px] bg-[#0052CC] px-4 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-[#00388D] disabled:opacity-50" 
              onClick={onSave} 
              disabled={isSaving}
            >
              Save
            </button>
            <button 
              className="rounded-[3px] px-4 py-1.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[#F4F5F7]" 
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div 
          className={`group relative min-h-[60px] cursor-pointer rounded-[4px] p-3 transition-colors hover:bg-[#F4F5F7] ${!description ? 'text-[var(--text-muted)] italic font-medium' : 'text-[var(--text-primary)] leading-relaxed'}`}
          onClick={onEdit}
        >
          {description ? (
            <p className="whitespace-pre-wrap text-[14px]">{description}</p>
          ) : (
            'Add a description...'
          )}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 rounded bg-white shadow-sm ring-1 ring-black/5 text-[#42526E]">
              <span className="text-[10px] font-bold px-1 uppercase">Edit</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
