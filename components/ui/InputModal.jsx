'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

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
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 shadow-2xl flex flex-col bg-white">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Icon className="text-blue-600" size={24} />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="text-gray-700 mb-2 block text-sm font-medium">
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
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-base"
              {...inputProps}
            />
            {maxLength && (
              <div className="text-xs text-gray-400 mt-1 text-right">
                {value.length}/{maxLength}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={required && !value.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
