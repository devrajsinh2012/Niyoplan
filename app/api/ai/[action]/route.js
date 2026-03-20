import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callGroq } from '@/lib/ai';

export async function POST(request, { params }) {
  const { action } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    switch (action) {
      case 'generate-description': {
        const { title, context } = body;
        if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
        const content = await callGroq({
          systemPrompt: 'You write concise and actionable engineering task descriptions.',
          userPrompt: `Generate a detailed ticket description for title: ${title}\n\nContext: ${context || 'No additional context'}.\n\nReturn markdown bullet points with acceptance criteria.`
        });
        return NextResponse.json({ description: content });
      }

      case 'improve-description': {
        const { description } = body;
        if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 });
        const content = await callGroq({
          systemPrompt: 'You improve engineering descriptions by making them clearer and testable.',
          userPrompt: `Improve this ticket description while preserving intent:\n\n${description}\n\nReturn improved markdown.`
        });
        return NextResponse.json({ description: content });
      }

      case 'suggest-priority': {
        const { title, description } = body;
        if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
        const content = await callGroq({
          systemPrompt: 'You are a triage assistant. Choose only one priority: urgent, high, medium, or low.',
          userPrompt: `Given title and description, suggest priority and one-line reason.\nTitle: ${title}\nDescription: ${description || ''}\n\nReturn JSON with keys priority and reason.`
        });
        return NextResponse.json({ suggestion: content });
      }

      case 'sprint-summary': {
        const { sprint, cards } = body;
        if (!sprint) return NextResponse.json({ error: 'sprint is required' }, { status: 400 });
        const content = await callGroq({
          systemPrompt: 'You summarize sprint progress for PMs with risks and next actions.',
          userPrompt: `Summarize sprint status:\nSprint: ${JSON.stringify(sprint)}\nCards: ${JSON.stringify(cards || [])}\n\nOutput sections: Progress, Risks, Next Steps.`
        });
        return NextResponse.json({ summary: content });
      }

      case 'meeting-summary': {
        const { meeting } = body;
        if (!meeting) return NextResponse.json({ error: 'meeting is required' }, { status: 400 });
        const content = await callGroq({
          systemPrompt: 'You summarize project meetings with clear decisions and action items.',
          userPrompt: `Summarize this meeting data and propose clear action items:\n${JSON.stringify(meeting)}\n\nOutput sections: Highlights, Decisions, Action Items.`
        });
        return NextResponse.json({ summary: content });
      }

      case 'risk-helper': {
        const { risk } = body;
        if (!risk) return NextResponse.json({ error: 'risk is required' }, { status: 400 });
        const content = await callGroq({
          systemPrompt: 'You help PMs rewrite risks with impact, likelihood, and mitigation.',
          userPrompt: `Improve this risk statement and add mitigation plan:\n${risk}\n\nOutput concise markdown with Impact, Likelihood, Mitigation.`
        });
        return NextResponse.json({ result: content });
      }

      case 'goal-narrative': {
        const { goal, keyResults } = body;
        if (!goal) return NextResponse.json({ error: 'goal is required' }, { status: 400 });
        const content = await callGroq({
          systemPrompt: 'You write concise strategy narratives for OKRs.',
          userPrompt: `Write a goal narrative for stakeholders:\nGoal: ${JSON.stringify(goal)}\nKey Results: ${JSON.stringify(keyResults || [])}\n\nOutput in 1 short paragraph and 3 bullet points.`
        });
        return NextResponse.json({ narrative: content });
      }

      case 'dsm-summary': {
        const { entries } = body;
        if (!Array.isArray(entries) || entries.length === 0) {
          return NextResponse.json({ error: 'Entries array is required' }, { status: 400 });
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
        return NextResponse.json({ summary });
      }

      default:
        return NextResponse.json({ error: 'Invalid AI action' }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'AI processing failed' }, { status: 500 });
  }
}
