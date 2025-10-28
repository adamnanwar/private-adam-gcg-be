const { errorResponse } = require('../utils/response');

/**
 * Middleware to check if user has required role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json(errorResponse('Insufficient permissions', 'FORBIDDEN'));
      }

      next();
    } catch (error) {
      console.error('Error in requireRole middleware:', error);
      res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  };
}

module.exports = {
  requireRole
};
