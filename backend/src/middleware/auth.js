const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'poojapa_sacred_secret_jwt_key_2026_mkcreation';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, name }
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the following roles: [${roles.join(', ')}]. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

const requireAdmin = requireRole('admin');
const requireCustomer = requireRole(['customer', 'admin']); // Admin can also act as customer if desired

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireCustomer,
  JWT_SECRET,
};
