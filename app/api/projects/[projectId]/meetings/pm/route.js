import { verifyProjectAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await verifyProjectAccess(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }


  try {
    const { data, error: fetchError } = await supabaseAdmin
      .from('pm_meeting_reviews')
      .select('*, reviewer:profiles!pm_meeting_reviews_reviewer_id_fkey(full_name)')
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false });

    if (fetchError) throw fetchError;

    const meetingIds = (data || []).map((m) => m.id);
    let actionItems = [];

    if (meetingIds.length > 0) {
      const { data: actions, error: actionErr } = await supabaseAdmin
        .from('meeting_action_items')
        .select('*')
        .in('meeting_id', meetingIds)
        .order('created_at', { ascending: false });
      if (actionErr) throw actionErr;
      actionItems = actions || [];
    }

    const byMeeting = new Map();
    actionItems.forEach((item) => {
      if (!byMeeting.has(item.meeting_id)) byMeeting.set(item.meeting_id, []);
      byMeeting.get(item.meeting_id).push(item);
    });

    const result = (data || []).map((meeting) => ({
      ...meeting,
      action_items: byMeeting.get(meeting.id) || []
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch PM reviews' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await verifyProjectAccess(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }


  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { meeting_date, rag_status, summary, decisions, risks, action_items } = await request.json();

    if (!meeting_date) return NextResponse.json({ error: 'meeting_date is required' }, { status: 400 });

    const { data: review, error: insertError } = await supabaseAdmin
      .from('pm_meeting_reviews')
      .insert({
        project_id: projectId,
        reviewer_id: user.id,
        meeting_date,
        rag_status: rag_status || 'amber',
        summary: summary || null,
        decisions: decisions || null,
        risks: risks || null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (Array.isArray(action_items) && action_items.length > 0) {
      const rows = action_items
        .filter((item) => item.title)
        .map((item) => ({
          meeting_id: review.id,
          project_id: projectId,
          title: item.title,
          owner_id: item.owner_id || null,
          due_date: item.due_date || null,
          status: item.status || 'open'
        }));

      if (rows.length > 0) {
        const { error: actionErr } = await supabaseAdmin.from('meeting_action_items').insert(rows);
        if (actionErr) throw actionErr;
      }
    }

    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create PM review' }, { status: 500 });
  }
}
