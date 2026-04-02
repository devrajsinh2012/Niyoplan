import { supabaseAdmin } from './supabaseServer';

const AUTH_USER_PAGE_SIZE = 200;

async function findAuthUser(predicate) {
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: AUTH_USER_PAGE_SIZE });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const match = users.find(predicate);

    if (match) {
      return match;
    }

    if (!users.length || users.length < AUTH_USER_PAGE_SIZE) {
      return null;
    }

    page += 1;
  }
}

export async function findAuthUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  return findAuthUser((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
}

export async function inviteAuthUserByEmail(email, options = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, options);

  if (error) {
    throw error;
  }

  return data?.user || null;
}

/**
 * Utility to verify Supabase JWT token and get user from Route Handler headers.
 */
export const getAuthUser = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return {
      user: null,
      error: 'Incomplete user profile. Please login again or contact support.',
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: profile.role || 'member',
    },
    profile,
  };
};
