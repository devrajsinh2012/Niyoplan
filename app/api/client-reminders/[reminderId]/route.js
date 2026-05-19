import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateReminderPayload } from '@/lib/clients/validation';
import { requireClientAccess, validateClientRelations } from '@/lib/clients/server';
import { markClientReminderNotificationsRead, upsertClientReminderNotification } from '@/lib/clients/notifications';

async function getReminder(reminderId) {
  const { data, error } = await supabaseAdmin
    .from('client_reminders')
    .select('*, client:clients(id, name, organization_id)')
    .eq('id', reminderId)
    .maybeSingle();

  return { reminder: data, error };
}

export async function PATCH(request, { params }) {
  const { reminderId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const { reminder } = await getReminder(reminderId);
  if (!reminder) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });

  const access = await requireClientAccess(reminder.client_id, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json();
  const { data, errors } = validateReminderPayload(payload, { partial: true });
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

  const relationCheck = await validateClientRelations(data, reminder.client.organization_id);
  if (!relationCheck.valid) return NextResponse.json({ error: relationCheck.error }, { status: 400 });

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('client_reminders')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', reminderId)
    .select('*, client:clients(id, name, organization_id)')
    .single();

  if (updateError) return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });

  if (updated.status === 'pending') {
    await upsertClientReminderNotification({ ...updated, client_name: updated.client?.name });
  } else {
    await markClientReminderNotificationsRead(reminderId);
  }

  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const { reminderId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const { reminder } = await getReminder(reminderId);
  if (!reminder) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });

  const access = await requireClientAccess(reminder.client_id, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { error: deleteError } = await supabaseAdmin
    .from('client_reminders')
    .delete()
    .eq('id', reminderId);

  if (deleteError) return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  await markClientReminderNotificationsRead(reminderId);
  return NextResponse.json({ success: true });
}

