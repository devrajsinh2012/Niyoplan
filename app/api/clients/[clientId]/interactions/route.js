import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateInteractionPayload, validateReminderPayload } from '@/lib/clients/validation';
import { requireClientAccess, validateClientRelations } from '@/lib/clients/server';
import { upsertClientReminderNotification } from '@/lib/clients/notifications';

export async function GET(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error: fetchError } = await supabaseAdmin
    .from('client_interactions')
    .select('*, creator:profiles!client_interactions_created_by_fkey(id, full_name, avatar_url), project:projects(id, name, prefix)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (fetchError) return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json();
  const { data, errors } = validateInteractionPayload(payload);
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

  const relationCheck = await validateClientRelations(data, access.client.organization_id);
  if (!relationCheck.valid) return NextResponse.json({ error: relationCheck.error }, { status: 400 });

  const { data: interaction, error: insertError } = await supabaseAdmin
    .from('client_interactions')
    .insert({ ...data, client_id: clientId, created_by: user.id })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });

  if (payload.create_follow_up && data.next_action_at) {
    const reminderPayload = {
      title: `Follow up: ${data.title}`,
      description: data.action_items || data.outcome || data.notes,
      reminder_type: 'follow_up',
      due_at: data.next_action_at,
      remind_at: data.next_action_at,
      assigned_to: user.id,
      project_id: data.project_id,
    };
    const reminderValidation = validateReminderPayload(reminderPayload);
    if (!reminderValidation.errors.length) {
      const { data: reminder } = await supabaseAdmin
        .from('client_reminders')
        .insert({ ...reminderValidation.data, client_id: clientId, created_by: user.id })
        .select('*, client:clients(name)')
        .single();
      await upsertClientReminderNotification({ ...reminder, client_name: reminder?.client?.name });
    }
  }

  return NextResponse.json(interaction, { status: 201 });
}

