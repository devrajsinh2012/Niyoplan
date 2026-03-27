'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { Plus, CheckSquare, Square, Clock, Trash2, ChevronDown, ChevronRight, Sun, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const STORAGE_KEY = (userId) => `niyoplan-today-${userId}`;

function PriorityBadge({ priority }) {
  const map = {
    high: 'bg-orange-50 text-orange-600 border border-orange-200',
    medium: 'bg-blue-50 text-blue-600 border border-blue-200',
    low: 'bg-slate-50 text-slate-500 border border-slate-200',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${map[priority] || map.medium}`}>
      {priority}
    </span>
  );
}

export default function TodayPage() {
  const { profile } = useAuth();
  const { activeOrganization } = useOrganization();
  const [todayItems, setTodayItems] = useState([]);
  const [projectCards, setProjectCards] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEstimate, setNewEstimate] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [showProjectIssues, setShowProjectIssues] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load today items from localStorage
  const loadItems = useCallback(() => {
    if (!profile?.id) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY(profile.id));
      const parsed = raw ? JSON.parse(raw) : [];
      // Reset done items from previous days
      const today = new Date().toDateString();
      const filtered = parsed.filter(item => !item.doneAt || item.doneAt === today);
      setTodayItems(filtered);
    } catch {
      setTodayItems([]);
    }
  }, [profile?.id]);

  const saveItems = useCallback((items) => {
    if (!profile?.id) return;
    localStorage.setItem(STORAGE_KEY(profile.id), JSON.stringify(items));
  }, [profile?.id]);

  // Fetch real cards assigned to user across all projects in active org
  const fetchProjectCards = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('id, title, custom_id, status, priority, project:projects(id, name, prefix)')
        .eq('assignee_id', profile.id)
        .not('status', 'eq', 'done')
        .order('priority', { ascending: false })
        .limit(20);

      if (!error) setProjectCards(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadItems();
    fetchProjectCards();
  }, [loadItems, fetchProjectCards]);

  const addItem = () => {
    if (!newTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    const item = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      estimateMins: Number(newEstimate) || 0,
      priority: newPriority,
      done: false,
      doneAt: null,
      type: 'custom',
      checklist: [],
    };
    const updated = [item, ...todayItems];
    setTodayItems(updated);
    saveItems(updated);
    setNewTitle('');
    setNewEstimate('');
    setNewPriority('medium');
    setShowAddForm(false);
    toast.success('Added to Today');
  };

  const addFromCard = (card) => {
    const already = todayItems.some(i => i.id === card.id);
    if (already) { toast('Already in Today'); return; }
    const item = {
      id: card.id,
      title: `${card.custom_id}: ${card.title}`,
      estimateMins: 0,
      priority: card.priority || 'medium',
      done: false,
      doneAt: null,
      type: 'card',
      cardId: card.id,
      checklist: [],
    };
    const updated = [item, ...todayItems];
    setTodayItems(updated);
    saveItems(updated);
    toast.success('Added to Today');
  };

  const toggleDone = (id) => {
    const today = new Date().toDateString();
    const updated = todayItems.map(item =>
      item.id === id
        ? { ...item, done: !item.done, doneAt: !item.done ? today : null }
        : item
    );
    setTodayItems(updated);
    saveItems(updated);
  };

  const toggleChecklistItem = (itemId, checkId) => {
    const updated = todayItems.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        checklist: item.checklist.map(c =>
          c.id === checkId ? { ...c, done: !c.done } : c
        ),
      };
    });
    setTodayItems(updated);
    saveItems(updated);
  };

  const addChecklistItem = (itemId, text) => {
    if (!text.trim()) return;
    const updated = todayItems.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        checklist: [...(item.checklist || []), { id: Date.now().toString(), text, done: false }],
      };
    });
    setTodayItems(updated);
    saveItems(updated);
  };

  const removeItem = (id) => {
    const updated = todayItems.filter(i => i.id !== id);
    setTodayItems(updated);
    saveItems(updated);
  };

  const doneCount = todayItems.filter(i => i.done).length;
  const totalEstimate = todayItems.reduce((sum, i) => sum + (i.estimateMins || 0), 0);
  const pending = todayItems.filter(i => !i.done);
  const done = todayItems.filter(i => i.done);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Sun size={18} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-heading)]">Today</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--text-heading)]">{doneCount}/{todayItems.length}</div>
          <div className="text-xs text-[var(--text-muted)]">
            {totalEstimate > 0 ? `~${Math.round(totalEstimate / 60 * 10) / 10}h estimated` : 'tasks done'}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {todayItems.length > 0 && (
        <div className="mb-6 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${todayItems.length ? (doneCount / todayItems.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Add item button */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
        >
          <Plus size={16} />
          Add Task
        </button>
        <button
          onClick={() => setShowProjectIssues(v => !v)}
          className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel-hover)]"
        >
          <Zap size={16} />
          Add from Issues
          {showProjectIssues ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
          <input
            type="text"
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
            placeholder="What do you want to accomplish today?"
          />
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[var(--text-muted)]" />
              <input
                type="number"
                value={newEstimate}
                onChange={e => setNewEstimate(e.target.value)}
                className="w-20 rounded-md border border-[var(--border-subtle)] bg-white px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                placeholder="mins"
                min="0"
              />
            </div>
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              className="rounded-md border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addItem}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-md border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project issues picker */}
      {showProjectIssues && (
        <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Your assigned issues
          </p>
          {isLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : projectCards.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No open issues assigned to you.</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {projectCards.map(card => (
                <div
                  key={card.id}
                  onClick={() => addFromCard(card)}
                  className="flex items-center gap-3 cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-[var(--bg-panel-hover)] transition-colors"
                >
                  <span className="font-mono text-xs text-[var(--accent-primary)] shrink-0">{card.custom_id}</span>
                  <span className="flex-1 truncate text-[var(--text-primary)]">{card.title}</span>
                  <PriorityBadge priority={card.priority} />
                  <Plus size={14} className="text-[var(--text-muted)] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Today's Tasks */}
      {todayItems.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Sun size={28} className="text-amber-400" />
          </div>
          <p className="text-[var(--text-muted)] text-sm">Your day is wide open. Add your first task!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending */}
          {pending.map(item => (
            <TodayItemCard
              key={item.id}
              item={item}
              onToggle={toggleDone}
              onRemove={removeItem}
              onAddChecklist={addChecklistItem}
              onToggleChecklist={toggleChecklistItem}
            />
          ))}
          {/* Completed */}
          {done.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-2">
                <CheckSquare size={12} /> Completed ({done.length})
              </p>
              <div className="space-y-1.5 opacity-60">
                {done.map(item => (
                  <TodayItemCard
                    key={item.id}
                    item={item}
                    onToggle={toggleDone}
                    onRemove={removeItem}
                    onAddChecklist={addChecklistItem}
                    onToggleChecklist={toggleChecklistItem}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodayItemCard({ item, onToggle, onRemove, onAddChecklist, onToggleChecklist }) {
  const [expanded, setExpanded] = useState(false);
  const [newCheckText, setNewCheckText] = useState('');

  const checkedCount = (item.checklist || []).filter(c => c.done).length;
  const totalCheck = (item.checklist || []).length;

  return (
    <div className={`rounded-lg border bg-[var(--bg-surface)] transition-all ${item.done ? 'border-green-200 bg-green-50/30' : 'border-[var(--border-subtle)]'}`}>
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => onToggle(item.id)} className="shrink-0 text-[var(--text-muted)] hover:text-green-500 transition-colors">
          {item.done ? <CheckSquare size={18} className="text-green-500" /> : <Square size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${item.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
            {item.title}
          </p>
          <div className="flex gap-2 mt-0.5 items-center">
            <PriorityBadge priority={item.priority} />
            {item.estimateMins > 0 && (
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <Clock size={10} /> {item.estimateMins}m
              </span>
            )}
            {totalCheck > 0 && (
              <span className="text-[10px] text-[var(--text-muted)]">{checkedCount}/{totalCheck} done</span>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <button onClick={() => onRemove(item.id)} className="shrink-0 text-[var(--text-muted)] hover:text-red-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] px-4 pb-3 pt-2 space-y-2">
          {(item.checklist || []).map(check => (
            <div key={check.id} className="flex items-center gap-2 cursor-pointer" onClick={() => onToggleChecklist(item.id, check.id)}>
              {check.done
                ? <CheckSquare size={14} className="text-green-500 shrink-0" />
                : <Square size={14} className="text-[var(--text-muted)] shrink-0" />}
              <span className={`text-xs ${check.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{check.text}</span>
            </div>
          ))}
          <input
            type="text"
            value={newCheckText}
            onChange={e => setNewCheckText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newCheckText.trim()) {
                onAddChecklist(item.id, newCheckText.trim());
                setNewCheckText('');
              }
            }}
            className="w-full rounded border border-[var(--border-subtle)] bg-white px-2 py-1 text-xs text-[var(--text-primary)] focus:border-blue-400 focus:outline-none"
            placeholder="Add checklist item (press Enter)"
          />
        </div>
      )}
    </div>
  );
}
