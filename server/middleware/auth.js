const supabase = require('../lib/supabase');

/**
 * Middleware to verify Supabase JWT token and attach user to req
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token', details: error?.message });
    }

    // Fetch user profile from DB to get the role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // We still let them pass, but they might lack permissions if role is missing
      req.user = { id: user.id, email: user.email, role: 'member' };
    } else {
      req.user = { 
        id: user.id, 
        email: user.email, 
        role: profile.role || 'member',
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      };
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = { requireAuth };
