const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // 1. Total Projects
    const { count: totalProjects, error: err1 } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    if (err1) throw err1;

    // 2. Total Cards (Assigned to user or total in workspace)
    // For MVP global dashboard, let's fetch total workspace stats
    const { count: totalCards, error: err2 } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true });
    if (err2) throw err2;

    // 3. Open vs Done Cards
    const { count: doneCards, error: err3 } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done');
    if (err3) throw err3;
    
    const openCards = totalCards - doneCards;

    // 4. Recent Activity
    const { data: activity, error: err4 } = await supabase
      .from('activity_log')
      .select(`
        *,
        user:profiles(full_name, avatar_url),
        card:cards(custom_id, title)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    if (err4) throw err4;

    res.json({
      metrics: {
        totalProjects,
        totalCards,
        openCards,
        doneCards
      },
      recentActivity: activity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
