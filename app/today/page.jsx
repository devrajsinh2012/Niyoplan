'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { Plus, CheckSquare, Square, Clock, Trash2, ChevronDown, ChevronRight, ChevronLeft, Sun, Zap, UserPlus, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

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
  const hasShownAssignGuardToast = useRef(false);

  const todayDateStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(() => todayDateStr);
  const [historyDays, setHistoryDays] = useState([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  const organizationRole = (activeOrganization?.role || '').toLowerCase();
  const profileRole = (profile?.role || '').toLowerCase();
  const canAssign = ['admin', 'pm'].includes(organizationRole) || ['admin', 'pm'].includes(profileRole);
  const assignableMembers = orgMembers.filter(m => m.user_id !== profile?.id);

  // Fetch today items from backend
  const fetchTodayItems = useCallback(async () => {
    if (!profile?.id || !activeOrganization?.id || !selectedDate) return;
    setIsLoading(true);
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);

      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('user_id', profile.id)
        .eq('organization_id', activeOrganization.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('priority', { ascending: false });

      if (!error) setTodayItems(data || []);
      else console.error('Error fetching today items:', error);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, activeOrganization?.id, selectedDate]);

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
    if (!activeOrganization?.id || !canAssign) {
      setOrgMembers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, role, profiles(full_name, avatar_url)')
        .eq('organization_id', activeOrganization.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching organization members:', error);
        setOrgMembers([]);
        return;
      }

      setOrgMembers(data || []);
    } catch (err) {
      console.error('Error fetching organization members:', err);
      setOrgMembers([]);
    }
  }, [activeOrganization?.id, canAssign]);

  const fetchHistorySummary = useCallback(async () => {
    if (!profile?.id || !activeOrganization?.id) return;
    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('created_at, is_done')
        .eq('user_id', profile.id)
        .eq('organization_id', activeOrganization.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const summaryMap = {};
        data.forEach(task => {
          const localDateStr = getLocalDateString(new Date(task.created_at));
          if (!summaryMap[localDateStr]) {
            summaryMap[localDateStr] = { date: localDateStr, total: 0, completed: 0 };
          }
          summaryMap[localDateStr].total += 1;
          if (task.is_done) {
            summaryMap[localDateStr].completed += 1;
          }
        });
        const summaryArray = Object.values(summaryMap).sort((a, b) => b.date.localeCompare(a.date));
        setHistoryDays(summaryArray);
      } else if (error) {
        console.error('Error fetching history summary:', error);
      }
    } catch (err) {
      console.error(err);
    }
  }, [profile?.id, activeOrganization?.id]);

  useEffect(() => {
    fetchTodayItems();
    fetchProjectCards();
    fetchOrgMembers();
    fetchHistorySummary();
    if (profile?.id) setSelectedAssignee(profile.id);
  }, [fetchTodayItems, fetchProjectCards, fetchOrgMembers, fetchHistorySummary, profile?.id]);

  const toggleAddForm = () => {
    const nextOpen = !showAddForm;

    if (nextOpen && !canAssign && !hasShownAssignGuardToast.current) {
      toast('Only Admin/PM roles can assign tasks to others. You can still add tasks for yourself.');
      hasShownAssignGuardToast.current = true;
    }

    setShowAddForm(nextOpen);
  };

  const addItem = async () => {
    if (!newTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!activeOrganization?.id) return;

    try {
      const isSelf = selectedAssignee === profile.id;
      const insertPayload = {
        user_id: selectedAssignee,
        creator_id: profile.id,
        organization_id: activeOrganization.id,
        title: newTitle.trim(),
        estimate_mins: Number(newEstimate) || 0,
        priority: newPriority,
        type: 'custom',
        is_done: false,
        checklist: [],
      };

      if (selectedDate !== todayDateStr) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const customCreatedAt = new Date(year, month - 1, day, 12, 0, 0, 0);
        insertPayload.created_at = customCreatedAt.toISOString();
      }

      const { data, error } = await supabase
        .from('daily_tasks')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      if (isSelf) {
        setTodayItems([data, ...todayItems]);
        toast.success(selectedDate === todayDateStr ? 'Added to Today' : 'Added to selected day');
      } else {
        const member = orgMembers.find(m => m.user_id === selectedAssignee);
        toast.success(`Assigned to ${member?.profiles?.full_name || 'user'}`);
      }

      setNewTitle('');
      setNewEstimate('');
      setNewPriority('medium');
      setShowAddForm(false);
      fetchHistorySummary();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add task');
    }
  };

  const addFromCard = async (card) => {
    const already = todayItems.some(i => i.card_id === card.id);
    if (already) { toast('Already in Today'); return; }

    try {
      const insertPayload = {
        user_id: profile.id,
        creator_id: profile.id,
        organization_id: activeOrganization.id,
        title: `${card.custom_id}: ${card.title}`,
        priority: card.priority || 'medium',
        type: 'card',
        card_id: card.id,
        is_done: false,
        checklist: [],
      };

      if (selectedDate !== todayDateStr) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const customCreatedAt = new Date(year, month - 1, day, 12, 0, 0, 0);
        insertPayload.created_at = customCreatedAt.toISOString();
      }

      const { data, error } = await supabase
        .from('daily_tasks')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      setTodayItems([data, ...todayItems]);
      toast.success(selectedDate === todayDateStr ? 'Added from Issues' : 'Imported to selected day');
      fetchHistorySummary();
    } catch (err) {
      console.error(err);
      toast.error('Failed to import card');
    }
  };

  const toggleDone = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('daily_tasks')
        .update({ 
          is_done: newStatus, 
          done_at: newStatus ? selectedDate : null 
        })
        .eq('id', id);

      if (error) throw error;
      setTodayItems(todayItems.map(item =>
        item.id === id ? { ...item, is_done: newStatus, done_at: newStatus ? selectedDate : null } : item
      ));
      fetchHistorySummary();
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
      fetchHistorySummary();
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

  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    setSelectedDate(getLocalDateString(date));
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const nextDateStr = getLocalDateString(date);
    if (nextDateStr <= todayDateStr) {
      setSelectedDate(nextDateStr);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Sun size={18} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-heading)]">
              {selectedDate === todayDateStr ? 'Today' : 'Daily Tasks'}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-md hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {formatDisplayDate(selectedDate)}
            </span>
            <button
              onClick={handleNextDay}
              disabled={selectedDate === todayDateStr}
              className={`p-1 rounded-md hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] transition-colors ${selectedDate === todayDateStr ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>

            {selectedDate !== todayDateStr && (
              <button
                onClick={() => setSelectedDate(todayDateStr)}
                className="ml-2 text-xs font-bold text-blue-600 hover:underline"
              >
                Back to Today
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 self-start sm:self-auto">
          {/* History Toggle Button */}
          <button
            onClick={() => setShowHistoryPanel(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              showHistoryPanel
                ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]'
            }`}
          >
            <Clock size={14} />
            {showHistoryPanel ? 'Hide History' : 'View History'}
          </button>

          <div className="text-right">
            <div className="text-2xl font-bold text-[var(--text-heading)]">{doneCount}/{todayItems.length}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {totalEstimate > 0 ? `~${Math.round(totalEstimate / 60 * 10) / 10}h estimated` : 'tasks done'}
            </div>
          </div>
        </div>
      </div>

      {/* History Panel */}
      {showHistoryPanel && (
        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/20 p-5 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Clock size={13} />
              Task History (Select a date to view)
            </h3>
            <button
              onClick={() => setShowHistoryPanel(false)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Close
            </button>
          </div>
          {historyDays.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-4 bg-white/50 rounded-lg">
              No task history found yet. As you create tasks, they will be logged here.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {historyDays.map((day) => {
                const isSelected = day.date === selectedDate;
                const percent = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0;
                
                // Format date for the card
                const [y, m, d] = day.date.split('-').map(Number);
                const dayDate = new Date(y, m - 1, d);
                const shortDate = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50/50 shadow-sm ring-1 ring-blue-400'
                        : 'border-[var(--border-subtle)] bg-white hover:border-blue-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xs font-bold text-[var(--text-heading)]">
                        {day.date === todayDateStr ? 'Today' : shortDate}
                      </span>
                      <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        {weekday}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between w-full">
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {day.completed}/{day.total} done
                      </span>
                      <span className={`text-[10px] font-bold ${percent === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                        {percent}%
                      </span>
                    </div>

                    {/* Progress bar in history card */}
                    <div className="mt-1.5 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

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
          onClick={toggleAddForm}
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
            placeholder={selectedDate === todayDateStr ? "What needs to be done today?" : `What needed to be done on ${formatDisplayDate(selectedDate)}?`}
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
            {canAssign && (
              <div className="flex items-center gap-2 border border-[var(--border-subtle)] rounded-md px-3 py-1.5 bg-white">
                <UserPlus size={14} className="text-blue-500" />
                <select
                  value={selectedAssignee}
                  onChange={e => setSelectedAssignee(e.target.value)}
                  className="bg-transparent text-sm text-[var(--text-primary)] focus:outline-none max-w-[150px]"
                >
                  <option value={profile.id}>Assign to Me</option>
                  {assignableMembers.map(member => (
                      <option key={member.user_id} value={member.user_id}>
                        Assign to {member.profiles?.full_name}
                      </option>
                    ))}
                  {assignableMembers.length === 0 && (
                    <option value="" disabled>No other active members available</option>
                  )}
                </select>
                {assignableMembers.length === 0 && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    No active teammates available for assignment.
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={addItem}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              {selectedDate === todayDateStr ? 'Add to Today' : 'Add to Day'}
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
          <p className="text-[var(--text-primary)] font-medium">
            {selectedDate === todayDateStr ? 'Your day is set for success.' : 'No tasks recorded for this day.'}
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            {selectedDate === todayDateStr 
              ? 'Add a task or import from current issues to get started.' 
              : 'You can navigate to another day or add a task for this day.'}
          </p>
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
                {selectedDate === todayDateStr ? 'Finished for Today' : 'Finished on this Day'} ({done.length})
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
