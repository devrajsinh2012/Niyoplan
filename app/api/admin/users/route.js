import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { findAuthUserByEmail, getAuthUser, inviteAuthUserByEmail } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

export async function GET(request) {
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (orgId) {
      // Return members of the specified organization (accessible to any org admin/member)
      const { data: members, error: membersError } = await supabaseAdmin
        .from('organization_members')
        .select('*, profile:profiles(id, full_name, email, avatar_url, created_at, role)')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;

      // Flatten: return the profile data with the org role
      const users = (members || []).map(m => ({
        ...m.profile,
        org_role: m.role,
        org_member_id: m.id,
        joined_org_at: m.created_at,
      }));

      return NextResponse.json(users);
    }

    // Global admin: return all profiles
    if (!checkRole(user, 'admin')) {
      return NextResponse.json({ error: 'Forbidden. Requires admin role or orgId param.' }, { status: 403 });
    }

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
    const redirectTo = `${request.nextUrl.origin}/login`;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Emails list is required' }, { status: 400 });
    }

    const validRoles = ['admin', 'pm', 'qa', 'developer', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const invitations = [];

    for (const rawEmail of emails) {
      const email = String(rawEmail || '').trim().toLowerCase();

      if (!email) {
        continue;
      }

      const existingUser = await findAuthUserByEmail(email);

      if (existingUser?.id) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);

        if (updateError) {
          throw updateError;
        }

        invitations.push({
          email,
          role,
          user_id: existingUser.id,
          action: 'updated',
        });
        continue;
      }

      const invitedUser = await inviteAuthUserByEmail(email, {
        redirectTo,
        data: { role },
      });

      invitations.push({
        email,
        role,
        user_id: invitedUser?.id || null,
        action: 'invited',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${invitations.length} user${invitations.length === 1 ? '' : 's'}`,
      invitations,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to send invitations' }, { status: 500 });
  }
}
