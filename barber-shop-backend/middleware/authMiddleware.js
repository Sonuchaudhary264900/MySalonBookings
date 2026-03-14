// middleware/authMiddleware.js
/*
  Authentication Middleware
  Secure JWT verification for Owner, Customer, Admin
  Stable version to prevent future runtime crashes
*/

const jwt = require("jsonwebtoken");
const { formatErrorResponse } = require("../utils/formatters");

/* ======================================================
   HELPER: VERIFY TOKEN
====================================================== */

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    throw error;
  }
};

/* ======================================================
   HELPER: EXTRACT TOKEN
====================================================== */

const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const parts = authHeader.split(" ");

  if (parts.length !== 2) return null;

  if (parts[0] !== "Bearer") return null;

  return parts[1];
};

/* ======================================================
   GENERIC AUTH FUNCTION
====================================================== */

const authenticate = (expectedRole) => {
  return (req, res, next) => {
    try {
      const token = extractToken(req);

      if (!token) {
        return res.status(401).json(
          formatErrorResponse("No token provided. Please login.", 401)
        );
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json(
          formatErrorResponse("Invalid token.", 401)
        );
      }

      if (expectedRole && decoded.role !== expectedRole) {
        return res.status(403).json(
          formatErrorResponse(
            `Access denied. ${expectedRole} role required.`,
            403
          )
        );
      }

      // IMPORTANT: normalize user object
      req.user = {
        _id: decoded.id || decoded._id,
        role: decoded.role,
        phone: decoded.phone,
        email: decoded.email
      };

      // role specific
      if (decoded.role === "owner") req.owner = req.user;
      if (decoded.role === "customer") req.customer = req.user;
      if (decoded.role === "admin") req.admin = req.user;

      next();
    } catch (error) {
      if (error.message === "Token expired") {
        return res.status(401).json(
          formatErrorResponse("Token expired. Please login again.", 401)
        );
      }

      console.error("Auth error:", error);

      return res.status(401).json(
        formatErrorResponse("Invalid or expired token.", 401)
      );
    }
  };
};

/* ======================================================
   OWNER AUTH
====================================================== */

const authenticateOwner = authenticate("owner");

/* ======================================================
   CUSTOMER AUTH
====================================================== */

const authenticateCustomer = authenticate("customer");

/* ======================================================
   ADMIN AUTH
====================================================== */

const authenticateAdmin = authenticate("admin");

/* ======================================================
   OPTIONAL AUTH
====================================================== */

const authenticateOptional = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) return next();

    const decoded = verifyToken(token);

    req.user = {
      _id: decoded.id || decoded._id,
      role: decoded.role
    };

    if (decoded.role === "owner") req.owner = req.user;
    if (decoded.role === "customer") req.customer = req.user;
    if (decoded.role === "admin") req.admin = req.user;

    next();
  } catch (error) {
    next();
  }
};

/* ======================================================
   VERIFY RESOURCE OWNERSHIP
====================================================== */

const verifyOwnership = (ownerId) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json(
        formatErrorResponse("Authentication required.", 401)
      );
    }

    if (req.user._id.toString() !== ownerId.toString()) {
      return res.status(403).json(
        formatErrorResponse("You do not have permission.", 403)
      );
    }

    next();
  };
};

/* ======================================================
   VERIFY CUSTOMER OWNERSHIP
====================================================== */

const verifyCustomerOwnership = (customerId) => {
  return (req, res, next) => {

    if (!req.customer) {
      return res.status(401).json(
        formatErrorResponse("Customer authentication required.", 401)
      );
    }

    if (req.customer._id.toString() !== customerId.toString()) {
      return res.status(403).json(
        formatErrorResponse("You do not have permission.", 403)
      );
    }

    next();
  };
};

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
  verifyToken,
  authenticateOwner,
  authenticateCustomer,
  authenticateAdmin,
  authenticateOptional,
  verifyOwnership,
  verifyCustomerOwnership
};