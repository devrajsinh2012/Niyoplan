import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { verifyProjectAccess } from '@/lib/access';

const DAY_MS = 24 * 60 * 60 * 1000;

const toIsoDay = (value) => new Date(value).toISOString().slice(0, 10);

const pointValue = (card, useCountFallback) => {
  if (useCountFallback) return 1;
  return Number(card.story_points) || 0;
};

export async function GET(request, { params }) {
  const { projectId, id } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await verifyProjectAccess(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  try {
    const { data: sprint, error: sprintError } = await supabaseAdmin
      .from('sprints')
      .select('*')
      .eq('id', id)
      .eq('project_id', projectId)
      .single();

    if (sprintError) {
      if (sprintError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
      }
      throw sprintError;
    }

    const { data: sprintCards, error: cardsError } = await supabaseAdmin
      .from('cards')
      .select('id, status, story_points, created_at, updated_at, due_date')
      .eq('project_id', projectId)
      .eq('sprint_id', id);

    if (cardsError) throw cardsError;

    const cards = sprintCards || [];
    const storyPointSum = cards.reduce((sum, card) => sum + (Number(card.story_points) || 0), 0);
    const useCountFallback = storyPointSum === 0;

    const plannedPoints = cards.reduce((sum, card) => sum + pointValue(card, useCountFallback), 0);
    const doneCards = cards.filter((card) => card.status === 'done');
    const completedPoints = doneCards.reduce((sum, card) => sum + pointValue(card, useCountFallback), 0);
    const remainingPoints = Math.max(plannedPoints - completedPoints, 0);

    const todoIssues = cards.filter((card) => card.status === 'todo' || card.status === 'backlog').length;
    const inProgressIssues = cards.filter((card) => card.status === 'in_progress' || card.status === 'in_review').length;

    const start = sprint.start_date ? new Date(sprint.start_date) : new Date(sprint.created_at || Date.now());
    const end = sprint.end_date ? new Date(sprint.end_date) : new Date(start.getTime() + (14 * DAY_MS));
    const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
    const safeEnd = Number.isNaN(end.getTime()) || end < safeStart ? new Date(safeStart.getTime() + (14 * DAY_MS)) : end;

    const daysTotal = Math.max(1, Math.floor((safeEnd.getTime() - safeStart.getTime()) / DAY_MS) + 1);
    const today = new Date();
    const daysElapsed = Math.min(daysTotal, Math.max(0, Math.floor((today.getTime() - safeStart.getTime()) / DAY_MS) + 1));

    const burndown = Array.from({ length: daysTotal }, (_, index) => {
      const currentDate = new Date(safeStart.getTime() + (index * DAY_MS));
      const isoDay = toIsoDay(currentDate);
      const completedTillDay = cards
        .filter((card) => card.status === 'done' && card.updated_at && new Date(card.updated_at) <= currentDate)
        .reduce((sum, card) => sum + pointValue(card, useCountFallback), 0);

      const actualRemaining = Math.max(plannedPoints - completedTillDay, 0);
      const idealRemaining = Math.max(plannedPoints - ((plannedPoints / Math.max(daysTotal - 1, 1)) * index), 0);

      return {
        date: isoDay,
        idealRemaining: Number(idealRemaining.toFixed(2)),
        actualRemaining: Number(actualRemaining.toFixed(2)),
      };
    });

    const { data: pastSprints, error: pastError } = await supabaseAdmin
      .from('sprints')
      .select('id, name, status, start_date, end_date, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (pastError) throw pastError;

    const sprintIds = (pastSprints || []).map((item) => item.id);
    const { data: trendCards, error: trendCardsError } = await supabaseAdmin
      .from('cards')
      .select('sprint_id, status, story_points')
      .eq('project_id', projectId)
      .in('sprint_id', sprintIds);

    if (trendCardsError) throw trendCardsError;

    const grouped = new Map();
    (trendCards || []).forEach((card) => {
      if (!grouped.has(card.sprint_id)) grouped.set(card.sprint_id, []);
      grouped.get(card.sprint_id).push(card);
    });

    const velocityTrend = (pastSprints || [])
      .slice()
      .reverse()
      .map((item) => {
        const sprintItems = grouped.get(item.id) || [];
        const sprintPointSum = sprintItems.reduce((sum, card) => sum + (Number(card.story_points) || 0), 0);
        const fallback = sprintPointSum === 0;
        const planned = sprintItems.reduce((sum, card) => sum + pointValue(card, fallback), 0);
        const completed = sprintItems
          .filter((card) => card.status === 'done')
          .reduce((sum, card) => sum + pointValue(card, fallback), 0);

        return {
          sprintId: item.id,
          name: item.name,
          plannedPoints: planned,
          completedPoints: completed,
          velocityPercent: planned > 0 ? Math.round((completed / planned) * 100) : 0,
        };
      });

    return NextResponse.json({
      sprint,
      summary: {
        totalIssues: cards.length,
        doneIssues: doneCards.length,
        todoIssues,
        inProgressIssues,
        plannedPoints,
        completedPoints,
        remainingPoints,
        completionPercent: plannedPoints > 0 ? Math.round((completedPoints / plannedPoints) * 100) : 0,
        velocityPoints: completedPoints,
        daysElapsed,
        daysTotal,
      },
      burndown,
      velocityTrend,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sprint metrics' }, { status: 500 });
  }
}
