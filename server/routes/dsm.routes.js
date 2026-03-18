const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// GET /api/projects/:projectId/dsm
// List DSM entries for a project with optional search by text fields.
router.get('/:projectId/dsm', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const q = (req.query.q || '').trim().toLowerCase();

    const { data: entries, error } = await supabase
      .from('dsm_entries')
      .select(`
        *,
        user:profiles!dsm_entries_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    if (!q) {
      return res.json(entries);
    }

    const filtered = entries.filter((entry) => {
      return (
        entry.yesterday_text?.toLowerCase().includes(q) ||
        entry.today_text?.toLowerCase().includes(q) ||
        entry.blockers_text?.toLowerCase().includes(q) ||
        entry.user?.full_name?.toLowerCase().includes(q)
      );
    });

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch DSM entries' });
  }
});

// GET /api/projects/:projectId/dsm/latest
// Return latest entry per user for team status grid.
router.get('/:projectId/dsm/latest', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data: entries, error } = await supabase
      .from('dsm_entries')
      .select(`
        *,
        user:profiles!dsm_entries_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const latestByUser = new Map();
    for (const entry of entries) {
      if (!latestByUser.has(entry.user_id)) {
        latestByUser.set(entry.user_id, entry);
      }
    }

    res.json(Array.from(latestByUser.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch latest DSM entries' });
  }
});

// POST /api/projects/:projectId/dsm
// Create today's DSM entry.
router.post('/:projectId/dsm', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { yesterday_text, today_text, blockers_text, mood_rating } = req.body;

    if (!yesterday_text || !today_text) {
      return res.status(400).json({ error: 'Yesterday and Today fields are required' });
    }

    const { data: entry, error } = await supabase
      .from('dsm_entries')
      .insert({
        project_id: projectId,
        user_id: req.user.id,
        yesterday_text,
        today_text,
        blockers_text: blockers_text || null,
        mood_rating: mood_rating || null
      })
      .select(`
        *,
        user:profiles!dsm_entries_user_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create DSM entry' });
  }
});

module.exports = router;
