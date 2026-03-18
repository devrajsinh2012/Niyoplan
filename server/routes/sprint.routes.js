const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// GET /api/projects/:projectId/sprints
router.get('/:projectId/sprints', requireAuth, async (req, res) => {
  try {
    const { data: sprints, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', req.params.projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(sprints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sprints' });
  }
});

// POST /api/projects/:projectId/sprints
router.post('/:projectId/sprints', requireAuth, requireRole('admin', 'pm'), async (req, res) => {
  try {
    const { name, start_date, end_date, goal, status } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data: sprint, error } = await supabase
      .from('sprints')
      .insert({
        project_id: req.params.projectId,
        name,
        start_date: start_date || null,
        end_date: end_date || null,
        goal: goal || null,
        status: status || 'planning'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(sprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create sprint' });
  }
});

// PUT /api/projects/:projectId/sprints/:id
router.put('/:projectId/sprints/:id', requireAuth, requireRole('admin', 'pm'), async (req, res) => {
  try {
    const { name, start_date, end_date, goal, status } = req.body;

    const { data: sprint, error } = await supabase
      .from('sprints')
      .update({
        name,
        start_date,
        end_date,
        goal,
        status,
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .eq('project_id', req.params.projectId)
      .select()
      .single();

    if (error) throw error;
    res.json(sprint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update sprint' });
  }
});

// DELETE /api/projects/:projectId/sprints/:id
router.delete('/:projectId/sprints/:id', requireAuth, requireRole('admin', 'pm'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('sprints')
      .delete()
      .eq('id', req.params.id)
      .eq('project_id', req.params.projectId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete sprint' });
  }
});

module.exports = router;
