const rateLimit = require('express-rate-limit');
const { formatErrorResponse } = require('../utils/formatters');
const { validatePagination } = require('../utils/validators');

// ===================================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ===================================================
const globalErrorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  } else {
    console.error(`[${new Date().toISOString()}] ${err.name || 'Error'}: ${err.message} — ${req.method} ${req.originalUrl}`);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json(
      formatErrorResponse('Validation error', 400, errors)
    );
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return res.status(409).json(formatErrorResponse(message, 409));
  }

  // Handle Mongoose cast error (invalid ID format)
  if (err.name === 'CastError') {
    return res.status(400).json(
      formatErrorResponse('Invalid ID format', 400)
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      formatErrorResponse('Invalid token', 401)
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      formatErrorResponse('Token expired', 401)
    );
  }

  // Handle custom errors
  if (err.statusCode) {
    return res.status(err.statusCode).json(
      formatErrorResponse(err.message, err.statusCode, err.errors)
    );
  }

  // Handle generic errors — hide internal details in production
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = statusCode === 500 && isProduction
    ? 'Something went wrong. Please try again later.'
    : err.message || 'Something went wrong. Please try again later.';

  res.status(statusCode).json(
    formatErrorResponse(message, statusCode)
  );
};

// ===================================================
// ASYNC ERROR WRAPPER
// ===================================================
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ===================================================
// NOT FOUND HANDLER
// ===================================================
const notFoundHandler = (req, res) => {
  res.status(404).json(
    formatErrorResponse(`Route not found: ${req.originalUrl}`, 404)
  );
};

// ===================================================
// VALIDATE PAGINATION
// ===================================================
const validatePaginationParams = (req, res, next) => {
  const { page, limit } = validatePagination(req.query.page, req.query.limit);
  
  req.query.page = page;
  req.query.limit = limit;
  
  next();
};

// ===================================================
// VALIDATE MONGO OBJECTID
// ===================================================
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    if (!objectIdRegex.test(id)) {
      return res.status(400).json(
        formatErrorResponse(`Invalid ${paramName} format`, 400)
      );
    }

    next();
  };
};

// ===================================================
// RATE LIMITER MIDDLEWARE
// ===================================================
const rateLimiter = (maxRequests = 100, windowMs = 900000) =>
  rateLimit({
    max: maxRequests,
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json(
        formatErrorResponse('Too many requests. Please try again later.', 429)
      ),
  });

module.exports = {
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  validatePaginationParams,
  validateObjectId,
  rateLimiter,
};
