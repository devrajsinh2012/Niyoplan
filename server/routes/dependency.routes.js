const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

// GET /api/projects/:projectId/dependencies
router.get('/:projectId/dependencies', requireAuth, async (req, res) => {
  const { projectId } = req.params;
  try {
    const { data: dependencies, error } = await supabase
      .from('card_dependencies')
      .select(`*`)
      .eq('project_id', projectId);

    if (error) throw error;
    res.json(dependencies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:projectId/dependencies
router.post('/:projectId/dependencies', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  const { projectId } = req.params;
  const { predecessor_id, successor_id } = req.body;

  try {
    const { data: dependency, error } = await supabase
      .from('card_dependencies')
      .insert([{ project_id: projectId, predecessor_id, successor_id }])
      .select()
      .single();

    if (error) {
      // Handle unique constraint violations gracefully
      if (error.code === '23505') return res.status(409).json({ error: 'Dependency already exists' });
      throw error;
    }
    
    res.status(201).json(dependency);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:projectId/dependencies/:id
router.delete('/:projectId/dependencies/:id', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  const { id, projectId } = req.params;

  try {
    const { error } = await supabase
      .from('card_dependencies')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
