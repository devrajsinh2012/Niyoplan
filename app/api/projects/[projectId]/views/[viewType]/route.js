import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const { projectId, viewType } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    let data;
    let fetchError;

    switch (viewType) {
      case 'list': {
        const { data: listData, error: err } = await supabaseAdmin
          .from('cards')
          .select('*, assignee:profiles!cards_assignee_id_fkey(full_name, avatar_url)')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        data = listData;
        fetchError = err;
        break;
      }

      case 'calendar': {
        const { data: calendarData, error: err } = await supabaseAdmin
          .from('cards')
          .select('id, custom_id, title, start_date, due_date, status, priority')
          .eq('project_id', projectId)
          .or('start_date.not.is.null,due_date.not.is.null')
          .order('due_date', { ascending: true });
        data = calendarData;
        fetchError = err;
        break;
      }

      case 'my-work': {
        const { data: myWorkData, error: err } = await supabaseAdmin
          .from('cards')
          .select('*')
          .eq('project_id', projectId)
          .eq('assignee_id', user.id)
          .neq('status', 'done')
          .order('priority', { ascending: false });
        data = myWorkData;
        fetchError = err;
        break;
      }

      case 'workload': {
        const [{ data: members, error: mErr }, { data: cards, error: cErr }] = await Promise.all([
          supabaseAdmin.from('profiles').select('id, full_name, avatar_url'),
          supabaseAdmin.from('cards').select('id, assignee_id, status, priority').eq('project_id', projectId).not('assignee_id', 'is', null)
        ]);

        if (mErr) throw mErr;
        if (cErr) throw cErr;

        const grouped = new Map();
        (members || []).forEach((m) => grouped.set(m.id, { ...m, total: 0, active: 0, done: 0 }));

        (cards || []).forEach((card) => {
          const member = grouped.get(card.assignee_id);
          if (!member) return;
          member.total += 1;
          if (card.status === 'done') member.done += 1;
          else member.active += 1;
        });

        data = Array.from(grouped.values()).filter((m) => m.total > 0);
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid view type' }, { status: 400 });
    }

    if (fetchError) throw fetchError;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: `Failed to fetch ${viewType} view data` }, { status: 500 });
  }
}
