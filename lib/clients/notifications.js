import { supabaseAdmin } from '@/lib/supabaseServer';

export async function upsertClientReminderNotification(reminder) {
  if (!reminder?.id || !reminder?.assigned_to || reminder.status !== 'pending') return;

  const remindAt = reminder.remind_at ? new Date(reminder.remind_at) : null;
  if (remindAt && remindAt.getTime() > Date.now()) return;

  const metadata = {
    client_id: reminder.client_id,
    reminder_id: reminder.id,
    project_id: reminder.project_id || null,
    action_type: 'client_reminder',
  };

  const { data: existing } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('user_id', reminder.assigned_to)
    .eq('type', 'client_reminder_due')
    .contains('metadata', { reminder_id: reminder.id })
    .maybeSingle();

  const row = {
    project_id: reminder.project_id || null,
    user_id: reminder.assigned_to,
    type: 'client_reminder_due',
    title: reminder.title || 'Client reminder due',
    message: reminder.client_name
      ? `${reminder.client_name}: ${reminder.title}`
      : reminder.description || 'A client reminder needs your attention.',
    metadata,
    is_read: false,
  };

  if (existing?.id) {
    await supabaseAdmin.from('notifications').update(row).eq('id', existing.id);
    return;
  }

  await supabaseAdmin.from('notifications').insert(row);
}

export async function markClientReminderNotificationsRead(reminderId, userId = null) {
  if (!reminderId) return;

  let query = supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('type', 'client_reminder_due')
    .contains('metadata', { reminder_id: reminderId });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  await query;
}

