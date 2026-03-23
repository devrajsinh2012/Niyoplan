import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = params;

    // Check if user is an admin of this organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership || membership.role !== 'admin' || membership.status !== 'active') {
      return NextResponse.json({ error: 'Only admins can regenerate invite codes' }, { status: 403 });
    }

    // Generate new invite code
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'NYP-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let newCode;
    let isUnique = false;
    let attempts = 0;

    // Try to generate a unique code (max 10 attempts)
    while (!isUnique && attempts < 10) {
      newCode = generateCode();
      const { data: existing } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('invite_code', newCode)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 });
    }

    // Update organization with new invite code
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .update({
        invite_code: newCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId)
      .select('invite_code')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update invite code' }, { status: 500 });
    }

    return NextResponse.json({ inviteCode: org.invite_code });
  } catch (error) {
    console.error('Error in POST /api/organizations/[orgId]/regenerate-code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
