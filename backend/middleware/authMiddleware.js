// middleware/authMiddleware.js
// JWT verification — reads httpOnly cookie (web) or Bearer header (mobile/API)

const jwt = require('jsonwebtoken');
const { formatErrorResponse } = require('../utils/formatters');

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new Error('Token expired');
    if (error.name === 'JsonWebTokenError')  throw new Error('Invalid token');
    throw error;
  }
};

// Reads cookie first (web), then Authorization header (mobile / public API)
const extractToken = (req) => {
  if (req.cookies?.token) return req.cookies.token;

  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};

const authenticate = (expectedRole) => (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json(formatErrorResponse('No token provided. Please login.', 401));
    }

    const decoded = verifyToken(token);

    if (expectedRole && decoded.role !== expectedRole) {
      return res.status(403).json(
        formatErrorResponse(`Access denied. ${expectedRole} role required.`, 403)
      );
    }

    req.user = {
      _id:      decoded.id || decoded._id,
      role:     decoded.role,
      phone:    decoded.phone,
      email:    decoded.email,
      businessId: decoded.businessId,
    };

    if (decoded.role === 'owner')    req.owner    = req.user;
    if (decoded.role === 'customer') req.customer = req.user;
    if (decoded.role === 'admin')    req.admin    = req.user;

    next();
  } catch (error) {
    if (error.message === 'Token expired') {
      return res.status(401).json(formatErrorResponse('Token expired. Please login again.', 401));
    }
    return res.status(401).json(formatErrorResponse('Invalid or expired token.', 401));
  }
};

const authenticateOwner    = authenticate('owner');
const authenticateCustomer = authenticate('customer');
const authenticateAdmin    = authenticate('admin');

// Optional auth — attaches user if token present, never blocks
const authenticateOptional = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      req.user = { _id: decoded.id || decoded._id, role: decoded.role };
      if (decoded.role === 'owner')    req.owner    = req.user;
      if (decoded.role === 'customer') req.customer = req.user;
    }
  } catch {}
  next();
};

module.exports = { verifyToken, extractToken, authenticateOwner, authenticateCustomer, authenticateAdmin, authenticateOptional };
