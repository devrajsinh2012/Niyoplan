'use client';

import React from 'react';
import { Activity, List, Loader, Send, CheckSquare, Trash2 } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';

export default function CardActivity({
  activeTab,
  setActiveTab,
  comments,
  subtasks,
  profile,
  newComment,
  setNewComment,
  onAddComment,
  isLoadingComments,
  newSubtaskTitle,
  setNewSubtaskTitle,
  onAddSubtask,
  isAddingSubtask,
  isLoadingSubtasks,
  onToggleSubtask,
  onDeleteSubtask
}) {
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
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
                      onClick={onAddComment}
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
                  onKeyPress={e => e.key === 'Enter' && onAddSubtask()}
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                />
                <button
                  onClick={onAddSubtask}
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
                    onChange={() => onToggleSubtask(subtask.id, subtask.completed)}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                    {subtask.title}
                  </span>
                  <button
                    onClick={() => onDeleteSubtask(subtask.id)}
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
  );
}
