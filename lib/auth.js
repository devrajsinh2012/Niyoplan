import { supabaseAdmin } from './supabaseServer';

/**
 * Utility to verify Supabase JWT token and get user from Route Handler headers
 */
export const getAuthUser = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.split(' ')[1];

  // Verify token with Supabase
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  // Fetch user profile from DB to get the role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return { 
      user: { id: user.id, email: user.email, role: 'member' },
      profile: null
    };
  }

  return { 
    user: { 
      id: user.id, 
      email: user.email, 
      role: profile.role || 'member' 
    },
    profile: profile
  };
};
