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
      .from('notifications')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    const enriched = (data || []).map((item) => ({
      ...item,
      actor_id: item?.metadata?.actor_id || null,
      actor_name: item?.metadata?.actor_name || null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
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
    const { user_id, type, title, message, metadata } = await request.json();

    if (!user_id || !type || !title) {
      return NextResponse.json({ error: 'user_id, type and title are required' }, { status: 400 });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert({
        project_id: projectId,
        user_id,
        type,
        title,
        message: message || null,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
