'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, MoreHorizontal, Paperclip, CheckSquare,
  AlignLeft, Activity, List, Clock, Send, Loader, Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useScheduleStore } from '@/context/ScheduleStore';
import { useOrganization } from '@/context/OrganizationContext';
import UserAvatar from '@/components/ui/UserAvatar';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { apiFetch } from '@/lib/apiClient';
import FileAttachment from '@/components/FileAttachment';
import toast from 'react-hot-toast';

// Sub-components
import CardDescription from './detail/CardDescription';
import CardActivity from './detail/CardActivity';
import CardSidebar from './detail/CardSidebar';
import Portal from '@/components/modals/Portal';

const toDateInput = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export default function CardDetail({ card, onClose, onSave, onDelete, isSaving = false }) {
  const { profile } = useAuth();
  const { activeOrganization } = useOrganization();
  const { removeScheduleItem } = useScheduleStore();
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditCardForm, setShowEditCardForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);
  
  const [form, setForm] = useState({
    title: card?.title || '',
    description: card?.description || '',
    issue_type: card?.issue_type || 'task',
    status: card?.status || 'todo',
    priority: card?.priority || 'medium',
    story_points: card?.story_points ?? '',
    assignee_id: card?.assignee_id || '',
    sprint_id: card?.sprint_id || '',
    start_date: toDateInput(card?.start_date),
    due_date: toDateInput(card?.due_date)
  });

  const [activeTab, setActiveTab] = useState('comments');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!card?.id) return;
    setIsLoadingComments(true);
    try {
      const res = await apiFetch(`/api/cards/${card.id}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [card?.id]);

  const fetchSubtasks = useCallback(async () => {
    if (!card?.id) return;
    setIsLoadingSubtasks(true);
    try {
      const res = await apiFetch(`/api/cards/${card.id}/subtasks`);
      if (!res.ok) throw new Error('Failed to fetch subtasks');
      const data = await res.json();
      setSubtasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSubtasks(false);
    }
  }, [card?.id]);

  const fetchUsers = useCallback(async () => {
    if (!card?.project_id) return;
    try {
      const res = await apiFetch(`/api/projects/${card.project_id}/members`);

      if (!res.ok) {
        let message = 'Failed to fetch project members';
        try {
          const errorBody = await res.json();
          message = errorBody?.error || message;
        } catch {
          // Ignore JSON parse failures and keep the generic message.
        }
        throw new Error(message);
      }

      const data = await res.json();
      let mapped = (data || []).map((member) => member?.profile || member).filter(Boolean);
      mapped.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setUsers(mapped);
    } catch (err) {
      console.error('Failed to load card assignees:', err);
    }
  }, [card?.project_id]);

  const fetchSprints = useCallback(async () => {
    if (!card?.project_id) return;

    try {
      const res = await apiFetch(`/api/projects/${card.project_id}/sprints`);

      if (!res.ok) {
        let message = 'Failed to fetch project sprints';
        try {
          const errorBody = await res.json();
          message = errorBody?.error || message;
        } catch {
          // Ignore JSON parse failures and keep the generic message.
        }
        throw new Error(message);
      }

      const data = await res.json();
      const normalizedSprints = Array.isArray(data) ? data : [];
      setSprints(normalizedSprints);
    } catch (err) {
      console.error('Failed to load card sprints:', err);
      setSprints([]);
    }
  }, [card?.project_id]);

  // Fetch comments and subtasks
  useEffect(() => {
    if (card?.id) {
      fetchComments();
      fetchSubtasks();
      fetchUsers();
      fetchSprints();
    }
  }, [card?.id, fetchComments, fetchSubtasks, fetchUsers, fetchSprints]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setForm({
      title: card?.title || '',
      description: card?.description || '',
      issue_type: card?.issue_type || 'task',
      status: card?.status || 'todo',
      priority: card?.priority || 'medium',
      story_points: card?.story_points ?? '',
      assignee_id: card?.assignee_id || '',
      sprint_id: card?.sprint_id || '',
      start_date: toDateInput(card?.start_date),
      due_date: toDateInput(card?.due_date)
    });
  }, [
    card?.id,
    card?.title,
    card?.description,
    card?.issue_type,
    card?.status,
    card?.priority,
    card?.story_points,
    card?.assignee_id,
    card?.sprint_id,
    card?.start_date,
    card?.due_date
  ]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await apiFetch(`/api/cards/${card.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment })
      });

      if (!res.ok) throw new Error('Failed to add comment');
      const newCommentObj = await res.json();
      setComments([...comments, newCommentObj]);
      setNewComment('');
      toast.success('Comment added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add comment');
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    setIsAddingSubtask(true);
    try {
      const res = await apiFetch(`/api/cards/${card.id}/subtasks`, {
        method: 'POST',
        body: JSON.stringify({ title: newSubtaskTitle })
      });

      if (!res.ok) throw new Error('Failed to add subtask');
      const newSubtaskObj = await res.json();
      setSubtasks([...subtasks, newSubtaskObj]);
      setNewSubtaskTitle('');
      toast.success('Subtask added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add subtask');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId, completed) => {
    try {
      const res = await apiFetch(`/api/cards/${card.id}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !completed })
      });

      if (!res.ok) throw new Error('Failed to update subtask');
      const updatedSubtask = await res.json();
      setSubtasks(subtasks.map(s => s.id === subtaskId ? updatedSubtask : s));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      const res = await apiFetch(`/api/cards/${card.id}/subtasks/${subtaskId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete subtask');
      setSubtasks(subtasks.filter(s => s.id !== subtaskId));
      toast.success('Subtask deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete subtask');
    }
  };

  if (!card) return null;

  const buildPayload = (source) => ({
    ...source,
    issue_type: source.issue_type || 'task',
    assignee_id: source.assignee_id || card?.reporter_id || profile?.id || null,
    sprint_id: source.sprint_id || null,
    story_points: source.story_points === '' ? null : Number(source.story_points),
    start_date: source.start_date || null,
    due_date: source.due_date || null
  });

  const submitForm = async (nextState) => {
    await onSave?.(buildPayload(nextState));
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    await submitForm(form);
  };

  const handleDescSave = () => {
    setIsEditingDesc(false);
    handleSubmit();
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'backlog': return 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]';
      case 'todo': return 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]';
      case 'in_progress': return 'bg-[var(--status-inprogress-bg)] text-[var(--status-inprogress-text)] border-[var(--status-inprogress-border)] hover:opacity-90';
      case 'in_review': return 'bg-[var(--status-inreview-bg)] text-[var(--status-inreview-text)] border-[var(--status-inreview-border)] hover:opacity-90';
      case 'done': return 'bg-[var(--status-done-bg)] text-[var(--status-done-text)] border-[var(--status-done-border)] hover:opacity-90';
      default: return 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };

  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const handleDeleteCard = async () => {
    setIsDeleting(true);
    try {
      if (!card?.project_id) throw new Error('Missing project context for this card');

      const res = await apiFetch(`/api/projects/${card.project_id}/cards/${card.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        let message = 'Failed to delete card';
        try {
          const errorBody = await res.json();
          message = errorBody?.error || message;
        } catch {
          // Ignore JSON parse failures and keep generic fallback message.
        }
        throw new Error(message);
      }

      toast.success('Card deleted');
      removeScheduleItem(card.id);
      onDelete?.(card.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to delete card');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditCardSubmit = async (event) => {
    event.preventDefault();
    const success = await submitForm(form);
    if (success !== false) {
      setShowEditCardForm(false);
      setShowMenu(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000] bg-[#091E42]/60 backdrop-blur-[4px] flex justify-center items-center p-4 md:p-10" onClick={onClose}>
      <div className="relative max-h-[90vh] min-h-[500px] w-full max-w-6xl animate-fade-in flex flex-col overflow-hidden rounded-[12px] bg-[var(--bg-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Breadcrumb & Actions */}
        <header className="flex items-center justify-between border-b border-[var(--border-subtle)]/50 px-6 py-4 bg-[var(--bg-surface)] rounded-t-[12px]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)]">
            <span className="hover:text-[var(--accent-primary)] cursor-pointer">Projects</span>
            <span className="opacity-40">/</span>
            <span className="hover:text-[var(--accent-primary)] cursor-pointer">Workspace</span>
            <span className="opacity-40">/</span>
            <span className="font-mono text-[var(--text-primary)] font-bold tracking-tight">{card.prefix || card.custom_id}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative" ref={menuRef}>
              <button className="flex items-center justify-center p-2 rounded-[3px] text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] transition-colors" onClick={() => setShowMenu(!showMenu)}><MoreHorizontal size={16} /></button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-surface)] rounded-lg shadow-lg border border-[var(--border-subtle)] z-50">
                  <button className="w-full text-left px-4 py-2 hover:bg-[var(--bg-panel-hover)] transition-colors flex items-center gap-2 text-sm text-red-600 last:rounded-b-lg" onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}>
                    <Trash2 size={14} /> Delete card
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-[var(--bg-panel-hover)] transition-colors flex items-center gap-2 text-sm text-[var(--text-primary)] border-t border-[var(--border-subtle)] rounded-b-lg"
                    onClick={() => {
                      setShowEditCardForm(true);
                      setShowMenu(false);
                    }}
                  >
                    <AlignLeft size={14} /> Edit card details
                  </button>
                </div>
              )}
            </div>
            <button className="ml-2 flex items-center justify-center p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] transition-colors" onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col lg:flex-row h-full">
          {/* Main Column */}
          <div className="flex-[7] min-w-0 p-6 md:p-8 overflow-y-auto">
            <textarea
              className="w-full resize-none overflow-hidden rounded-[3px] border-2 border-transparent bg-transparent px-2 py-1 text-2xl font-bold text-[var(--text-heading)] transition-all hover:bg-[var(--bg-panel-hover)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:outline-none"
              value={form.title}
              onChange={(e) => {
                setForm(p => ({ ...p, title: e.target.value }));
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onBlur={handleSubmit}
              rows={1}
            />

            <div className="mt-6 mb-10 flex flex-wrap gap-2">
              <button 
                className="flex items-center gap-2 rounded-[3px] bg-[var(--bg-panel)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)] active:bg-[var(--border-subtle)]"
                onClick={() => setShowAttachments((current) => !current)}
              >
                <Paperclip size={14} /> {showAttachments ? 'Hide Attachments' : 'Attach'}
              </button>
              <button 
                className="flex items-center gap-2 rounded-[3px] bg-[var(--bg-panel)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
                onClick={() => {
                  const subtaskSection = document.getElementById('card-subtasks-section');
                  subtaskSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <CheckSquare size={14} /> Subtasks
              </button>
            </div>

            {showAttachments && (
              <div className="mb-8">
                <FileAttachment
                  orgId={card?.organization_id || activeOrganization?.id}
                  projectId={card?.project_id}
                  cardId={card?.id}
                />
              </div>
            )}

            <CardDescription
              description={form.description}
              isEditing={isEditingDesc}
              onEdit={() => setIsEditingDesc(true)}
              onSave={handleDescSave}
              onCancel={() => setIsEditingDesc(false)}
              onChange={(val) => setForm(p => ({ ...p, description: val }))}
              isSaving={isSaving}
            />

            <CardActivity
              layout="stacked"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              comments={comments}
              subtasks={subtasks}
              profile={profile}
              newComment={newComment}
              setNewComment={setNewComment}
              onAddComment={handleAddComment}
              isLoadingComments={isLoadingComments}
              newSubtaskTitle={newSubtaskTitle}
              setNewSubtaskTitle={setNewSubtaskTitle}
              onAddSubtask={handleAddSubtask}
              isAddingSubtask={isAddingSubtask}
              isLoadingSubtasks={isLoadingSubtasks}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
            />
          </div>

          <CardSidebar
            form={form}
            setForm={setForm}
            submitForm={submitForm}
            onOpenEditForm={() => setShowEditCardForm(true)}
            getStatusStyle={getStatusStyle}
            card={card}
            profile={profile}
            users={users}
            isSaving={isSaving}
          />
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title="Delete Card"
        message={`Are you sure you want to delete ${card.custom_id}? This action cannot be undone.`}
        onConfirm={handleDeleteCard}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
      />

      {showEditCardForm && (
        <div className="fixed inset-0 z-[10010] bg-[#091E42]/60 backdrop-blur-[4px] flex justify-center items-center p-4" onClick={() => setShowEditCardForm(false)}>
          <div className="relative w-full max-w-3xl bg-[var(--bg-surface)] rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden transition-all ring-1 ring-black/5" onClick={(event) => event.stopPropagation()}>
            <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
              <h2 className="text-xl font-bold text-[var(--text-heading)] tracking-tight">Edit Card</h2>
              <button type="button" onClick={() => setShowEditCardForm(false)} className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)] hover:text-[#0052CC] transition-all" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditCardSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 custom-scrollbar min-h-0 text-left">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Title</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none"
                  value={form.title}
                  onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Description</label>
                <textarea
                  className="min-h-[120px] w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none"
                  value={form.description}
                  onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Issue Type</label>
                  <select
                    className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                    value={form.issue_type}
                    onChange={(event) => setForm((previous) => ({ ...previous, issue_type: event.target.value }))}
                  >
                    <option value="task">Task</option>
                    <option value="story">Story</option>
                    <option value="bug">Bug</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Status</label>
                  <select
                    className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                    value={form.status}
                    onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Priority</label>
                  <select
                    className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                    value={form.priority}
                    onChange={(event) => setForm((previous) => ({ ...previous, priority: event.target.value }))}
                  >
                    <option value="highest">Highest</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="lowest">Lowest</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Assignee</label>
                  <select
                    className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                    value={form.assignee_id}
                    onChange={(event) => setForm((previous) => ({ ...previous, assignee_id: event.target.value }))}
                  >
                    <option value="">Auto (Reporter)</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Sprint</label>
                  <select
                    className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                    value={form.sprint_id}
                    onChange={(event) => setForm((previous) => ({ ...previous, sprint_id: event.target.value }))}
                  >
                    <option value="">Unplanned</option>
                    {sprints.map((sprint) => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.name}{sprint.status ? ` (${sprint.status})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Story Points</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                    value={form.story_points}
                    onChange={(event) => setForm((previous) => ({ ...previous, story_points: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Start Date</label>
                  <input
                    type="date"
                    className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                    value={form.start_date}
                    onChange={(event) => setForm((previous) => ({ ...previous, start_date: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Due Date</label>
                  <input
                    type="date"
                    className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                    value={form.due_date}
                    onChange={(event) => setForm((previous) => ({ ...previous, due_date: event.target.value }))}
                  />
                </div>
              </div>
              </div>

              <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
                <button
                  type="button"
                  onClick={() => setShowEditCardForm(false)}
                  className="rounded-[3px] px-5 py-2 text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-panel-hover)] hover:text-[var(--text-primary)] active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-[3px] bg-[#0052CC] px-7 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00388D] disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </Portal>
  );
}
