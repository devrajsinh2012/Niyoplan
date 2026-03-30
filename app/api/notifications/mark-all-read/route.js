import { supabaseAdmin } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark all read PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
