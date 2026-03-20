import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function PUT(request, { params }) {
  const { id } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin role.' }, { status: 403 });
  }

  try {
    const { role } = await request.json();
    
    if (!['admin', 'pm', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { data: userProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json({ message: 'Role updated successfully', user: userProfile });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
