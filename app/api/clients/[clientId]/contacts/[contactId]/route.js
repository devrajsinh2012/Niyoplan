import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateContactPayload } from '@/lib/clients/validation';
import { requireClientAccess } from '@/lib/clients/server';
import { ensureSinglePrimaryContact } from '@/lib/clients/access';

export async function PATCH(request, { params }) {
  const { clientId, contactId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json();
  const { data, errors } = validateContactPayload(payload, { partial: true });
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

  if (data.is_primary) await ensureSinglePrimaryContact(clientId, contactId);

  const { data: contact, error: updateError } = await supabaseAdmin
    .from('client_contacts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', contactId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  return NextResponse.json(contact);
}

export async function DELETE(request, { params }) {
  const { clientId, contactId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { error: deleteError } = await supabaseAdmin
    .from('client_contacts')
    .delete()
    .eq('id', contactId)
    .eq('client_id', clientId);

  if (deleteError) return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  return NextResponse.json({ success: true });
}

