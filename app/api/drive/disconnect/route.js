import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(request) {
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const orgId = String(body?.orgId || '').trim();

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required.' }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership || membership.status !== 'active' || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access is required.' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('org_google_drive')
      .delete()
      .eq('org_id', orgId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Drive disconnect failed:', error);
    return NextResponse.json({ error: 'Unable to disconnect Google Drive right now.' }, { status: 500 });
  }
}
