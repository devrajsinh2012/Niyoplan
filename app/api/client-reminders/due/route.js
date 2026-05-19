import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { requireOrganizationClientAccess } from '@/lib/clients/server';
import { upsertClientReminderNotification } from '@/lib/clients/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });

  const access = await requireOrganizationClientAccess(organizationId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);

    const { data, error: fetchError } = await supabaseAdmin
      .from('client_reminders')
      .select('*, client:clients!inner(id, name, company, organization_id), project:projects(id, name, prefix), assignee:profiles!client_reminders_assigned_to_fkey(id, full_name, avatar_url)')
      .eq('client.organization_id', organizationId)
      .eq('status', 'pending')
      .lte('due_at', weekEnd.toISOString())
      .order('due_at', { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;

    await Promise.all((data || [])
      .filter((reminder) => !reminder.remind_at || new Date(reminder.remind_at).getTime() <= now.getTime())
      .map((reminder) => upsertClientReminderNotification({
        ...reminder,
        client_id: reminder.client?.id || reminder.client_id,
        client_name: reminder.client?.name,
      })));

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Due client reminders GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch due reminders' }, { status: 500 });
  }
}

