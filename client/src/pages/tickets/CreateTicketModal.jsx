import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_LISTS = [
  { name: 'Backlog', rank: 1000 },
  { name: 'To Do', rank: 2000 },
  { name: 'In Progress', rank: 3000 },
  { name: 'In Review', rank: 4000 },
  { name: 'Done', rank: 5000 }
];

export default function CreateTicketModal({ projectId, onClose, onCreated }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const { profile } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_type: 'task',
    priority: 'medium',
    story_points: '',
    assignee_id: ''
  });

  useEffect(() => {
    // Fetch workspace users for assignee dropdown
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getOrCreateBacklogListId = async () => {
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

    const backlogList = lists.find((list) => {
      const normalized = (list.name || '').trim().toLowerCase();
      return normalized === 'backlog' || normalized === 'to do' || normalized === 'todo';
    });

    return (backlogList || lists[0])?.id || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const backlogListId = await getOrCreateBacklogListId();
      const now = new Date();

      const { data, error } = await supabase
        .from('cards')
        .insert({
          project_id: projectId,
          title: formData.title,
          description: formData.description,
          issue_type: formData.issue_type,
          priority: formData.priority,
          assignee_id: formData.assignee_id || null,
          reporter_id: profile.id,
          story_points: formData.story_points ? parseInt(formData.story_points, 10) : null,
          status: 'backlog',
          list_id: backlogListId,
          rank: now.getTime(),
          start_date: now.toISOString(),
          due_date: now.toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      // Log activity
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
      toast.error(err.message || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="text-blue-400" size={24} />
            Create Issue
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="create-ticket-form" onSubmit={handleSubmit} className="space-y-6 flex flex-col">
            
            {/* Title */}
            <div>
              <label className="label-dark">Summary / Title *</label>
              <input
                name="title"
                required
                type="text"
                className="input-dark text-lg"
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            {/* Description */}
            <div>
              <label className="label-dark">Description</label>
              <textarea
                name="description"
                className="input-dark min-h-[150px] resize-y"
                placeholder="Add details, acceptance criteria, context..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* 3-Column Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div>
                <label className="label-dark">Issue Type</label>
                <select name="issue_type" className="input-dark" value={formData.issue_type} onChange={handleChange}>
                  <option value="task">Task</option>
                  <option value="story">Story</option>
                  <option value="bug">Bug</option>
                  <option value="epic">Epic</option>
                </select>
              </div>

              <div>
                <label className="label-dark">Priority</label>
                <select name="priority" className="input-dark" value={formData.priority} onChange={handleChange}>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="label-dark">Story Points</label>
                <input
                  name="story_points"
                  type="number"
                  min="0"
                  max="100"
                  className="input-dark font-mono"
                  placeholder="e.g. 5"
                  value={formData.story_points}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="label-dark">Assignee</label>
              <select name="assignee_id" className="input-dark" value={formData.assignee_id} onChange={handleChange}>
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary px-6">
            Cancel
          </button>
          <button 
            form="create-ticket-form" 
            type="submit" 
            disabled={isSubmitting}
            className="btn-primary px-8 flex items-center gap-2"
          >
            {isSubmitting ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div> : <><Save size={18}/> Create</>}
          </button>
        </div>

      </div>
    </div>
  );
}
