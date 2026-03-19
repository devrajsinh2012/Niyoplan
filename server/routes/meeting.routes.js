const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/:projectId/meetings/pm', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase
      .from('pm_meeting_reviews')
      .select('*, reviewer:profiles!pm_meeting_reviews_reviewer_id_fkey(full_name)')
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false });

    if (error) throw error;

    const meetingIds = (data || []).map((m) => m.id);
    let actionItems = [];

    if (meetingIds.length > 0) {
      const { data: actions, error: actionErr } = await supabase
        .from('meeting_action_items')
        .select('*')
        .in('meeting_id', meetingIds)
        .order('created_at', { ascending: false });
      if (actionErr) throw actionErr;
      actionItems = actions || [];
    }

    const byMeeting = new Map();
    actionItems.forEach((item) => {
      if (!byMeeting.has(item.meeting_id)) byMeeting.set(item.meeting_id, []);
      byMeeting.get(item.meeting_id).push(item);
    });

    res.json((data || []).map((meeting) => ({ ...meeting, action_items: byMeeting.get(meeting.id) || [] })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch PM reviews' });
  }
});

router.post('/:projectId/meetings/pm', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { meeting_date, rag_status, summary, decisions, risks, action_items } = req.body;

    if (!meeting_date) return res.status(400).json({ error: 'meeting_date is required' });

    const { data: review, error } = await supabase
      .from('pm_meeting_reviews')
      .insert({
        project_id: projectId,
        reviewer_id: req.user.id,
        meeting_date,
        rag_status: rag_status || 'amber',
        summary: summary || null,
        decisions: decisions || null,
        risks: risks || null
      })
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(action_items) && action_items.length > 0) {
      const rows = action_items
        .filter((item) => item.title)
        .map((item) => ({
          meeting_id: review.id,
          project_id: projectId,
          title: item.title,
          owner_id: item.owner_id || null,
          due_date: item.due_date || null,
          status: item.status || 'open'
        }));

      if (rows.length > 0) {
        const { error: actionErr } = await supabase.from('meeting_action_items').insert(rows);
        if (actionErr) throw actionErr;
      }
    }

    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create PM review' });
  }
});

router.get('/:projectId/meetings/hr', requireAuth, requireRole('admin', 'pm'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase
      .from('hr_reviews')
      .select('*, reviewer:profiles!hr_reviews_reviewer_id_fkey(full_name)')
      .eq('project_id', projectId)
      .order('review_date', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch HR reviews' });
  }
});

router.post('/:projectId/meetings/hr', requireAuth, requireRole('admin', 'pm'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { review_date, employee_notes, manager_notes, action_plan } = req.body;

    if (!review_date) return res.status(400).json({ error: 'review_date is required' });

    const { data, error } = await supabase
      .from('hr_reviews')
      .insert({
        project_id: projectId,
        reviewer_id: req.user.id,
        review_date,
        employee_notes: employee_notes || null,
        manager_notes: manager_notes || null,
        action_plan: action_plan || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create HR review' });
  }
});

router.get('/:projectId/meetings/calendar', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { from, to } = req.query;

    let pmQuery = supabase
      .from('pm_meeting_reviews')
      .select('id, meeting_date, rag_status, summary')
      .eq('project_id', projectId);

    let hrQuery = supabase
      .from('hr_reviews')
      .select('id, review_date, manager_notes')
      .eq('project_id', projectId);

    if (from) {
      pmQuery = pmQuery.gte('meeting_date', from);
      hrQuery = hrQuery.gte('review_date', from);
    }
    if (to) {
      pmQuery = pmQuery.lte('meeting_date', to);
      hrQuery = hrQuery.lte('review_date', to);
    }

    const [{ data: pmRows, error: pmErr }, { data: hrRows, error: hrErr }] = await Promise.all([pmQuery, hrQuery]);
    if (pmErr) throw pmErr;
    if (hrErr) throw hrErr;

    const calendar = [
      ...(pmRows || []).map((row) => ({
        id: row.id,
        type: 'pm_review',
        date: row.meeting_date,
        title: `PM Review (${row.rag_status?.toUpperCase() || 'N/A'})`,
        details: row.summary || ''
      })),
      ...(hrRows || []).map((row) => ({
        id: row.id,
        type: 'hr_review',
        date: row.review_date,
        title: 'HR Review',
        details: row.manager_notes || ''
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(calendar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch meeting calendar' });
  }
});

router.post('/:projectId/meetings/action-items/:actionItemId/convert-to-card', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId, actionItemId } = req.params;

    const { data: item, error: itemErr } = await supabase
      .from('meeting_action_items')
      .select('*')
      .eq('id', actionItemId)
      .eq('project_id', projectId)
      .single();

    if (itemErr) {
      if (itemErr.code === 'PGRST116') return res.status(404).json({ error: 'Action item not found' });
      throw itemErr;
    }

    if (item.linked_card_id) {
      return res.status(400).json({ error: 'Action item is already linked to a card' });
    }

    const { data: lists, error: listErr } = await supabase
      .from('lists')
      .select('id, name, rank')
      .eq('project_id', projectId)
      .order('rank', { ascending: true });

    if (listErr) throw listErr;

    const fallbackList = (lists || []).find((list) => {
      const normalized = (list.name || '').trim().toLowerCase();
      return normalized === 'to do' || normalized === 'todo' || normalized === 'backlog';
    }) || (lists || [])[0] || null;

    const nowIso = new Date().toISOString();

    const { data: card, error: cardErr } = await supabase
      .from('cards')
      .insert({
        project_id: projectId,
        title: item.title,
        description: `Created from meeting action item (${item.id}).`,
        issue_type: 'task',
        priority: 'medium',
        status: 'todo',
        assignee_id: item.owner_id || null,
        reporter_id: req.user.id,
        due_date: item.due_date || null,
        start_date: nowIso,
        list_id: fallbackList?.id || null,
        rank: Date.now()
      })
      .select()
      .single();

    if (cardErr) throw cardErr;

    const { error: updateErr } = await supabase
      .from('meeting_action_items')
      .update({ linked_card_id: card.id, status: 'in_progress' })
      .eq('id', actionItemId);

    if (updateErr) throw updateErr;

    await supabase.from('activity_log').insert({
      card_id: card.id,
      user_id: req.user.id,
      action: 'created_from_meeting_action',
      details: { action_item_id: actionItemId }
    });

    res.json({ card, action_item_id: actionItemId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to convert action item to card' });
  }
});

module.exports = router;
