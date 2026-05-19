import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateContactPayload } from '@/lib/clients/validation';
import { requireClientAccess } from '@/lib/clients/server';
import { ensureSinglePrimaryContact } from '@/lib/clients/access';

export async function GET(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error: fetchError } = await supabaseAdmin
    .from('client_contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  if (fetchError) return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request, { params }) {
  const { clientId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const access = await requireClientAccess(clientId, user.id, 'manage');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json();
  const { data, errors } = validateContactPayload(payload);
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

  if (data.is_primary) await ensureSinglePrimaryContact(clientId);

  const { data: contact, error: insertError } = await supabaseAdmin
    .from('client_contacts')
    .insert({ ...data, client_id: clientId })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  return NextResponse.json(contact, { status: 201 });
}

