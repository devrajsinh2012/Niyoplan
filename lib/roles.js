/**
 * Utility to verify if a user has one of the allowed roles
 */
export const checkRole = (user, ...allowedRoles) => {
  if (!user) return false;
  return allowedRoles.includes(user.role);
};
