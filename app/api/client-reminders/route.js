import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { requireOrganizationClientAccess } from '@/lib/clients/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const status = searchParams.get('status') || 'pending';

  if (!organizationId) return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });

  const access = await requireOrganizationClientAccess(organizationId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    let query = supabaseAdmin
      .from('client_reminders')
      .select('*, client:clients!inner(id, name, company, organization_id), project:projects(id, name, prefix), assignee:profiles!client_reminders_assigned_to_fkey(id, full_name, avatar_url)')
      .eq('client.organization_id', organizationId)
      .order('due_at', { ascending: true })
      .limit(100);

    if (status !== 'all') query = query.eq('status', status);

    const { data, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Client reminders GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

