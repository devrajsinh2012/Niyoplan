import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function GET(request, { params }) {
  const { id } = params;
  const { user, error } = await getAuthUser(request);
  
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin role.' }, { status: 403 });
  }

  try {
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(targetUser);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const { user, error } = await getAuthUser(request);
  
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin role.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updateData = {};

    // Allow updating these fields
    if (body.role !== undefined) {
      const validRoles = ['admin', 'pm', 'member', 'viewer'];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = body.role;
    }

    if (body.full_name !== undefined) {
      updateData.full_name = body.full_name;
    }

    if (body.avatar_url !== undefined) {
      updateData.avatar_url = body.avatar_url;
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const { user, error } = await getAuthUser(request);
  
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin role.' }, { status: 403 });
  }

  // Prevent admin from deleting themselves
  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
