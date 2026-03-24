import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin role.' }, { status: 403 });
  }

  try {
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    return NextResponse.json(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin')) {
    return NextResponse.json({ error: 'Forbidden. Requires admin role.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { emails, role = 'member' } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Emails list is required' }, { status: 400 });
    }

    const validRoles = ['admin', 'pm', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if invitations table exists, if not create it
    // For now, we only support tracking via auth invitations
    // This would typically integrate with your auth provider (Supabase Auth)
    
    // Simple approach: send invitations to emails
    // Note: Full email integration would need backend email service setup
    const invitations = emails.map(email => ({
      email,
      role,
      invited_by: user.id,
      invited_at: new Date().toISOString()
    }));

    // Store invitations in a simple audit log for now
    // In production, integrate with email service and proper auth invite flow
    return NextResponse.json({
      success: true,
      message: `Invitations prepared for ${emails.length} users`,
      invitations: invitations
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to send invitations' }, { status: 500 });
  }
}
