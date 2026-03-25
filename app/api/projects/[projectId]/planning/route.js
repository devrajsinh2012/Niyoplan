import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

/**
 * Unified Planning API Endpoint
 * Serves schedule items (tasks + meetings) and dependencies for Gantt and Calendar views
 * 
 * Query Parameters:
 * - from: ISO8601 (e.g., 2026-03-01T00:00:00Z) [REQUIRED]
 * - to: ISO8601 (e.g., 2026-04-01T00:00:00Z) [REQUIRED]
 * - types: comma-separated (default: task,meeting,milestone)
 * - status: comma-separated (default: all)
 * - assignees: comma-separated UUIDs (default: all)
 * - sprints: comma-separated sprint IDs (default: all)
 * - include_archived: boolean (default: false)
 */

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { user, error: authErr } = await getAuthUser(request);
  
  if (authErr || !user) {
    return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const fromStr = url.searchParams.get('from');
    const toStr = url.searchParams.get('to');
    const typesStr = url.searchParams.get('types') || 'task,meeting,milestone';
    const statusStr = url.searchParams.get('status');
    const assigneesStr = url.searchParams.get('assignees');
    const sprintsStr = url.searchParams.get('sprints');
    const includeArchived = url.searchParams.get('include_archived') === 'true';

    if (!fromStr || !toStr) {
      return NextResponse.json(
        { error: 'Query parameters "from" and "to" (ISO8601 dates) are required' },
        { status: 400 }
      );
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO8601 (e.g., 2026-03-01T00:00:00Z)' },
        { status: 400 }
      );
    }

    // Parse filter arrays
    const types = typesStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const statuses = statusStr ? statusStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : null;
    const assigneeIds = assigneesStr ? assigneesStr.split(',').map(id => id.trim()).filter(Boolean) : null;
    const sprintIds = sprintsStr ? sprintsStr.split(',').map(id => id.trim()).filter(Boolean) : null;

    // Add padding to date range for dependency visualization
    const paddedFrom = new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000);
    const paddedTo = new Date(to.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch cards from database
    let cardsQuery = supabaseAdmin
      .from('cards')
      .select(`
        id, custom_id, title, description, 
        start_date, due_date, status, priority, 
        story_points, issue_type,
        progress_percent, actual_start, actual_end, is_critical_path,
        assignee_id, reporter_id, sprint_id, list_id,
        created_at, updated_at,
        assignee:assignee_id(id, full_name, avatar_url),
        reporter:reporter_id(id, full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .gte('start_date', paddedFrom.toISOString())
      .lte('start_date', paddedTo.toISOString());

    // Apply status filter
    if (statuses && statuses.length > 0) {
      cardsQuery = cardsQuery.in('status', statuses);
    }

    // Apply assignee filter
    if (assigneeIds && assigneeIds.length > 0) {
      cardsQuery = cardsQuery.in('assignee_id', assigneeIds);
    }

    // Apply sprint filter
    if (sprintIds && sprintIds.length > 0) {
      cardsQuery = cardsQuery.in('sprint_id', sprintIds);
    }

    // Apply archived filter
    if (!includeArchived) {
      cardsQuery = cardsQuery.eq('is_archived', false);
    }

    const { data: cards, error: cardsErr } = await cardsQuery;

    if (cardsErr) throw cardsErr;

    // Fetch dependencies
    const { data: dependencies, error: depsErr } = await supabaseAdmin
      .from('card_dependencies')
      .select('id, predecessor_id, successor_id, type, lead_or_lag_days, created_by, created_at')
      .eq('project_id', projectId);

    if (depsErr) throw depsErr;

    // Fetch meetings
    let meetingsQuery = supabaseAdmin
      .from('meetings')
      .select(`
        id, title, description,
        meeting_date, end_time, duration_minutes,
        organizer_id, status, meeting_type,
        created_at, updated_at,
        organizer:organizer_id(id, full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .gte('meeting_date', paddedFrom.toISOString())
      .lte('meeting_date', paddedTo.toISOString());

    const { data: meetingsData, error: meetingsErr } = await meetingsQuery;

    // If meetings table doesn't exist yet, gracefully handle
    let meetings = [];
    if (!meetingsErr && meetingsData) {
      meetings = meetingsData;
    }

    // Normalize cards to ScheduleItem interface
    const scheduleItems = [
      ...cards
        .filter(card => {
          // Fallback dates to created_at if missing
          const startDate = card.start_date || card.created_at;
          return startDate && new Date(startDate) >= from && new Date(startDate) <= to;
        })
        .map(card => ({
          id: card.id,
          type: 'task',
          title: card.title,
          description: card.description,
          start_date: card.start_date || card.created_at,
          end_date: card.due_date || card.start_date || card.created_at,
          is_all_day: false,
          status: card.status,
          priority: card.priority,
          assignee_id: card.assignee_id,
          assignee: card.assignee,
          sprint_id: card.sprint_id,
          list_id: card.list_id,
          story_points: card.story_points,
          issue_type: card.issue_type,
          custom_id: card.custom_id,
          project_id: projectId,
          reporter_id: card.reporter_id,
          reporter: card.reporter,
          progress_percent: card.progress_percent || 0,
          is_critical_path: card.is_critical_path || false,
          actual_start: card.actual_start,
          actual_end: card.actual_end,
          created_at: card.created_at,
          updated_at: card.updated_at,
        })),
      
      ...meetings.map(meeting => ({
        id: meeting.id,
        type: 'meeting',
        title: meeting.title,
        description: meeting.description,
        start_date: meeting.meeting_date,
        end_date: meeting.end_time || meeting.meeting_date,
        duration_minutes: meeting.duration_minutes,
        is_all_day: false,
        status: meeting.status,
        priority: 'medium',
        assignee_id: meeting.organizer_id,
        assignee: meeting.organizer,
        project_id: projectId,
        meeting_type: meeting.meeting_type,
        created_at: meeting.created_at,
        updated_at: meeting.updated_at,
      })),
    ];

    // Compute metrics
    const cardMetrics = {
      totalPlanned: cards.length,
      totalCompleted: cards.filter(c => c.status === 'done').length,
      avgVelocity: 0,
    };

    // Calculate velocity if we have sprint_ids filter
    if (sprintIds && sprintIds.length > 0) {
      const sprintCards = cards.filter(c => c.sprint_id && sprintIds.includes(c.sprint_id));
      const totalPoints = sprintCards.reduce((sum, c) => sum + (c.story_points || 0), 0);
      const completePoints = sprintCards
        .filter(c => c.status === 'done')
        .reduce((sum, c) => sum + (c.story_points || 0), 0);
      cardMetrics.avgVelocity = totalPoints > 0 ? (completePoints / totalPoints * 100).toFixed(1) : 0;
    }

    return NextResponse.json({
      items: scheduleItems,
      dependencies: dependencies || [],
      metrics: cardMetrics,
      range: { from, to },
    });
  } catch (err) {
    console.error('Planning API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch planning data' },
      { status: 500 }
    );
  }
}
