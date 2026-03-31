'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';

export default function CardSidebar({
  form,
  setForm,
  submitForm,
  getStatusStyle,
  card,
  profile,
  users,
  isSaving
}) {
  return (
    <div className="flex-[3] lg:min-w-[340px] border-l border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 rounded-br-lg flex flex-col max-h-full overflow-y-auto">
      <div className="mb-8">
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</label>
        <div className="relative group/status">
          <select
            className={`w-full cursor-pointer appearance-none rounded-[3px] border-2 pl-3 pr-9 py-2 text-[12px] font-bold uppercase transition-all focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 ${getStatusStyle(form.status)}`}
            value={form.status}
            onChange={(e) => {
              const nextForm = { ...form, status: e.target.value };
              setForm(nextForm);
              submitForm(nextForm);
            }}
          >
            <option value="backlog">BACKLOG</option>
            <option value="todo">TO DO</option>
            <option value="in_progress">IN PROGRESS</option>
            <option value="in_review">IN REVIEW</option>
            <option value="done">DONE</option>
          </select>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-1 rounded-lg border border-[var(--border-subtle)] bg-white p-2">
        <div className="flex items-center justify-between p-3">
          <h4 className="text-[13px] font-bold text-[var(--text-heading)]">Details</h4>
        </div>
        
        <div className="space-y-1">
          {/* Assignee Row */}
          <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[var(--bg-panel-hover)]">
            <div className="w-28 shrink-0 text-[13px] font-bold text-[var(--text-muted)]">Assignee</div>
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <UserAvatar user={card.assignee} size={24} className="shrink-0" />
              <select
                className="w-full bg-transparent py-0.5 text-[13px] font-medium text-[var(--text-primary)] transition-all focus:outline-none"
                value={form.assignee_id}
                onChange={(e) => {
                  const nextForm = { ...form, assignee_id: e.target.value };
                  setForm(nextForm);
                  submitForm(nextForm);
                }}
              >
                <option value="">Auto (Reporter)</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reporter Row */}
          <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[var(--bg-panel-hover)]">
            <div className="w-28 shrink-0 text-[13px] font-bold text-[var(--text-muted)]">Reporter</div>
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <UserAvatar user={profile} size={24} className="shrink-0" />
              <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">{profile?.full_name || 'Me'}</span>
            </div>
          </div>

          {/* Priority Row */}
          <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[var(--bg-panel-hover)]">
            <div className="w-28 shrink-0 text-[13px] font-bold text-[var(--text-muted)]">Priority</div>
            <div className="flex-1">
              <select
                className="w-full cursor-pointer bg-transparent py-0.5 text-[13px] font-medium text-[var(--text-primary)] transition-all focus:outline-none"
                value={form.priority}
                onChange={(e) => {
                  const nextForm = { ...form, priority: e.target.value };
                  setForm(nextForm);
                  submitForm(nextForm);
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
          <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[var(--bg-panel-hover)]">
            <div className="w-28 shrink-0 text-[13px] font-bold text-[var(--text-muted)]">Story Points</div>
            <div className="flex-1">
              <input
                type="text"
                className="w-full bg-transparent py-0.5 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                value={form.story_points}
                placeholder="None"
                onChange={(e) => setForm(p => ({ ...p, story_points: e.target.value }))}
                onBlur={() => submitForm(form)}
              />
            </div>
          </div>

          {/* Sprint Row */}
          <div className="group flex items-center rounded px-3 py-1.5 transition-colors hover:bg-[var(--bg-panel-hover)]">
            <div className="w-28 shrink-0 text-[13px] font-bold text-[var(--text-muted)]">Sprint</div>
            <div className="flex-1 overflow-hidden">
              <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                {card.sprint_id ? 'In Sprint' : 'None'}
              </span>
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
  );
}
