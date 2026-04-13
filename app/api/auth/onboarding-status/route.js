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
    const [{ data: activeMembership }, { data: pendingMembership }, { data: invitedMembership }, authUserResult] = await Promise.all([
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
      supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .not('invited_by', 'is', null)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(user.id),
    ]);

    const authUser = authUserResult?.data?.user || null;
    const provider = authUser?.app_metadata?.provider;
    const providers = Array.isArray(authUser?.app_metadata?.providers)
      ? authUser.app_metadata.providers
      : (provider ? [provider] : []);

    const isGoogleUser = provider === 'google' || providers.includes('google');
    const isInvitedUser = Boolean(invitedMembership);
    const hasPassword = authUser ? Boolean(authUser.encrypted_password) : true;
    const requiresPasswordSetup = !hasPassword && (isGoogleUser || isInvitedUser);

    return NextResponse.json({
      hasActiveOrganization: Boolean(activeMembership),
      hasPendingOrganization: Boolean(pendingMembership),
      requiresPasswordSetup,
      passwordSetupReason: requiresPasswordSetup
        ? (isGoogleUser ? 'google' : 'invited')
        : null,
    });
  } catch (err) {
    console.error('Failed to fetch onboarding status:', err);
    return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 });
  }
}
