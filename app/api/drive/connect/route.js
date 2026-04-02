import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { createDriveFolder, upsertOrgDriveConnection } from '@/lib/drive';

function resolveTokenShape(tokenRecord) {
  if (!tokenRecord) return null;

  const accessToken = tokenRecord.accessToken || tokenRecord.access_token || tokenRecord.token || null;
  const refreshToken = tokenRecord.refreshToken || tokenRecord.refresh_token || null;
  const expiryDate = tokenRecord.expiresAt || tokenRecord.expires_at || tokenRecord.expiry_date || null;

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    tokenExpiry: expiryDate ? new Date(expiryDate).toISOString() : null,
  };
}

async function getClerkGoogleTokens(clerkUserId) {
  const client = await clerkClient();
  const result = await client.users.getUserOauthAccessToken(clerkUserId, 'oauth_google');

  const records = Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
      ? result.data
      : [];

  for (const record of records) {
    const parsed = resolveTokenShape(record);
    if (parsed) return parsed;
  }

  return null;
}

export async function POST(request) {
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const orgId = String(body?.orgId || '').trim();
    const orgName = String(body?.orgName || '').trim();

    if (!orgId || !orgName) {
      return NextResponse.json({ error: 'orgId and orgName are required.' }, { status: 400 });
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

    let tokenBundle = resolveTokenShape({
      accessToken: body?.accessToken,
      refreshToken: body?.refreshToken,
      tokenExpiry: body?.tokenExpiry,
    });

    if (!tokenBundle && user.clerk_user_id) {
      tokenBundle = await getClerkGoogleTokens(user.clerk_user_id);
    }

    if (!tokenBundle) {
      return NextResponse.json(
        {
          error:
            'Google OAuth tokens were not available. Re-authenticate with Google in Clerk and ensure refresh tokens are enabled.',
        },
        { status: 400 }
      );
    }

    await upsertOrgDriveConnection({
      orgId,
      accessToken: tokenBundle.accessToken,
      refreshToken: tokenBundle.refreshToken,
      tokenExpiry: tokenBundle.tokenExpiry,
      rootFolderId: 'pending',
      connectedBy: user.id,
    });

    const niyoplanFolderId = await createDriveFolder(orgId, 'Niyoplan');
    const orgFolderId = await createDriveFolder(orgId, orgName, niyoplanFolderId);

    const { error: updateError } = await supabaseAdmin
      .from('org_google_drive')
      .update({
        root_folder_id: orgFolderId,
        connected_by: user.id,
        connected_at: new Date().toISOString(),
      })
      .eq('org_id', orgId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, rootFolderId: orgFolderId });
  } catch (error) {
    console.error('Drive connect failed:', error);
    return NextResponse.json(
      { error: 'Unable to connect Google Drive right now. Please try again.' },
      { status: 500 }
    );
  }
}
