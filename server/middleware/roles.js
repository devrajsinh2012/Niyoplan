/**
 * Middleware factory to restrict routes to specific roles
 * @param {...string} allowedRoles 
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized, no user attached' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires one of these roles: ${allowedRoles.join(', ')}` });
    }

    next();
  };
};

module.exports = { requireRole };
