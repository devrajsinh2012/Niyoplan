import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateDeliverablePayload } from '@/lib/clients/validation';
import { requireClientAccess, validateClientRelations } from '@/lib/clients/server';

export async function GET(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error: fetchError } = await supabaseAdmin
    .from('client_deliverables')
    .select('*, project:projects(id, name, prefix)')
    .eq('client_id', clientId)
    .order('due_date', { ascending: true });

  if (fetchError) return NextResponse.json({ error: 'Failed to fetch deliverables' }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json();
  const { data, errors } = validateDeliverablePayload(payload);
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

  const relationCheck = await validateClientRelations(data, access.client.organization_id);
  if (!relationCheck.valid) return NextResponse.json({ error: relationCheck.error }, { status: 400 });

  const { data: deliverable, error: insertError } = await supabaseAdmin
    .from('client_deliverables')
    .insert({ ...data, client_id: clientId, created_by: user.id })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: 'Failed to create deliverable' }, { status: 500 });
  return NextResponse.json(deliverable, { status: 201 });
}

