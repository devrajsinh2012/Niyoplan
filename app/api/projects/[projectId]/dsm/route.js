import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

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

    if (!q) {
      return NextResponse.json(entries);
    }

    const filtered = entries.filter((entry) => {
      return (
        entry.yesterday_text?.toLowerCase().includes(q) ||
        entry.today_text?.toLowerCase().includes(q) ||
        entry.blockers_text?.toLowerCase().includes(q) ||
        entry.user?.full_name?.toLowerCase().includes(q)
      );
    });

    return NextResponse.json(filtered);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch DSM entries' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const { yesterday_text, today_text, blockers_text, mood_rating } = await request.json();

    if (!yesterday_text || !today_text) {
      return NextResponse.json({ error: 'Yesterday and Today fields are required' }, { status: 400 });
    }

    const { data: entry, error: insertError } = await supabaseAdmin
      .from('dsm_entries')
      .insert({
        project_id: projectId,
        user_id: user.id,
        yesterday_text,
        today_text,
        blockers_text: blockers_text || null,
        mood_rating: mood_rating || null
      })
      .select(`
        *,
        user:profiles!dsm_entries_user_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create DSM entry' }, { status: 500 });
  }
}
