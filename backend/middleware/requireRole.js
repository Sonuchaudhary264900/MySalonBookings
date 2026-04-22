// RBAC middleware — role-based access control for staff routes
// Usage: router.get('/route', authenticateOwner, requireRole('owner','manager'), handler)

const { formatErrorResponse } = require('../utils/formatters');

// Role hierarchy: higher index = more permissions
const ROLE_LEVEL = { stylist: 0, receptionist: 1, manager: 2, owner: 3 };

// Permissions matrix
const ROLE_PERMISSIONS = {
  owner:        ['*'],
  manager:      ['bookings','staff','services','reports','customers','queue','chat','notes'],
  receptionist: ['bookings:read','bookings:write','queue','customers:read','chat'],
  stylist:      ['bookings:own','queue:own','chat','notes:own'],
};

const hasPermission = (role, permission) => {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;
  // Check namespace prefix — 'bookings' grants 'bookings:read' and 'bookings:write'
  const ns = permission.split(':')[0];
  return perms.includes(ns);
};

// Allow specific roles only
const requireRole = (...allowedRoles) => (req, res, next) => {
  // req.owner is set by authenticateOwner (always role='owner')
  if (req.owner) return next();

  // Staff routes set req.staff
  const staffRole = req.staff?.staffRole;
  if (!staffRole) {
    return res.status(401).json(formatErrorResponse('Authentication required', 401));
  }

  if (!allowedRoles.includes(staffRole)) {
    return res.status(403).json(
      formatErrorResponse(`Access denied. Requires one of: ${allowedRoles.join(', ')}`, 403)
    );
  }

  next();
};

// Allow staff with specific permission
const requirePermission = (permission) => (req, res, next) => {
  if (req.owner) return next(); // owners bypass all permission checks

  const staffRole = req.staff?.staffRole;
  if (!staffRole) return res.status(401).json(formatErrorResponse('Authentication required', 401));

  if (!hasPermission(staffRole, permission)) {
    return res.status(403).json(
      formatErrorResponse(`Access denied. Missing permission: ${permission}`, 403)
    );
  }

  next();
};

module.exports = { requireRole, requirePermission, hasPermission };
