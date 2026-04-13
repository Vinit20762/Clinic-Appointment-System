/**
 * authorizeRole
 * -------------
 * Factory function that returns a middleware which checks whether
 * the authenticated user's role is in the allowed list.
 *
 * Usage:
 *   router.post('/admin/add-doctor', verifyToken, authorizeRole(['admin']), handler)
 *   router.get('/doctor/appointments', verifyToken, authorizeRole(['doctor']), handler)
 *
 * @param {string[]} roles - Array of roles allowed to access the route
 */
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. Required role: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
};

module.exports = authorizeRole;
