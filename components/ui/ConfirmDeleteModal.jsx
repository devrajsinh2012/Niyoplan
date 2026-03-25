'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDeleteModal({ isOpen, title, message, onConfirm, onCancel, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 shadow-lg flex flex-col bg-white animate-fade-in">
        
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            {title || 'Confirm Delete'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 text-gray-700">
          <p>{message || 'Are you sure you want to delete this item?'}</p>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all font-semibold disabled:opacity-50"
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
