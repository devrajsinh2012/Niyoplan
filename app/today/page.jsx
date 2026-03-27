'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { Plus, CheckSquare, Square, Clock, Trash2, ChevronDown, ChevronRight, Sun, Zap, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [orgMembers, setOrgMembers] = useState([]);
  const [showProjectIssues, setShowProjectIssues] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch today items from backend
  const fetchTodayItems = useCallback(async () => {
    if (!profile?.id || !activeOrganization?.id) return;
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('user_id', profile.id)
        .eq('organization_id', activeOrganization.id)
        .or(`is_done.eq.false,done_at.eq.${today}`)
        .order('priority', { ascending: false });

      if (!error) setTodayItems(data || []);
      else console.error('Error fetching today items:', error);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, activeOrganization?.id]);

  // Fetch real cards assigned to user in THIS organization
  const fetchProjectCards = useCallback(async () => {
    if (!profile?.id || !activeOrganization?.id) return;
    try {
      const { data, error } = await supabase
        .from('cards')
        .select(`
          id, title, custom_id, status, priority, 
          projects!inner(id, name, prefix, organization_id)
        `)
        .eq('assignee_id', profile.id)
        .eq('projects.organization_id', activeOrganization.id)
        .not('status', 'eq', 'done')
        .order('priority', { ascending: false })
        .limit(20);

      if (!error) setProjectCards(data || []);
      else console.error('Error fetching project cards:', error);
    } catch (err) {
      console.error(err);
    }
  }, [profile?.id, activeOrganization?.id]);

  // Fetch organization members for assignment
  const fetchOrgMembers = useCallback(async () => {
    if (!activeOrganization?.id || !['admin', 'pm'].includes(profile?.role)) return;
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, profiles(full_name, avatar_url, role)')
        .eq('organization_id', activeOrganization.id)
        .eq('status', 'active');

      if (!error) setOrgMembers(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [activeOrganization?.id, profile?.role]);

  useEffect(() => {
    fetchTodayItems();
    fetchProjectCards();
    fetchOrgMembers();
    if (profile?.id) setSelectedAssignee(profile.id);
  }, [fetchTodayItems, fetchProjectCards, fetchOrgMembers, profile?.id]);

  const addItem = async () => {
    if (!newTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!activeOrganization?.id) return;

    try {
      const isSelf = selectedAssignee === profile.id;
      const { data, error } = await supabase
        .from('daily_tasks')
        .insert({
          user_id: selectedAssignee,
          creator_id: profile.id,
          organization_id: activeOrganization.id,
          title: newTitle.trim(),
          estimate_mins: Number(newEstimate) || 0,
          priority: newPriority,
          type: 'custom',
          is_done: false,
          checklist: [],
        })
        .select()
        .single();

      if (error) throw error;

      if (isSelf) {
        setTodayItems([data, ...todayItems]);
        toast.success('Added to Today');
      } else {
        const member = orgMembers.find(m => m.user_id === selectedAssignee);
        toast.success(`Assigned to ${member?.profiles?.full_name || 'user'}`);
      }

      setNewTitle('');
      setNewEstimate('');
      setNewPriority('medium');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add task');
    }
  };

  const addFromCard = async (card) => {
    const already = todayItems.some(i => i.card_id === card.id);
    if (already) { toast('Already in Today'); return; }

    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .insert({
          user_id: profile.id,
          creator_id: profile.id,
          organization_id: activeOrganization.id,
          title: `${card.custom_id}: ${card.title}`,
          priority: card.priority || 'medium',
          type: 'card',
          card_id: card.id,
          is_done: false,
          checklist: [],
        })
        .select()
        .single();

      if (error) throw error;
      setTodayItems([data, ...todayItems]);
      toast.success('Added from Issues');
    } catch (err) {
      console.error(err);
      toast.error('Failed to import card');
    }
  };

  const toggleDone = async (id, currentStatus) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('daily_tasks')
        .update({ 
          is_done: newStatus, 
          done_at: newStatus ? today : null 
        })
        .eq('id', id);

      if (error) throw error;
      setTodayItems(todayItems.map(item =>
        item.id === id ? { ...item, is_done: newStatus, done_at: newStatus ? today : null } : item
      ));
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    }
  };

  const removeItem = async (id) => {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTodayItems(todayItems.filter(i => i.id !== id));
      toast.success('Removed');
    } catch (err) {
      console.error(err);
      toast.error('Remove failed');
    }
  };

  const updateChecklist = async (itemId, updatedChecklist) => {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({ checklist: updatedChecklist })
        .eq('id', itemId);

      if (error) throw error;
      setTodayItems(todayItems.map(item =>
        item.id === itemId ? { ...item, checklist: updatedChecklist } : item
      ));
    } catch (err) {
      console.error(err);
      toast.error('Checklist sync failed');
    }
  };

  const toggleChecklistItem = (itemId, checkId) => {
    const item = todayItems.find(i => i.id === itemId);
    if (!item) return;
    const updated = item.checklist.map(c =>
      c.id === checkId ? { ...c, done: !c.done } : c
    );
    updateChecklist(itemId, updated);
  };

  const addChecklistItem = (itemId, text) => {
    if (!text.trim()) return;
    const item = todayItems.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...(item.checklist || []), { id: Date.now().toString(), text, done: false }];
    updateChecklist(itemId, updated);
  };

  const doneCount = todayItems.filter(i => i.is_done).length;
  const totalEstimate = todayItems.reduce((sum, i) => sum + (i.estimate_mins || 0), 0);
  const pending = todayItems.filter(i => !i.is_done);
  const done = todayItems.filter(i => i.is_done);

  const canAssign = ['admin', 'pm'].includes(profile?.role);

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
        <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3 shadow-sm">
          <input
            type="text"
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            className="w-full rounded-md border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
            placeholder="What needs to be done today?"
          />
          
          <div className="flex flex-wrap gap-3 items-center">
            {/* Estimate */}
            <div className="flex items-center gap-2 border border-[var(--border-subtle)] rounded-md px-2 py-1 bg-white">
              <Clock size={14} className="text-[var(--text-muted)]" />
              <input
                type="number"
                value={newEstimate}
                onChange={e => setNewEstimate(e.target.value)}
                className="w-16 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none"
                placeholder="mins"
                min="0"
              />
            </div>

            {/* Priority */}
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              className="rounded-md border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Assign To (Admin/PM only) */}
            {canAssign && orgMembers.length > 0 && (
              <div className="flex items-center gap-2 border border-[var(--border-subtle)] rounded-md px-3 py-1.5 bg-white">
                <UserPlus size={14} className="text-blue-500" />
                <select
                  value={selectedAssignee}
                  onChange={e => setSelectedAssignee(e.target.value)}
                  className="bg-transparent text-sm text-[var(--text-primary)] focus:outline-none max-w-[150px]"
                >
                  <option value={profile.id}>Assign to Me</option>
                  {orgMembers
                    .filter(m => m.user_id !== profile.id)
                    .map(member => (
                      <option key={member.user_id} value={member.user_id}>
                        Assign to {member.profiles?.full_name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={addItem}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Add to Today
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setSelectedAssignee(profile.id);
              }}
              className="rounded-md border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project issues picker */}
      {showProjectIssues && (
        <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={12} className="text-blue-500" />
            Your assigned issues ({activeOrganization?.name})
          </p>
          {isLoading ? (
            <p className="text-sm text-[var(--text-muted)] p-2">Loading issues...</p>
          ) : projectCards.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] p-2 bg-[var(--bg-panel-hover)] rounded italic">
              No open issues assigned to you in this organization.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {projectCards.map(card => (
                <div
                  key={card.id}
                  onClick={() => addFromCard(card)}
                  className="flex items-center gap-3 cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-[var(--bg-panel-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all group"
                >
                  <span className="font-mono text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                    {card.custom_id}
                  </span>
                  <span className="flex-1 truncate text-[var(--text-primary)] group-hover:text-blue-600">{card.title}</span>
                  <PriorityBadge priority={card.priority} />
                  <Plus size={14} className="text-[var(--text-muted)] group-hover:text-blue-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Today's Tasks */}
      {todayItems.length === 0 && !isLoading ? (
        <div className="py-20 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Sun size={28} className="text-amber-400" />
          </div>
          <p className="text-[var(--text-primary)] font-medium">Your day is set for success.</p>
          <p className="text-[var(--text-muted)] text-sm">Add a task or import from current issues to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending */}
          {pending.map(item => (
            <TodayItemCard
              key={item.id}
              item={item}
              onToggle={(id) => toggleDone(id, item.is_done)}
              onRemove={removeItem}
              onAddChecklist={addChecklistItem}
              onToggleChecklist={toggleChecklistItem}
            />
          ))}
          {/* Completed */}
          {done.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                <CheckSquare size={14} className="text-green-500" /> 
                Finished for Today ({done.length})
              </p>
              <div className="space-y-2 opacity-75">
                {done.map(item => (
                  <TodayItemCard
                    key={item.id}
                    item={item}
                    onToggle={(id) => toggleDone(id, item.is_done)}
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

  const checklist = item.checklist || [];
  const checkedCount = checklist.filter(c => c.done).length;
  const totalCheck = checklist.length;

  return (
    <div className={`rounded-xl border shadow-sm transition-all duration-300 overflow-hidden ${
      item.is_done 
        ? 'border-green-100 bg-green-50/20' 
        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:shadow-md hover:border-blue-200'
    }`}>
      <div className="flex items-center gap-4 p-4">
        <button 
          onClick={() => onToggle(item.id)} 
          className={`shrink-0 transition-all transform hover:scale-110 ${item.is_done ? 'text-green-500' : 'text-[var(--text-muted)] hover:text-green-500'}`}
        >
          {item.is_done ? <CheckSquare size={22} /> : <Square size={22} />}
        </button>
        
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-semibold transition-all ${item.is_done ? 'line-through text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'}`}>
            {item.title}
          </p>
          <div className="flex gap-2.5 mt-1.5 items-center">
            <PriorityBadge priority={item.priority} />
            {item.estimate_mins > 0 && (
              <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1 bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                <Clock size={11} /> {item.estimate_mins}m
              </span>
            )}
            {totalCheck > 0 && (
              <span className="text-[11px] font-medium text-[var(--text-muted)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                {checkedCount}/{totalCheck} subtasks
              </span>
            )}
            {item.type === 'card' && (
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-50 px-1.5 rounded border border-blue-100">
                PROJ TASK
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setExpanded(v => !v)} 
            className={`p-1.5 rounded-lg transition-colors ${expanded ? 'bg-blue-50 text-blue-600' : 'text-[var(--text-muted)] hover:bg-[var(--bg-panel-hover)]'}`}
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          <button 
            onClick={() => onRemove(item.id)} 
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-panel-hover)]/30 px-4 pb-4 pt-3 space-y-2.5 animate-slide-down">
          {checklist.map(check => (
            <div 
              key={check.id} 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={(e) => { e.stopPropagation(); onToggleChecklist(item.id, check.id); }}
            >
              <div className={`shrink-0 transition-colors ${check.done ? 'text-green-500' : 'text-[var(--text-muted)] group-hover:text-blue-500'}`}>
                {check.done ? <CheckSquare size={16} /> : <Square size={16} />}
              </div>
              <span className={`text-sm transition-all ${check.done ? 'line-through text-[var(--text-muted)] opacity-60' : 'text-[var(--text-primary)]'}`}>
                {check.text}
              </span>
            </div>
          ))}
          
          <div className="pt-1">
            <div className="relative">
              <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
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
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                placeholder="Add subtask and press Enter..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
