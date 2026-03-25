import { verifyProjectAccess } from '@/lib/access';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }
  const access = await verifyProjectAccess(projectId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }


  try {
    let pmQuery = supabaseAdmin
      .from('pm_meeting_reviews')
      .select('id, meeting_date, rag_status, summary')
      .eq('project_id', projectId);

    let hrQuery = supabaseAdmin
      .from('hr_reviews')
      .select('id, review_date, manager_notes')
      .eq('project_id', projectId);

    if (from) {
      pmQuery = pmQuery.gte('meeting_date', from);
      hrQuery = hrQuery.gte('review_date', from);
    }
    if (to) {
      pmQuery = pmQuery.lte('meeting_date', to);
      hrQuery = hrQuery.lte('review_date', to);
    }

    const [{ data: pmRows, error: pmErr }, { data: hrRows, error: hrErr }] = await Promise.all([pmQuery, hrQuery]);
    if (pmErr) throw pmErr;
    if (hrErr) throw hrErr;

    const calendar = [
      ...(pmRows || []).map((row) => ({
        id: row.id,
        type: 'pm_review',
        date: row.meeting_date,
        title: `PM Review (${row.rag_status?.toUpperCase() || 'N/A'})`,
        details: row.summary || ''
      })),
      ...(hrRows || []).map((row) => ({
        id: row.id,
        type: 'hr_review',
        date: row.review_date,
        title: 'HR Review',
        details: row.manager_notes || ''
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return NextResponse.json(calendar);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch meeting calendar' }, { status: 500 });
  }
}
