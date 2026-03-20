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

  try {
    const { data: dependencies, error: fetchError } = await supabaseAdmin
      .from('card_dependencies')
      .select(`*`)
      .eq('project_id', projectId);

    if (fetchError) throw fetchError;
    return NextResponse.json(dependencies);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const { predecessor_id, successor_id } = await request.json();

    const { data: dependency, error: insertError } = await supabaseAdmin
      .from('card_dependencies')
      .insert([{ project_id: projectId, predecessor_id, successor_id }])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 });
      throw insertError;
    }
    
    return NextResponse.json(dependency, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
