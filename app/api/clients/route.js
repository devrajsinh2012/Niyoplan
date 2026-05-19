import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { validateClientPayload } from '@/lib/clients/validation';
import { requireOrganizationClientAccess } from '@/lib/clients/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const search = (searchParams.get('search') || '').trim();
  const status = searchParams.get('status');
  const tier = searchParams.get('tier');
  const sort = searchParams.get('sort') || 'recent';

  if (!organizationId) return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });

  const access = await requireOrganizationClientAccess(organizationId, user.id, 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    let query = supabaseAdmin
      .from('clients')
      .select(`
        *,
        contacts:client_contacts(count),
        reminders:client_reminders(count),
        deliverables:client_deliverables(count)
      `)
      .eq('organization_id', organizationId);

    if (status && status !== 'all') query = query.eq('status', status);
    if (tier && tier !== 'all') query = query.eq('tier', tier);
    if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);

    if (sort === 'name') query = query.order('name', { ascending: true });
    else if (sort === 'contract') query = query.order('contract_value', { ascending: false, nullsFirst: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Clients GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();
    const { data, errors } = validateClientPayload(payload);
    if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 });

    const access = await requireOrganizationClientAccess(data.organization_id, user.id, 'manage');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { data: client, error: insertError } = await supabaseAdmin
      .from('clients')
      .insert({ ...data, created_by: user.id })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error('Clients POST failed:', err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}

