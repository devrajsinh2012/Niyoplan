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
    const { data: lists, error: listsError } = await supabaseAdmin
      .from('lists')
      .select('*')
      .eq('project_id', projectId)
      .order('rank', { ascending: true });

    if (listsError) throw listsError;
    return NextResponse.json(lists);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
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


  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
  }

  try {
    const { name, rank } = await request.json();
    
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    let newRank = rank;
    if (newRank === undefined) {
      const { data: existing } = await supabaseAdmin
        .from('lists')
        .select('rank')
        .eq('project_id', projectId)
        .order('rank', { ascending: false })
        .limit(1);
      
      newRank = existing && existing.length > 0 ? existing[0].rank + 1000 : 1000;
    }

    const { data: list, error: listError } = await supabaseAdmin
      .from('lists')
      .insert({
        project_id: projectId,
        name,
        rank: newRank
      })
      .select()
      .single();

    if (listError) throw listError;
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
