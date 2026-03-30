import { supabaseAdmin } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enriched = (data || []).map((item) => ({
      ...item,
      actor_id: item?.metadata?.actor_id || null,
      actor_name: item?.metadata?.actor_name || null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
