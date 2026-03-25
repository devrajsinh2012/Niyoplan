'use client';

import React, { useState } from 'react';
import { X, Link as LinkIcon, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import './DependencyManager.css';

const DEPENDENCY_TYPES = [
  { value: 'finish_start', label: 'Finish → Start', desc: 'Predecessor finishes before successor starts' },
  { value: 'finish_finish', label: 'Finish → Finish', desc: 'Both tasks finish at same time' },
  { value: 'start_start', label: 'Start → Start', desc: 'Both tasks start at same time' },
  { value: 'start_finish', label: 'Start → Finish', desc: 'Successor finishes when predecessor starts' },
];

/**
 * DependencyManager Modal
 * Handles creating, editing, and deleting task dependencies with full type support
 */
export default function DependencyManager({
  isOpen,
  onClose,
  scheduleItems = [],
  selectedDependency = null,
  onCreateDependency,
  onUpdateDependency,
  onDeleteDependency,
  projectId,
}) {
  const [mode, setMode] = useState('create'); // 'create', 'edit', 'delete'
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [depType, setDepType] = useState('finish_start');
  const [leadLagDays, setLeadLagDays] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAuthHeaders = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      throw new Error('You are not authenticated. Please sign in again.');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  // Initialize form when dependency is selected
  React.useEffect(() => {
    if (selectedDependency && isOpen) {
      setMode('edit');
      setSourceId(selectedDependency.predecessor_id);
      setTargetId(selectedDependency.successor_id);
      setDepType(selectedDependency.type || 'finish_start');
      setLeadLagDays(selectedDependency.lead_or_lag_days || 0);
    } else {
      setMode('create');
      setSourceId('');
      setTargetId('');
      setDepType('finish_start');
      setLeadLagDays(0);
    }
  }, [selectedDependency, isOpen]);

  const handleCreate = async () => {
    if (!sourceId || !targetId) {
      toast.error('Please select both source and target tasks');
      return;
    }

    if (sourceId === targetId) {
      toast.error('Source and target tasks cannot be the same');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/projects/${projectId}/dependencies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          predecessor_id: sourceId,
          successor_id: targetId,
          type: depType,
          lead_or_lag_days: leadLagDays,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create dependency');
      }

      toast.success('Dependency created');
      onCreateDependency?.();
      handleClose();
    } catch (err) {
      console.error('Dependency create error:', err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDependency) return;

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/projects/${projectId}/dependencies/${selectedDependency.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          type: depType,
          lead_or_lag_days: leadLagDays,
        }),
      });

      if (!res.ok) throw new Error('Failed to update dependency');

      toast.success('Dependency updated');
      onUpdateDependency?.();
      handleClose();
    } catch (err) {
      console.error('Dependency update error:', err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDependency) return;

    if (!confirm('Delete this dependency? This cannot be undone.')) return;

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('You are not authenticated. Please sign in again.');
      }

      const res = await fetch(`/api/projects/${projectId}/dependencies/${selectedDependency.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete dependency');

      toast.success('Dependency deleted');
      onDeleteDependency?.();
      handleClose();
    } catch (err) {
      console.error('Dependency delete error:', err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSourceId('');
    setTargetId('');
    setDepType('finish_start');
    setLeadLagDays(0);
    setMode('create');
    onClose();
  };

  const sourceTask = scheduleItems.find(item => item.id === sourceId);
  const targetTask = scheduleItems.find(item => item.id === targetId);

  if (!isOpen) return null;

  return (
    <div className="dependency-manager-overlay">
      <div className="dependency-manager-modal">
        <div className="dm-header">
          <h3 className="dm-title">
            <LinkIcon size={20} />
            {mode === 'create' && 'Create Dependency'}
            {mode === 'edit' && 'Edit Dependency'}
            {mode === 'delete' && 'Delete Dependency'}
          </h3>
          <button className="dm-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dm-body">
          {mode === 'create' && (
            <>
              {/* Source Task Selection */}
              <div className="dm-form-group">
                <label className="dm-label">Source Task (Predecessor)</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="dm-select"
                >
                  <option value="">-- Select a task --</option>
                  {scheduleItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.custom_id ? `${item.custom_id} - ` : ''}{item.title}
                    </option>
                  ))}
                </select>
                {sourceTask && (
                  <div className="dm-preview">
                    <span className="dm-preview-label">Selected:</span>
                    <span className="dm-preview-value">{sourceTask.title}</span>
                  </div>
                )}
              </div>

              {/* Target Task Selection */}
              <div className="dm-form-group">
                <label className="dm-label">Target Task (Successor)</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="dm-select"
                >
                  <option value="">-- Select a task --</option>
                  {scheduleItems
                    .filter(item => item.id !== sourceId)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.custom_id ? `${item.custom_id} - ` : ''}{item.title}
                      </option>
                    ))}
                </select>
                {targetTask && (
                  <div className="dm-preview">
                    <span className="dm-preview-label">Selected:</span>
                    <span className="dm-preview-value">{targetTask.title}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {(mode === 'edit' || mode === 'create') && (
            <>
              {/* Dependency Type Selection */}
              <div className="dm-form-group">
                <label className="dm-label">Dependency Type</label>
                <div className="dm-type-grid">
                  {DEPENDENCY_TYPES.map(depOpt => (
                    <label key={depOpt.value} className={`dm-type-card ${depType === depOpt.value ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="dep-type"
                        value={depOpt.value}
                        checked={depType === depOpt.value}
                        onChange={(e) => setDepType(e.target.value)}
                        className="dm-radio"
                      />
                      <div>
                        <div className="dm-type-label">{depOpt.label}</div>
                        <div className="dm-type-desc">{depOpt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lead/Lag Days */}
              <div className="dm-form-group">
                <label className="dm-label">
                  Lead / Lag Days
                  <span className="dm-label-hint">Negative = lead, Positive = lag</span>
                </label>
                <input
                  type="number"
                  min="-365"
                  max="365"
                  value={leadLagDays}
                  onChange={(e) => setLeadLagDays(parseInt(e.target.value) || 0)}
                  className="dm-input"
                />
              </div>
            </>
          )}

          {mode === 'edit' && (
            <div className="dm-info">
              <p><strong>Source:</strong> {sourceTask?.title}</p>
              <p><strong>Target:</strong> {targetTask?.title}</p>
            </div>
          )}

          {mode === 'delete' && (
            <div className="dm-warning">
              <p className="dm-warning-title">Delete this dependency?</p>
              <p className="dm-warning-desc">
                This will remove the link between {sourceTask?.title} and {targetTask?.title}.
              </p>
            </div>
          )}
        </div>

        <div className="dm-footer">
          <button className="dm-btn dm-btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <div className="dm-action-group">
            {mode === 'edit' && (
              <button
                className="dm-btn dm-btn-danger"
                onClick={() => setMode('delete')}
                disabled={isSubmitting}
              >
                <Trash2 size={16} /> Delete
              </button>
            )}
            <button
              className="dm-btn dm-btn-primary"
              onClick={mode === 'create' ? handleCreate : mode === 'delete' ? handleDelete : handleUpdate}
              disabled={isSubmitting}
            >
              {mode === 'delete' ? 'Delete' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
