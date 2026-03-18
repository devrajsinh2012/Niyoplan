const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// GET /api/projects
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        profiles ( full_name, avatar_url ),
        cards ( count )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select(`*, profiles (full_name)`)
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw error;
    }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects
router.post('/', requireAuth, requireRole('admin', 'pm'), async (req, res) => {
  try {
    const { name, description, prefix } = req.body;
    
    if (!name || !prefix) {
      return res.status(400).json({ error: 'Name and prefix are required' });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        prefix: prefix.toUpperCase(),
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    // Handle unique constraint violation on prefix
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Project prefix must be unique' });
    }
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
