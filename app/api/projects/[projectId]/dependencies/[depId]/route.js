import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

const VALID_DEPENDENCY_TYPES = ['finish_start', 'finish_finish', 'start_start', 'start_finish'];

export async function PUT(request, { params }) {
  const { projectId, depId } = await params;
  const { user, error } = await getAuthUser(request);
  
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, lead_or_lag_days } = body;

    // Validate inputs
    if (type && !VALID_DEPENDENCY_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid dependency type. Must be one of: ${VALID_DEPENDENCY_TYPES.join(', ')}` 
      }, { status: 400 });
    }

    if (lead_or_lag_days !== undefined && 
        (typeof lead_or_lag_days !== 'number' || lead_or_lag_days < -365 || lead_or_lag_days > 365)) {
      return NextResponse.json({ 
        error: 'lead_or_lag_days must be between -365 and 365' 
      }, { status: 400 });
    }

    // Fetch existing dependency
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('card_dependencies')
      .select('*')
      .eq('id', depId)
      .eq('project_id', projectId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 });
    }

    // Build update payload (only include provided fields)
    const updatePayload = {};
    if (type !== undefined) updatePayload.type = type;
    if (lead_or_lag_days !== undefined) updatePayload.lead_or_lag_days = lead_or_lag_days;

    // Update dependency
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('card_dependencies')
      .update(updatePayload)
      .eq('id', depId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Dependency PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { projectId, depId } = await params;
  const { user, error } = await getAuthUser(request);
  
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    // Verify dependency exists and belongs to project
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('card_dependencies')
      .select('id')
      .eq('id', depId)
      .eq('project_id', projectId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 });
    }

    // Delete dependency
    const { error: deleteErr } = await supabaseAdmin
      .from('card_dependencies')
      .delete()
      .eq('id', depId)
      .eq('project_id', projectId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ message: 'Dependency deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('Dependency DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
