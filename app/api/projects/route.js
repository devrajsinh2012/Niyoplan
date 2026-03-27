import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get user's active organizations
    const { data: orgMembers, error: orgError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (orgError) throw orgError;

    const orgIds = orgMembers.map(member => member.organization_id);

    if (orgIds.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Filter projects to only those within the user's organizations
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        profiles ( full_name, avatar_url ),
        cards ( count )
      `)
      .in('organization_id', orgIds)
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;
    return NextResponse.json(projects);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
  }

  try {
    const { name, description, prefix } = await request.json();
    
    if (!name || !prefix) {
      return NextResponse.json({ error: 'Name and prefix are required' }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description,
        prefix: prefix.toUpperCase(),
        created_by: user.id
      })
      .select()
      .single();

    if (projectError) throw projectError;
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Project prefix must be unique' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
