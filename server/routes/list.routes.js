const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// GET /api/projects/:projectId/lists
// Get all lists for a project
router.get('/:projectId/lists', requireAuth, async (req, res) => {
  try {
    const { data: lists, error } = await supabase
      .from('lists')
      .select('*')
      .eq('project_id', req.params.projectId)
      .order('rank', { ascending: true });

    if (error) throw error;
    res.json(lists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// POST /api/projects/:projectId/lists
// Create a new list
router.post('/:projectId/lists', requireAuth, requireRole('admin', 'pm'), async (req, res) => {
  try {
    const { name, rank } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // If rank is not provided, place at the end
    let newRank = rank;
    if (newRank === undefined) {
      const { data: existing } = await supabase
        .from('lists')
        .select('rank')
        .eq('project_id', req.params.projectId)
        .order('rank', { ascending: false })
        .limit(1);
      
      newRank = existing && existing.length > 0 ? existing[0].rank + 1000 : 1000;
    }

    const { data: list, error } = await supabase
      .from('lists')
      .insert({
        project_id: req.params.projectId,
        name,
        rank: newRank
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// PUT /api/projects/:projectId/lists/:id
// Update a list (rename, reorder)
router.put('/:projectId/lists/:id', requireAuth, async (req, res) => {
  try {
    const { name, rank } = req.body;
    
    const { data: list, error } = await supabase
      .from('lists')
      .update({ name, rank, updated_at: new Date() })
      .eq('id', req.params.id)
      .eq('project_id', req.params.projectId)
      .select()
      .single();

    if (error) throw error;
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// DELETE /api/projects/:projectId/lists/:id
router.delete('/:projectId/lists/:id', requireAuth, requireRole('admin', 'pm'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', req.params.id)
      .eq('project_id', req.params.projectId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

module.exports = router;
