const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

async function callGroq({ systemPrompt, userPrompt, temperature = 0.3 }) {
  const apiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const groqBaseUrl = process.env.GROQ_API_BASE_URL || 'https://api.groq.com/openai/v1';

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server');
  }

  const groqResponse = await fetch(`${groqBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: groqModel,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    throw new Error(`Groq request failed: ${errorText}`);
  }

  const data = await groqResponse.json();
  return data?.choices?.[0]?.message?.content || '';
}

router.post('/generate-description', requireAuth, async (req, res) => {
  try {
    const { title, context } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const content = await callGroq({
      systemPrompt: 'You write concise and actionable engineering task descriptions.',
      userPrompt: `Generate a detailed ticket description for title: ${title}\n\nContext: ${context || 'No additional context'}.\n\nReturn markdown bullet points with acceptance criteria.`
    });

    res.json({ description: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate description' });
  }
});

router.post('/improve-description', requireAuth, async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    const content = await callGroq({
      systemPrompt: 'You improve engineering descriptions by making them clearer and testable.',
      userPrompt: `Improve this ticket description while preserving intent:\n\n${description}\n\nReturn improved markdown.`
    });

    res.json({ description: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to improve description' });
  }
});

router.post('/suggest-priority', requireAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const content = await callGroq({
      systemPrompt: 'You are a triage assistant. Choose only one priority: urgent, high, medium, or low.',
      userPrompt: `Given title and description, suggest priority and one-line reason.\nTitle: ${title}\nDescription: ${description || ''}\n\nReturn JSON with keys priority and reason.`
    });

    res.json({ suggestion: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to suggest priority' });
  }
});

router.post('/sprint-summary', requireAuth, async (req, res) => {
  try {
    const { sprint, cards } = req.body;
    if (!sprint) return res.status(400).json({ error: 'sprint is required' });

    const content = await callGroq({
      systemPrompt: 'You summarize sprint progress for PMs with risks and next actions.',
      userPrompt: `Summarize sprint status:\nSprint: ${JSON.stringify(sprint)}\nCards: ${JSON.stringify(cards || [])}\n\nOutput sections: Progress, Risks, Next Steps.`
    });

    res.json({ summary: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to summarize sprint' });
  }
});

router.post('/meeting-summary', requireAuth, async (req, res) => {
  try {
    const { meeting } = req.body;
    if (!meeting) return res.status(400).json({ error: 'meeting is required' });

    const content = await callGroq({
      systemPrompt: 'You summarize project meetings with clear decisions and action items.',
      userPrompt: `Summarize this meeting data and propose clear action items:\n${JSON.stringify(meeting)}\n\nOutput sections: Highlights, Decisions, Action Items.`
    });

    res.json({ summary: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to summarize meeting' });
  }
});

router.post('/risk-helper', requireAuth, async (req, res) => {
  try {
    const { risk } = req.body;
    if (!risk) return res.status(400).json({ error: 'risk is required' });

    const content = await callGroq({
      systemPrompt: 'You help PMs rewrite risks with impact, likelihood, and mitigation.',
      userPrompt: `Improve this risk statement and add mitigation plan:\n${risk}\n\nOutput concise markdown with Impact, Likelihood, Mitigation.`
    });

    res.json({ result: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate risk helper output' });
  }
});

router.post('/goal-narrative', requireAuth, async (req, res) => {
  try {
    const { goal, keyResults } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal is required' });

    const content = await callGroq({
      systemPrompt: 'You write concise strategy narratives for OKRs.',
      userPrompt: `Write a goal narrative for stakeholders:\nGoal: ${JSON.stringify(goal)}\nKey Results: ${JSON.stringify(keyResults || [])}\n\nOutput in 1 short paragraph and 3 bullet points.`
    });

    res.json({ narrative: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate goal narrative' });
  }
});

router.post('/dsm-summary', requireAuth, async (req, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Entries array is required' });
    }

    const compactEntries = entries.slice(0, 20).map((entry) => ({
      name: entry.user?.full_name || 'Unknown',
      yesterday: entry.yesterday_text || '',
      today: entry.today_text || '',
      blockers: entry.blockers_text || '',
      mood: entry.mood_rating || 'n/a',
      submitted_at: entry.submitted_at
    }));

    const prompt = `Summarize this team's DSM updates into:\n1) Overall progress\n2) Blockers and risks\n3) Suggested actions for PM\n4) Team sentiment\n\nDSM Entries:\n${JSON.stringify(compactEntries, null, 2)}`;

    const summary = await callGroq({
      systemPrompt: 'You are an engineering manager assistant. Keep summaries practical and concise.',
      userPrompt: prompt
    });

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate DSM summary' });
  }
});

module.exports = router;
