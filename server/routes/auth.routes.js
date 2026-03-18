const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/auth/profile
// Get current user's profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// PUT /api/auth/profile
// Update current user's profile (name, avatar)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, avatar_url } = req.body;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ full_name, avatar_url, updated_at: new Date() })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

module.exports = router;
