import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { requireClientAccess } from '@/lib/clients/server';
import { markClientReminderNotificationsRead } from '@/lib/clients/notifications';

export async function POST(request, { params }) {
  const { reminderId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const days = Math.max(1, Math.min(Number(payload.days) || 1, 30));

  const { data: reminder } = await supabaseAdmin
    .from('client_reminders')
    .select('id, client_id')
    .eq('id', reminderId)
    .maybeSingle();

  if (!reminder) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });

  const access = await requireClientAccess(reminder.client_id, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const nextRemindAt = new Date();
  nextRemindAt.setDate(nextRemindAt.getDate() + days);

  const { data, error: updateError } = await supabaseAdmin
    .from('client_reminders')
    .update({ remind_at: nextRemindAt.toISOString(), updated_at: new Date().toISOString() })
    .eq('id', reminderId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: 'Failed to snooze reminder' }, { status: 500 });
  await markClientReminderNotificationsRead(reminderId, user.id);
  return NextResponse.json(data);
}

