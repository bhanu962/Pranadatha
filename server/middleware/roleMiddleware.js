/**
 * Role-Based Access Control Middleware
 * Restricts routes to specific user roles
 */

/**
 * Allow access to specific roles only
 * @param {...string} roles - Allowed role names
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
        yourRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Ensure the requesting user owns the resource or is admin
 */
const authorizeOwnerOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    const requestingUserId = req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && resourceUserId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own resources.',
      });
    }

    next();
  };
};

module.exports = { authorize, authorizeOwnerOrAdmin };
