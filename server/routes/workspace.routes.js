const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/:projectId/docs', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase
      .from('docs')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch docs' });
  }
});

router.post('/:projectId/docs', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, content, space_id, folder_id } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const { data, error } = await supabase
      .from('docs')
      .insert({
        project_id: projectId,
        title,
        content: content || '',
        space_id: space_id || null,
        folder_id: folder_id || null,
        created_by: req.user.id,
        updated_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create doc' });
  }
});

router.put('/:projectId/docs/:docId', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId, docId } = req.params;
    const { title, content, space_id, folder_id } = req.body;

    const { data, error } = await supabase
      .from('docs')
      .update({
        title,
        content,
        space_id,
        folder_id,
        updated_by: req.user.id,
        updated_at: new Date()
      })
      .eq('id', docId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update doc' });
  }
});

router.get('/:projectId/spaces', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const [{ data: spaces, error: spaceErr }, { data: folders, error: folderErr }] = await Promise.all([
      supabase.from('spaces').select('*').order('created_at', { ascending: false }),
      supabase.from('folders').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    ]);

    if (spaceErr) throw spaceErr;
    if (folderErr) throw folderErr;

    res.json({ spaces: spaces || [], folders: folders || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch spaces and folders' });
  }
});

router.post('/:projectId/spaces', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { data, error } = await supabase
      .from('spaces')
      .insert({ name, description: description || null, created_by: req.user.id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create space' });
  }
});

router.post('/:projectId/folders', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, space_id } = req.body;
    if (!name || !space_id) return res.status(400).json({ error: 'name and space_id are required' });

    const { data, error } = await supabase
      .from('folders')
      .insert({ name, space_id, project_id: projectId, created_by: req.user.id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

router.get('/:projectId/views/list', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase
      .from('cards')
      .select('*, assignee:profiles!cards_assignee_id_fkey(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch list view data' });
  }
});

router.get('/:projectId/views/calendar', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase
      .from('cards')
      .select('id, custom_id, title, start_date, due_date, status, priority')
      .eq('project_id', projectId)
      .or('start_date.not.is.null,due_date.not.is.null')
      .order('due_date', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch calendar view data' });
  }
});

router.get('/:projectId/views/my-work', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('project_id', projectId)
      .eq('assignee_id', req.user.id)
      .neq('status', 'done')
      .order('priority', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch my work view data' });
  }
});

router.get('/:projectId/views/workload', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data: members, error: mErr } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url');

    if (mErr) throw mErr;

    const { data: cards, error: cErr } = await supabase
      .from('cards')
      .select('id, assignee_id, status, priority')
      .eq('project_id', projectId)
      .not('assignee_id', 'is', null);

    if (cErr) throw cErr;

    const grouped = new Map();
    (members || []).forEach((m) => grouped.set(m.id, { ...m, total: 0, active: 0, done: 0 }));

    (cards || []).forEach((card) => {
      const member = grouped.get(card.assignee_id);
      if (!member) return;
      member.total += 1;
      if (card.status === 'done') member.done += 1;
      else member.active += 1;
    });

    const result = Array.from(grouped.values()).filter((m) => m.total > 0);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workload view data' });
  }
});

router.get('/:projectId/notifications', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/:projectId/notifications', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { user_id, type, title, message, metadata } = req.body;

    if (!user_id || !type || !title) {
      return res.status(400).json({ error: 'user_id, type and title are required' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        project_id: projectId,
        user_id,
        type,
        title,
        message: message || null,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.patch('/:projectId/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const { id, projectId } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('project_id', projectId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;
