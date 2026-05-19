import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateClientPayload } from '@/lib/clients/validation';
import { getClientWithChildren, requireClientAccess } from '@/lib/clients/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const client = await getClientWithChildren(clientId);
    return NextResponse.json(client);
  } catch (err) {
    console.error('Client GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const payload = await request.json();
    const { data, errors } = validateClientPayload(payload, { partial: true });
    delete data.organization_id;
    if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

    const { data: client, error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(client);
  } catch (err) {
    console.error('Client PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { data: client, error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(client);
  } catch (err) {
    console.error('Client DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to archive client' }, { status: 500 });
  }
}

