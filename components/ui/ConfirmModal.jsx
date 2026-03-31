'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  icon: Icon = AlertTriangle,
  loading = false,
}) {
  if (!isOpen) return null;

  const confirmButtonClass = destructive
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/30'
    : 'bg-[var(--accent-primary)] hover:opacity-90 focus:ring-[var(--accent-primary)]/30';

  const iconColorClass = destructive ? 'text-red-600 bg-red-100' : 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10';

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`rounded-full p-2 ${iconColorClass}`}>
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
