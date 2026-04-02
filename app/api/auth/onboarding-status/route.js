import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);

  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const [{ data: activeMembership }, { data: pendingMembership }] = await Promise.all([
      supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      hasActiveOrganization: Boolean(activeMembership),
      hasPendingOrganization: Boolean(pendingMembership),
    });
  } catch (err) {
    console.error('Failed to fetch onboarding status:', err);
    return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 });
  }
}
