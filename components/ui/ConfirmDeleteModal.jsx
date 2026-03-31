'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDeleteModal({ isOpen, title, message, onConfirm, onCancel, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-[var(--border-subtle)] shadow-2xl flex flex-col bg-[var(--bg-surface)] animate-fade-in relative">
        
        <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            {title || 'Confirm Delete'}
          </h2>
          <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 hover:bg-[var(--bg-panel-hover)] rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 text-[var(--text-secondary)]">
          <p>{message || 'Are you sure you want to delete this item?'}</p>
        </div>

        <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end gap-3 bg-[var(--bg-panel)] rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] transition-all font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>}
            Delete
          </button>
        </div>

      </div>
    </div>
  );
}
