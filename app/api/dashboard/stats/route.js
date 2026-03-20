import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Total Projects
    const { count: totalProjects, error: err1 } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true });
    if (err1) throw err1;

    // 2. Total Cards
    const { count: totalCards, error: err2 } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true });
    if (err2) throw err2;

    // 3. Open vs Done Cards
    const { count: doneCards, error: err3 } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done');
    if (err3) throw err3;
    
    const openCards = (totalCards || 0) - (doneCards || 0);

    // 4. Recent Activity
    const { data: activity, error: err4 } = await supabaseAdmin
      .from('activity_log')
      .select(`
        *,
        user:profiles(full_name, avatar_url),
        card:cards(custom_id, title)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    if (err4) throw err4;

    return NextResponse.json({
      metrics: {
        totalProjects: totalProjects || 0,
        totalCards: totalCards || 0,
        openCards,
        doneCards: doneCards || 0
      },
      recentActivity: activity || []
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
