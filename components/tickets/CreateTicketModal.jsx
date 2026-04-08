'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Portal from '@/components/modals/Portal';
import RichTextEditor from '@/components/ui/RichTextEditor';

const DEFAULT_LISTS = [
  { name: 'Backlog', rank: 1000 },
  { name: 'To Do', rank: 2000 },
  { name: 'In Progress', rank: 3000 },
  { name: 'In Review', rank: 4000 },
  { name: 'Done', rank: 5000 }
];

export default function CreateTicketModal({ projectId, defaultSprintId = null, onClose, onCreated }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_type: 'task',
    status: 'backlog',
    priority: 'medium',
    story_points: '',
    assignee_id: '',
    sprint_id: defaultSprintId || '',
    start_date: '',
    due_date: ''
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, sprint_id: defaultSprintId || '' }));
  }, [defaultSprintId]);

  useEffect(() => {
    if (!projectId) return;
    const fetchUsers = async () => {
      const { data } = await supabase.from('project_members')
        .select('user_id, profile:profiles(id, full_name)')
        .eq('project_id', projectId);
      if (data) setUsers(data.map(d => d.profile).filter(Boolean));
    };
    fetchUsers();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const fetchSprints = async () => {
      const { data } = await supabase
        .from('sprints')
        .select('id, name, status')
        .eq('project_id', projectId)
        .in('status', ['active', 'planning', 'upcoming']) // Only show active/upcoming sprints
        .order('created_at', { ascending: false });

      if (data) setSprints(data);
    };

    fetchSprints();
  }, [projectId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  const getOrCreateLists = async () => {
    const { data: existingLists, error: listFetchError } = await supabase
      .from('lists')
      .select('id, name, rank')
      .eq('project_id', projectId)
      .order('rank', { ascending: true });

    if (listFetchError) throw listFetchError;

    let lists = existingLists || [];

    if (lists.length === 0) {
      const { data: createdLists, error: createListsError } = await supabase
        .from('lists')
        .insert(DEFAULT_LISTS.map((list) => ({
          project_id: projectId,
          name: list.name,
          rank: list.rank
        })))
        .select('id, name, rank')
        .order('rank', { ascending: true });

      if (createListsError) throw createListsError;
      lists = createdLists || [];
    }

    return lists;
  };

  const resolveListIdForStatus = (lists, status) => {
    const normalizedStatus = (status || '').trim().toLowerCase();
    const match = lists.find((list) => {
      const normalizedName = (list.name || '').trim().toLowerCase();
      if (normalizedStatus === 'done') return normalizedName === 'done';
      if (normalizedStatus === 'in_review') return normalizedName === 'in review';
      if (normalizedStatus === 'in_progress') return normalizedName === 'in progress';
      if (normalizedStatus === 'todo') return normalizedName === 'to do' || normalizedName === 'todo';
      return normalizedName === 'backlog';
    });

    return match?.id || lists[0]?.id || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const lists = await getOrCreateLists();
      const targetListId = resolveListIdForStatus(lists, formData.status);
      const now = new Date();
      const startAt = formData.start_date ? new Date(formData.start_date) : now;
      const dueAt = formData.due_date ? new Date(formData.due_date) : startAt;

      const { data, error } = await supabase
        .from('cards')
        .insert({
          project_id: projectId,
          title: formData.title,
          description: formData.description,
          issue_type: formData.issue_type,
          priority: formData.priority,
          assignee_id: formData.assignee_id || profile.id,
          reporter_id: profile.id,
          sprint_id: formData.sprint_id || null,
          story_points: formData.story_points ? parseInt(formData.story_points, 10) : null,
          status: formData.status,
          list_id: targetListId,
          rank: now.getTime(),
          start_date: startAt.toISOString(),
          due_date: dueAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('activity_log').insert({
        card_id: data.id,
        user_id: profile.id,
        action: 'created',
        details: { title: data.title }
      });

      toast.success(`Created ${data.custom_id}`);
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000] bg-[#091E42]/60 backdrop-blur-[4px] flex justify-center items-center p-4">
        <div
          className="relative w-full max-w-4xl bg-[var(--bg-surface)] rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden transition-all ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          <form id="create-ticket-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">

            <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)]/50 bg-[var(--bg-surface)] px-6 py-5">
              <h2 className="text-xl font-bold text-[var(--text-heading)] tracking-tight">Create Issue</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)] hover:text-[#0052CC] transition-all hover:rotate-90"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar min-h-0 text-left">

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Title *</label>
              <input
                name="title"
                required
                type="text"
                className="w-full rounded-[3px] border-2 border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all focus:border-[#0052CC] focus:bg-[var(--bg-surface)] focus:outline-none"
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Description</label>
              <RichTextEditor
                value={formData.description}
                onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
                placeholder="Add details, acceptance criteria, context..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Issue Type</label>
                <select
                  name="issue_type"
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                  value={formData.issue_type}
                  onChange={handleChange}
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
                  name="status"
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                  value={formData.status}
                  onChange={handleChange}
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
                  name="priority"
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Story Points</label>
                <input
                  name="story_points"
                  type="number"
                  min="0"
                  max="100"
                  className="font-mono w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                  placeholder="e.g. 5"
                  value={formData.story_points}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Assignee</label>
                <select
                  name="assignee_id"
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                  value={formData.assignee_id}
                  onChange={handleChange}
                >
                  <option value="">Auto (Reporter)</option>
                  {users.length === 0 ? (
                    <option disabled>No team members available</option>
                  ) : (
                    users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Sprint</label>
                <select
                  name="sprint_id"
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                  value={formData.sprint_id}
                  onChange={handleChange}
                >
                  <option value="">Unplanned</option>
                  {sprints.length === 0 ? (
                    <option disabled>No active sprints</option>
                  ) : (
                    sprints.map((sprint) => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.name}{sprint.status ? ` (${sprint.status})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Start Date</label>
                <input
                  name="start_date"
                  type="date"
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                  value={formData.start_date}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Due Date</label>
                <input
                  name="due_date"
                  type="date"
                  className="w-full rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0052CC] focus:outline-none"
                  value={formData.due_date}
                  onChange={handleChange}
                />
              </div>
            </div>
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
                form="create-ticket-form"
                type="submit"
                disabled={isSubmitting}
                className="rounded-[3px] bg-[#0052CC] px-7 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#00388D] disabled:opacity-50 active:scale-95 flex items-center gap-2"
              >
                {isSubmitting ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" /> : <><Save size={16} />Create Issue</>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </Portal>
  );
}
