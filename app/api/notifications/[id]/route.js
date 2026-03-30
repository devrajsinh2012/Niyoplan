import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
