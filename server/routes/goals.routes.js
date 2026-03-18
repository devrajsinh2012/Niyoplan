const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.get('/:projectId/goals', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*, owner:profiles!goals_owner_id_fkey(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const goalIds = (goals || []).map((g) => g.id);
    let keyResults = [];

    if (goalIds.length > 0) {
      const { data: rows, error: krErr } = await supabase
        .from('goal_key_results')
        .select('*')
        .in('goal_id', goalIds)
        .order('created_at', { ascending: true });
      if (krErr) throw krErr;
      keyResults = rows || [];
    }

    const byGoal = new Map();
    keyResults.forEach((kr) => {
      if (!byGoal.has(kr.goal_id)) byGoal.set(kr.goal_id, []);
      byGoal.get(kr.goal_id).push(kr);
    });

    const enriched = (goals || []).map((goal) => {
      const krs = byGoal.get(goal.id) || [];
      const progress = krs.length
        ? Math.round(
            (krs.reduce((acc, kr) => {
              const denom = Number(kr.target_value) - Number(kr.start_value) || 1;
              const ratio = (Number(kr.current_value) - Number(kr.start_value)) / denom;
              return acc + Math.max(0, Math.min(1, ratio));
            }, 0) /
              krs.length) *
              100
          )
        : 0;
      return { ...goal, key_results: krs, progress };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

router.post('/:projectId/goals', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, owner_id, target_date, status, key_results } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        project_id: projectId,
        title,
        description: description || null,
        owner_id: owner_id || req.user.id,
        target_date: target_date || null,
        status: status || 'active'
      })
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(key_results) && key_results.length > 0) {
      const krRows = key_results
        .filter((kr) => kr.title)
        .map((kr) => ({
          goal_id: goal.id,
          title: kr.title,
          start_value: kr.start_value ?? 0,
          current_value: kr.current_value ?? kr.start_value ?? 0,
          target_value: kr.target_value ?? 100,
          unit: kr.unit || 'points'
        }));

      if (krRows.length > 0) {
        const { error: krErr } = await supabase.from('goal_key_results').insert(krRows);
        if (krErr) throw krErr;
      }
    }

    res.status(201).json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

router.put('/:projectId/goals/:goalId', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { projectId, goalId } = req.params;
    const { title, description, owner_id, target_date, status } = req.body;

    const { data, error } = await supabase
      .from('goals')
      .update({
        title,
        description,
        owner_id,
        target_date,
        status,
        updated_at: new Date()
      })
      .eq('id', goalId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.post('/:projectId/goals/:goalId/key-results', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { goalId } = req.params;
    const { title, start_value, current_value, target_value, unit } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const { data, error } = await supabase
      .from('goal_key_results')
      .insert({
        goal_id: goalId,
        title,
        start_value: start_value ?? 0,
        current_value: current_value ?? start_value ?? 0,
        target_value: target_value ?? 100,
        unit: unit || 'points'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add key result' });
  }
});

router.put('/:projectId/goals/:goalId/key-results/:keyResultId', requireAuth, requireRole('admin', 'pm', 'member'), async (req, res) => {
  try {
    const { keyResultId } = req.params;
    const { title, start_value, current_value, target_value, unit } = req.body;

    const { data, error } = await supabase
      .from('goal_key_results')
      .update({
        title,
        start_value,
        current_value,
        target_value,
        unit,
        updated_at: new Date()
      })
      .eq('id', keyResultId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update key result' });
  }
});

module.exports = router;
