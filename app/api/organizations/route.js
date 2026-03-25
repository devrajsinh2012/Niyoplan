import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        joined_at,
        organizations:organization_id (
          id,
          name,
          slug,
          logo_url,
          invite_code,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (membershipError) throw membershipError;

    const organizations = (data || [])
      .filter((row) => row.organizations)
      .map((row) => ({
        ...row.organizations,
        role: row.role,
        status: row.status,
        joined_at: row.joined_at,
      }));

    return NextResponse.json(organizations);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}
