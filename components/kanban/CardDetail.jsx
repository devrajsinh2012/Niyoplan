'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, MoreHorizontal, Paperclip, CheckSquare, Link, ChevronDown,
  AlignLeft, Activity, List, Clock, Send, Eye, Loader, Trash2, Copy
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/ui/UserAvatar';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Sub-components
import CardDescription from './detail/CardDescription';
import CardActivity from './detail/CardActivity';
import CardSidebar from './detail/CardSidebar';

const toDateInput = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export default function CardDetail({ card, onClose, onSave, isSaving = false }) {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);
  
  const [form, setForm] = useState({
    title: card?.title || '',
    description: card?.description || '',
    status: card?.status || 'todo',
    priority: card?.priority || 'medium',
    story_points: card?.story_points ?? '',
    assignee_id: card?.assignee_id || '',
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

  const fetchComments = useCallback(async () => {
    if (!card?.id) return;
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/cards/${card.id}/comments`);
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
      const res = await fetch(`/api/cards/${card.id}/subtasks`);
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
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id, profile:profiles(id, full_name)')
        .eq('project_id', card.project_id);

      if (error) throw error;
      
      let mapped = (data || []).map(d => d.profile).filter(Boolean);
      mapped.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setUsers(mapped);
    } catch (err) {
      console.error(err);
    }
  }, [card?.project_id]);

  // Fetch comments and subtasks
  useEffect(() => {
    if (card?.id) {
      fetchComments();
      fetchSubtasks();
      fetchUsers();
    }
  }, [card?.id, fetchComments, fetchSubtasks, fetchUsers]);

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
      status: card?.status || 'todo',
      priority: card?.priority || 'medium',
      story_points: card?.story_points ?? '',
      assignee_id: card?.assignee_id || '',
      start_date: toDateInput(card?.start_date),
      due_date: toDateInput(card?.due_date)
    });
  }, [
    card?.id,
    card?.title,
    card?.description,
    card?.status,
    card?.priority,
    card?.story_points,
    card?.assignee_id,
    card?.start_date,
    card?.due_date
  ]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/cards/${card.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/cards/${card.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/cards/${card.id}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/cards/${card.id}/subtasks/${subtaskId}`, {
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
    assignee_id: source.assignee_id || card?.reporter_id || profile?.id || null,
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
      case 'backlog': return 'bg-[#F4F5F7] text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0]';
      case 'todo': return 'bg-[#F4F5F7] text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0]';
      case 'in_progress': return 'bg-[#EAE6FF] text-[#403294] border-[#C0B6F2] hover:bg-[#DED9FB]';
      case 'in_review': return 'bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF] hover:bg-[#CCE0FF]';
      case 'done': return 'bg-[#E3FCEF] text-[#006644] border-[#ABF5D1] hover:bg-[#D3F9E9]';
      default: return 'bg-[#F4F5F7] text-[#42526E] border-[#DFE1E6]';
    }
  };

  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/projects/${card.project_id}?cardId=${card.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
    setShowMenu(false);
  };

  const handleDeleteCard = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete card');
      toast.success('Card deleted');
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete card');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#091E42]/60 p-4 md:p-10 backdrop-blur-[2px]" onClick={onClose}>
      <div className="relative max-h-[90vh] min-h-[500px] w-full max-w-6xl animate-fade-in flex flex-col overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Breadcrumb & Actions */}
        <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 bg-[#fdfdfd] rounded-t-lg">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)]">
            <span className="hover:text-[#0052CC] cursor-pointer">Projects</span>
            <span className="opacity-40">/</span>
            <span className="hover:text-[#0052CC] cursor-pointer">Workspace</span>
            <span className="opacity-40">/</span>
            <span className="font-mono text-[var(--text-primary)] font-bold tracking-tight">{card.prefix || card.custom_id}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="flex items-center justify-center p-2 rounded-[3px] text-[var(--text-secondary)] hover:bg-[#F4F5F7] transition-colors" title="Watch" onClick={() => toast('Watch feature coming soon', { icon: '👀' })}><Eye size={16} /></button>
            <div className="relative" ref={menuRef}>
              <button className="flex items-center justify-center p-2 rounded-[3px] text-[var(--text-secondary)] hover:bg-[#F4F5F7] transition-colors" onClick={() => setShowMenu(!showMenu)}><MoreHorizontal size={16} /></button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-[var(--border-subtle)] z-50">
                  <button className="w-full text-left px-4 py-2 hover:bg-[#F4F5F7] transition-colors flex items-center gap-2 text-sm text-[var(--text-secondary)] first:rounded-t-lg" onClick={handleCopyLink}>
                    <Copy size={14} /> Copy link
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-[#F4F5F7] transition-colors flex items-center gap-2 text-sm text-red-600 last:rounded-b-lg" onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}>
                    <Trash2 size={14} /> Delete card
                  </button>
                </div>
              )}
            </div>
            <button className="ml-2 flex items-center justify-center p-2 rounded-[3px] text-[var(--text-secondary)] hover:bg-[#F4F5F7] transition-colors" onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col lg:flex-row h-full">
          {/* Main Column */}
          <div className="flex-[7] min-w-0 p-6 md:p-8 overflow-y-auto">
            <textarea
              className="w-full resize-none overflow-hidden rounded-[3px] border-2 border-transparent bg-transparent px-2 py-1 text-2xl font-bold text-[var(--text-heading)] transition-all hover:bg-[#F4F5F7] focus:border-[#0052CC] focus:bg-white focus:outline-none"
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
                className="flex items-center gap-2 rounded-[3px] bg-[#091E42]/[0.04] px-3 py-1.5 text-sm font-semibold text-[#42526E] transition-colors hover:bg-[#091E42]/[0.08] active:bg-[#091E42]/[0.12]"
                onClick={() => toast('Attach feature coming soon', { icon: '📎' })}
              >
                <Paperclip size={14} /> Attach
              </button>
              <button 
                className="flex items-center gap-2 rounded-[3px] bg-[#091E42]/[0.04] px-3 py-1.5 text-sm font-semibold text-[#42526E] transition-colors hover:bg-[#091E42]/[0.08]"
                onClick={() => setActiveTab('subtasks')}
              >
                <CheckSquare size={14} /> Subtasks
              </button>
              <button 
                className="flex items-center gap-2 rounded-[3px] bg-[#091E42]/[0.04] px-3 py-1.5 text-sm font-semibold text-[#42526E] transition-colors hover:bg-[#091E42]/[0.08]"
                onClick={() => toast('Link issue coming soon', { icon: '🔗' })}
              >
                <Link size={14} /> Link issue
              </button>
              <button 
                className="flex items-center gap-2 rounded-[3px] bg-[#091E42]/[0.04] px-3 py-1.5 text-sm font-semibold text-[#42526E] transition-colors hover:bg-[#091E42]/[0.08]"
                onClick={() => toast('More options coming soon')}
              >
                <span>More</span> <ChevronDown size={14} />
              </button>
            </div>

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
    </div>
  );
}
