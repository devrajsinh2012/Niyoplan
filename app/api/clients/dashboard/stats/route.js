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
  if (!organizationId) return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });

  const access = await requireOrganizationClientAccess(organizationId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const now = new Date().toISOString();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [
      { count: totalClients },
      { count: activeClients },
      { count: overdueReminders },
      { count: upcomingReminders },
      { count: pendingDeliverables },
      { count: completedDeliverables },
      { count: totalDeliverables },
    ] = await Promise.all([
      supabaseAdmin.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'archived'),
      supabaseAdmin.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
      supabaseAdmin.from('client_reminders').select('clients!inner(organization_id)', { count: 'exact', head: true }).eq('clients.organization_id', organizationId).eq('status', 'pending').lt('due_at', now),
      supabaseAdmin.from('client_reminders').select('clients!inner(organization_id)', { count: 'exact', head: true }).eq('clients.organization_id', organizationId).eq('status', 'pending').gte('due_at', now).lte('due_at', weekEnd.toISOString()),
      supabaseAdmin.from('client_deliverables').select('clients!inner(organization_id)', { count: 'exact', head: true }).eq('clients.organization_id', organizationId).eq('status', 'pending'),
      supabaseAdmin.from('client_deliverables').select('clients!inner(organization_id)', { count: 'exact', head: true }).eq('clients.organization_id', organizationId).in('status', ['delivered', 'approved']),
      supabaseAdmin.from('client_deliverables').select('clients!inner(organization_id)', { count: 'exact', head: true }).eq('clients.organization_id', organizationId),
    ]);

    return NextResponse.json({
      total_clients: totalClients || 0,
      active_clients: activeClients || 0,
      overdue_reminders: overdueReminders || 0,
      upcoming_reminders: upcomingReminders || 0,
      pending_deliverables: pendingDeliverables || 0,
      deliverable_completion_rate: totalDeliverables ? Math.round(((completedDeliverables || 0) / totalDeliverables) * 100) : 0,
    });
  } catch (err) {
    console.error('Client stats GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch client stats' }, { status: 500 });
  }
}

