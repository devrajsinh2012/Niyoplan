import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateReminderPayload } from '@/lib/clients/validation';
import { requireClientAccess, validateClientRelations } from '@/lib/clients/server';
import { upsertClientReminderNotification } from '@/lib/clients/notifications';

export async function GET(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error: fetchError } = await supabaseAdmin
    .from('client_reminders')
    .select('*, assignee:profiles!client_reminders_assigned_to_fkey(id, full_name, avatar_url), project:projects(id, name, prefix)')
    .eq('client_id', clientId)
    .order('due_at', { ascending: true });

  if (fetchError) return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json();
  const { data, errors } = validateReminderPayload(payload);
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

  if (!data.assigned_to) data.assigned_to = user.id;
  const relationCheck = await validateClientRelations(data, access.client.organization_id);
  if (!relationCheck.valid) return NextResponse.json({ error: relationCheck.error }, { status: 400 });

  const { data: reminder, error: insertError } = await supabaseAdmin
    .from('client_reminders')
    .insert({ ...data, client_id: clientId, created_by: user.id })
    .select('*, client:clients(name)')
    .single();

  if (insertError) return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  await upsertClientReminderNotification({ ...reminder, client_name: reminder.client?.name });
  return NextResponse.json(reminder, { status: 201 });
}

