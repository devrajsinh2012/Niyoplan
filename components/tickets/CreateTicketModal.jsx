'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 shadow-2xl flex flex-col max-h-[90vh] bg-white">

        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-blue-600" size={24} />
            Create Issue
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="create-ticket-form" onSubmit={handleSubmit} className="space-y-6 flex flex-col">

            <div>
              <label className="text-gray-700 mb-2 block text-sm font-medium">Summary / Title *</label>
              <input
                name="title"
                required
                type="text"
                className="text-lg w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="text-gray-700 mb-2 block text-sm font-medium">Description</label>
              <textarea
                name="description"
                className="min-h-[150px] resize-y w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Add details, acceptance criteria, context..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

              <div>
                <label className="text-gray-700 mb-2 block text-sm font-medium">Issue Type</label>
                <select
                  name="issue_type"
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
                <label className="text-gray-700 mb-2 block text-sm font-medium">Status</label>
                <select
                  name="status"
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
                <label className="text-gray-700 mb-2 block text-sm font-medium">Priority</label>
                <select
                  name="priority"
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
                <label className="text-gray-700 mb-2 block text-sm font-medium">Story Points</label>
                <input
                  name="story_points"
                  type="number"
                  min="0"
                  max="100"
                  className="font-mono w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 5"
                  value={formData.story_points}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="text-gray-700 mb-2 block text-sm font-medium">Start Date</label>
                <input
                  name="start_date"
                  type="date"
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={formData.start_date}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="text-gray-700 mb-2 block text-sm font-medium">Due Date</label>
                <input
                  name="due_date"
                  type="date"
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={formData.due_date}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="text-gray-700 mb-2 block text-sm font-medium">Sprint</label>
                <select
                  name="sprint_id"
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={formData.sprint_id}
                  onChange={handleChange}
                >
                  <option value="">Unplanned</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}{sprint.status ? ` (${sprint.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-700 mb-2 block text-sm font-medium">Assignee</label>
              <select
                name="assignee_id"
                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={formData.assignee_id}
                onChange={handleChange}
              >
                <option value="">Auto (Reporter)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-6 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all font-semibold"
          >
            Cancel
          </button>
          <button
            form="create-ticket-form"
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-8 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 font-semibold"
          >
            {isSubmitting ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div> : <><Save size={18}/> Create</>}
          </button>
        </div>

      </div>
    </div>
  );
}
