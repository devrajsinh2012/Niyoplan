import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: entries, error: fetchError } = await supabaseAdmin
      .from('dsm_entries')
      .select(`
        *,
        user:profiles!dsm_entries_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });

    if (fetchError) throw fetchError;

    const latestByUser = new Map();
    for (const entry of entries) {
      if (!latestByUser.has(entry.user_id)) {
        latestByUser.set(entry.user_id, entry);
      }
    }

    return NextResponse.json(Array.from(latestByUser.values()));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch latest DSM entries' }, { status: 500 });
  }
}
