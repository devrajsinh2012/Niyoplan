'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import Portal from '@/components/modals/Portal';

/**
 * Reusable modal for simple text input prompts
 * Replaces browser prompt() with a styled in-app modal
 */
export default function InputModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Enter Value',
  label = 'Value',
  placeholder = 'Enter value...',
  defaultValue = '',
  submitLabel = 'Create',
  maxLength = 100,
  required = true,
  multiline = false,
  icon: Icon = Check,
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedValue = value.trim();
    if (required && !trimmedValue) return;
    onSubmit(trimmedValue);
    setValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const InputComponent = multiline ? 'textarea' : 'input';
  const inputProps = multiline
    ? { rows: 4, className: 'resize-none' }
    : { type: 'text' };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[10000] bg-[#091E42]/60 backdrop-blur-[4px] flex justify-center items-center p-4"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
      >
        <div className="relative w-full max-w-[560px] bg-[var(--bg-surface)] rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden transition-all ring-1 ring-black/5">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
              <h2 className="text-xl font-bold text-[var(--text-heading)] tracking-tight flex items-center gap-2">
                <Icon className="text-[#0052CC]" size={20} />
                {title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)] hover:text-[#0052CC] transition-all"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 custom-scrollbar min-h-0 text-left">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <InputComponent
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                required={required}
                autoFocus
                className="w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none"
                {...inputProps}
              />
              {maxLength && (
                <div className="text-xs text-[var(--text-muted)] text-right">
                  {value.length}/{maxLength}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[3px] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={required && !value.trim()}
                className="rounded-[3px] bg-[#0052CC] px-7 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00388D] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
