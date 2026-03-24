'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, MoreHorizontal, Paperclip, CheckSquare, Link, ChevronDown,
  AlignLeft, Activity, List, Clock, Send, Eye, Loader, Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/ui/UserAvatar';
import toast from 'react-hot-toast';

const toDateInput = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export default function CardDetail({ card, onClose, onSave, isSaving = false }) {
  const { profile } = useAuth();
  
  const [form, setForm] = useState({
    title: card?.title || '',
    description: card?.description || '',
    status: card?.status || 'todo',
    priority: card?.priority || 'medium',
    story_points: card?.story_points ?? '',
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

  // Fetch comments and subtasks
  useEffect(() => {
    if (card?.id) {
      fetchComments();
      fetchSubtasks();
    }
  }, [card?.id, fetchComments, fetchSubtasks]);

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

  const handleSubmit = async (event) => {
    event?.preventDefault();
    await onSave?.({
      ...form,
      story_points: form.story_points === '' ? null : Number(form.story_points),
      start_date: form.start_date || null,
      due_date: form.due_date || null
    });
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

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-[#091E42]/60 p-4 md:p-10 backdrop-blur-[2px]" onClick={onClose}>
      <div className="relative mb-10 min-h-[500px] w-full max-w-6xl animate-fade-in rounded-lg bg-white shadow-2xl ring-1 ring-black/5 flex flex-col" onClick={(e) => e.stopPropagation()}>
        
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
            <button className="flex items-center justify-center p-2 rounded-[3px] text-[var(--text-secondary)] hover:bg-[#F4F5F7] transition-colors" title="Watch"><Eye size={16} /></button>
            <button className="flex items-center justify-center p-2 rounded-[3px] text-[var(--text-secondary)] hover:bg-[#F4F5F7] transition-colors"><MoreHorizontal size={16} /></button>
            <button className="ml-2 flex items-center justify-center p-2 rounded-[3px] text-[var(--text-secondary)] hover:bg-[#F4F5F7] transition-colors" onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col lg:flex-row h-full">
          {/* Main Column (Scrollable ideally, but here flex) */}
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
              <button className="flex items-center gap-2 rounded-[3px] bg-[#091E42]/[0.04] px-3 py-1.5 text-sm font-semibold text-[#42526E] transition-colors hover:bg-[#091E42]/[0.08] active:bg-[#091E42]/[0.12]">
                <Paperclip size={14} /> Attach
              </button>
              <button className="flex items-center gap-2 rounded-[3px] bg-[#091E42]/[0.04] px-3 py-1.5 text-sm font-semibold text-[#42526E] transition-colors hover:bg-[#091E42]/[0.08]">
                <CheckSquare size={14} /> Subtasks
              </button>
              <button className="flex items-center gap-2 rounded-[3px] bg-[#091E42]/[0.04] px-3 py-1.5 text-sm font-semibold text-[#42526E] transition-colors hover:bg-[#091E42]/[0.08]">
                <Link size={14} /> Link issue
              </button>
              <button className="flex items-center gap-2 rounded-[3px] bg-[#091E42]/[0.04] px-3 py-1.5 text-sm font-semibold text-[#42526E] transition-colors hover:bg-[#091E42]/[0.08]">
                <span>More</span> <ChevronDown size={14} />
              </button>
            </div>

            {/* Description Section */}
            <section className="mb-10">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-heading)]">
                  <AlignLeft size={16} className="text-[#42526E]" /> Description
                </h3>
              </div>
              
              {isEditingDesc ? (
                <div className="rounded-[4px] border-2 border-[#0052CC] bg-white p-2 shadow-sm">
                  <textarea 
                    className="w-full min-h-[160px] resize-y border-none bg-transparent p-2 text-[14px] leading-relaxed text-[var(--text-primary)] focus:outline-none" 
                    placeholder="Add a more detailed description..."
                    value={form.description}
                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                    autoFocus
                  />
                  <div className="flex gap-2 p-2">
                    <button className="rounded-[3px] bg-[#0052CC] px-4 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-[#00388D]" onClick={handleDescSave} disabled={isSaving}>Save</button>
                    <button className="rounded-[3px] px-4 py-1.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[#F4F5F7]" onClick={() => setIsEditingDesc(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`group relative min-h-[60px] cursor-pointer rounded-[4px] p-3 transition-colors hover:bg-[#F4F5F7] ${!form.description ? 'text-[var(--text-muted)] italic font-medium' : 'text-[var(--text-primary)] leading-relaxed'}`}
                  onClick={() => setIsEditingDesc(true)}
                >
                  {form.description ? (
                    <p className="whitespace-pre-wrap text-[14px]">{form.description}</p>
                  ) : (
                    'Add a description...'
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded bg-white shadow-sm ring-1 ring-black/5 text-[#42526E]">
                      <span className="text-[10px] font-bold px-1 uppercase">Edit</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Activity Section */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-heading)]">
                  <Activity size={16} className="text-[#42526E]" /> Activity
                </h3>
              </div>
              
              <div className="mb-6 flex items-center gap-2 border-b border-[var(--border-subtle)]">
                <button 
                  className={`pb-2 text-sm font-bold capitalize transition-all border-b-2 ${activeTab === 'comments' ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`} 
                  onClick={() => setActiveTab('comments')}
                >
                  Comments {comments.length > 0 && `(${comments.length})`}
                </button>
                <button 
                  className={`pb-2 text-sm font-bold capitalize transition-all border-b-2 ${activeTab === 'subtasks' ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`} 
                  onClick={() => setActiveTab('subtasks')}
                >
                  Subtasks {subtasks.length > 0 && `(${completedSubtasks}/${subtasks.length})`}
                </button>
              </div>

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <UserAvatar user={profile} size={32} className="shrink-0" />
                    <div className="flex-1">
                      <div className={`relative rounded-[4px] border-2 transition-all p-0.5 ${newComment ? 'border-[#0052CC] bg-white ring-4 ring-[#0052CC]/10' : 'border-[#DFE1E6] bg-[#fdfdfd] hover:border-[#4C9AFF]'}`}>
                        <textarea 
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          className="w-full bg-transparent px-3 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none resize-none"
                          rows={newComment ? 3 : 1}
                        />
                        {newComment && (
                          <div className="flex gap-2 p-2 pt-0 border-t border-[#DFE1E6]">
                            <button 
                              onClick={handleAddComment}
                              className="rounded-[3px] bg-[#0052CC] px-4 py-1 text-xs font-bold text-white hover:bg-[#003D99]"
                            >
                              Save
                            </button>
                            <button 
                              className="rounded-[3px] px-4 py-1 text-xs font-bold text-[var(--text-secondary)] hover:bg-[#F4F5F7]" 
                              onClick={() => setNewComment('')}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isLoadingComments ? (
                    <div className="flex justify-center py-10">
                      <Loader className="animate-spin text-[#0052CC]" size={20} />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
                      <div className="mb-3 rounded-full bg-[#f4f5f7] p-4">
                        <List size={24} className="opacity-40" />
                      </div>
                      <p className="text-sm font-medium">No comments yet. Be the first!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3 rounded-lg p-4 bg-[#f8f9fa] hover:bg-[#f4f5f7] transition-colors">
                          <UserAvatar user={comment.user} size={32} className="shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <p className="font-semibold text-sm text-[var(--text-heading)]">{comment.user?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                            <p className="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subtasks Tab */}
              {activeTab === 'subtasks' && (
                <div className="space-y-4">
                  {subtasks.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">Progress</span>
                        <span className="text-sm font-bold text-blue-700">{completedSubtasks}/{subtasks.length}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${subtaskProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <CheckSquare size={18} className="text-[#42526E] shrink-0 mt-2" />
                    <div className="flex-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a subtask..."
                          value={newSubtaskTitle}
                          onChange={e => setNewSubtaskTitle(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && handleAddSubtask()}
                          className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                        />
                        <button
                          onClick={handleAddSubtask}
                          disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                          className="rounded-lg bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003D99] disabled:opacity-50 transition-colors"
                        >
                          {isAddingSubtask ? <Loader size={16} className="animate-spin" /> : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isLoadingSubtasks ? (
                    <div className="flex justify-center py-10">
                      <Loader className="animate-spin text-[#0052CC]" size={20} />
                    </div>
                  ) : subtasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
                      <div className="mb-3 rounded-full bg-[#f4f5f7] p-4">
                        <CheckSquare size={24} className="opacity-40" />
                      </div>
                      <p className="text-sm font-medium">No subtasks yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-4">
                      {subtasks.map(subtask => (
                        <div key={subtask.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f4f5f7] transition-colors group">
                          <input
                            type="checkbox"
                            checked={subtask.completed}
                            onChange={() => handleToggleSubtask(subtask.id, subtask.completed)}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                            {subtask.title}
                          </span>
                          <button
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="flex-[3] lg:min-w-[340px] border-l border-[var(--border-subtle)] bg-[#FAFBFC] p-6 rounded-br-lg flex flex-col max-h-full overflow-y-auto">
            <div className="mb-8">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Status</label>
              <div className="relative group/status">
                <select
                  className={`w-full cursor-pointer appearance-none rounded-[3px] border-2 px-3 py-2 text-[12px] font-bold uppercase transition-all focus:outline-none focus:ring-4 focus:ring-[#0052CC]/10 ${getStatusStyle(form.status)}`}
                  value={form.status}
                  onChange={(e) => {
                    setForm(p => ({ ...p, status: e.target.value }));
                    handleSubmit();
                  }}
                >
                  <option value="backlog">BACKLOG</option>
                  <option value="todo">TO DO</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="in_review">IN REVIEW</option>
                  <option value="done">DONE</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-current opacity-70" />
              </div>
            </div>

            <div className="mb-8 flex flex-col gap-1 rounded-lg border border-[var(--border-subtle)] bg-white p-2">
              <div className="flex items-center justify-between p-3">
                <h4 className="text-[13px] font-bold text-[var(--text-heading)]">Details</h4>
                <button className="text-[11px] font-bold text-[#0052CC] hover:underline">Toggle icons</button>
              </div>
              
              <div className="space-y-1">
                {/* Assignee Row */}
                <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[#F4F5F7]">
                  <div className="w-28 shrink-0 text-[13px] font-bold text-[#6B778C]">Assignee</div>
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <UserAvatar user={card.assignee} size={24} className="shrink-0" />
                    <span className="truncate text-[13px] font-medium text-[var(--text-primary)] hover:underline cursor-pointer">{card.assignee?.full_name || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Reporter Row */}
                <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[#F4F5F7]">
                  <div className="w-28 shrink-0 text-[13px] font-bold text-[#6B778C]">Reporter</div>
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <UserAvatar user={profile} size={24} className="shrink-0" />
                    <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">{profile?.full_name || 'Me'}</span>
                  </div>
                </div>

                {/* Priority Row */}
                <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[#F4F5F7]">
                  <div className="w-28 shrink-0 text-[13px] font-bold text-[#6B778C]">Priority</div>
                  <div className="flex-1">
                    <select
                      className="w-full cursor-pointer bg-transparent py-0.5 text-[13px] font-medium text-[var(--text-primary)] transition-all focus:outline-none"
                      value={form.priority}
                      onChange={(e) => {
                        setForm(p => ({ ...p, priority: e.target.value }));
                        handleSubmit();
                      }}
                    >
                      <option value="highest">Highest</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="lowest">Lowest</option>
                    </select>
                  </div>
                </div>

                {/* Story Points Row */}
                <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[#F4F5F7]">
                  <div className="w-28 shrink-0 text-[13px] font-bold text-[#6B778C]">Story Points</div>
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full bg-transparent py-0.5 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[#A5ADBA] focus:outline-none"
                      value={form.story_points}
                      placeholder="None"
                      onChange={(e) => setForm(p => ({ ...p, story_points: e.target.value }))}
                      onBlur={handleSubmit}
                    />
                  </div>
                </div>

                {/* Sprint Row */}
                <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[#F4F5F7]">
                  <div className="w-28 shrink-0 text-[13px] font-bold text-[#6B778C]">Sprint</div>
                  <div className="flex-1 overflow-hidden">
                    <span className="truncate text-[13px] font-bold text-[#0052CC] hover:underline cursor-pointer">Active Sprint (Alpha)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-[var(--border-subtle)]">
               <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-medium text-[var(--text-muted)]">
                   <span>Created</span>
                   <span className="text-[var(--text-secondary)]">{card.created_at ? new Date(card.created_at).toLocaleDateString() : 'Unknown'}</span>
                 </div>
                 <div className="flex justify-between text-[11px] font-medium text-[var(--text-muted)]">
                   <span>Updated</span>
                   <span className="text-[var(--text-secondary)]">{card.updated_at ? new Date(card.updated_at).toLocaleDateString() : 'Unknown'}</span>
                 </div>
               </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
