import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
  }

  try {
    const { data, error: fetchError } = await supabaseAdmin
      .from('hr_reviews')
      .select('*, reviewer:profiles!hr_reviews_reviewer_id_fkey(full_name)')
      .eq('project_id', projectId)
      .order('review_date', { ascending: false });

    if (fetchError) throw fetchError;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch HR reviews' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin or pm role.' }, { status: 403 });
  }

  try {
    const { review_date, employee_notes, manager_notes, action_plan } = await request.json();

    if (!review_date) return NextResponse.json({ error: 'review_date is required' }, { status: 400 });

    const { data, error: insertError } = await supabaseAdmin
      .from('hr_reviews')
      .insert({
        project_id: projectId,
        reviewer_id: user.id,
        review_date,
        employee_notes: employee_notes || null,
        manager_notes: manager_notes || null,
        action_plan: action_plan || null
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create HR review' }, { status: 500 });
  }
}
