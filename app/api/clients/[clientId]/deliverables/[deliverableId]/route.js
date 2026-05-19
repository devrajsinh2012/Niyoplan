import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateDeliverablePayload } from '@/lib/clients/validation';
import { requireClientAccess, validateClientRelations } from '@/lib/clients/server';

export async function PATCH(request, { params }) {
  const { clientId, deliverableId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json();
  const { data, errors } = validateDeliverablePayload(payload, { partial: true });
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

  const relationCheck = await validateClientRelations(data, access.client.organization_id);
  if (!relationCheck.valid) return NextResponse.json({ error: relationCheck.error }, { status: 400 });

  const { data: deliverable, error: updateError } = await supabaseAdmin
    .from('client_deliverables')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', deliverableId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: 'Failed to update deliverable' }, { status: 500 });
  return NextResponse.json(deliverable);
}

export async function DELETE(request, { params }) {
  const { clientId, deliverableId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { error: deleteError } = await supabaseAdmin
    .from('client_deliverables')
    .delete()
    .eq('id', deliverableId)
    .eq('client_id', clientId);

  if (deleteError) return NextResponse.json({ error: 'Failed to delete deliverable' }, { status: 500 });
  return NextResponse.json({ success: true });
}

