import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request) {
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orgId = String(searchParams.get('orgId') || '').trim();

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required.' }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('id, role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('org_google_drive')
      .select('root_folder_id, connected_at')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      connected: Boolean(data),
      connectedAt: data?.connected_at || null,
      rootFolderId: data?.root_folder_id || null,
    });
  } catch (error) {
    console.error('Drive status lookup failed:', error);
    return NextResponse.json({ error: 'Unable to fetch Drive status.' }, { status: 500 });
  }
}
