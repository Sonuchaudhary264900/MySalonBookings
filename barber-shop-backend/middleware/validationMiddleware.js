const rateLimit = require('express-rate-limit');
const { formatErrorResponse } = require('../utils/formatters');
const { validatePagination } = require('../utils/validators');

// ===================================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ===================================================
const globalErrorHandler = (err, req, res, next) => {
  console.error('Error:', err);

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

  // Handle generic errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong. Please try again later.';

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
// VALIDATE REQUEST BODY
// ===================================================
const validateRequestBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return res.status(400).json(
        formatErrorResponse('Validation error', 400, errors)
      );
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

// ===================================================
// VALIDATE QUERY PARAMETERS
// ===================================================
const validateQueryParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((e) => e.message);
      return res.status(400).json(
        formatErrorResponse('Invalid query parameters', 400, errors)
      );
    }

    req.query = value;
    next();
  };
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
// VALIDATE REQUIRED FIELDS
// ===================================================
const validateRequiredFields = (fields = []) => {
  return (req, res, next) => {
    const missingFields = fields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json(
        formatErrorResponse(
          'Missing required fields',
          400,
          { missingFields }
        )
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

// ===================================================
// AUTHENTICATE & VALIDATE OWNER SALON
// ===================================================
const validateOwnerSalon = async (req, res, next) => {
  try {
    if (!req.owner) {
      return res.status(401).json(
        formatErrorResponse('Authentication required', 401)
      );
    }

    const Salon = require('../models/Salon');
    const salon = await Salon.findOne({ ownerId: req.owner._id });

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse('Salon not found', 404)
      );
    }

    if (!salon.isApproved) {
      return res.status(403).json(
        formatErrorResponse('Salon is not approved yet', 403)
      );
    }

    req.salon = salon;
    next();
  } catch (error) {
    res.status(500).json(
      formatErrorResponse('Error validating salon', 500)
    );
  }
};

// ===================================================
// VALIDATE SALON EXISTS
// ===================================================
const validateSalonExists = async (req, res, next) => {
  try {
    const Salon = require('../models/Salon');
    const salon = await Salon.findById(req.params.salonId || req.body.salonId);

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse('Salon not found', 404)
      );
    }

    if (!salon.isApproved) {
      return res.status(403).json(
        formatErrorResponse('Salon is not approved', 403)
      );
    }

    req.salon = salon;
    next();
  } catch (error) {
    res.status(500).json(
      formatErrorResponse('Error validating salon', 500)
    );
  }
};

// ===================================================
// VALIDATE BOOKING EXISTS
// ===================================================
const validateBookingExists = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json(
        formatErrorResponse('Booking not found', 404)
      );
    }

    req.booking = booking;
    next();
  } catch (error) {
    res.status(500).json(
      formatErrorResponse('Error validating booking', 500)
    );
  }
};

// ===================================================
// CHECK IF SERVICE BELONGS TO SALON
// ===================================================
const validateServiceBelongsToSalon = async (req, res, next) => {
  try {
    const Service = require('../models/Service');
    const service = await Service.findById(req.body.serviceId);

    if (!service) {
      return res.status(404).json(
        formatErrorResponse('Service not found', 404)
      );
    }

    if (service.salonId.toString() !== req.salon._id.toString()) {
      return res.status(403).json(
        formatErrorResponse('Service does not belong to this salon', 403)
      );
    }

    req.service = service;
    next();
  } catch (error) {
    res.status(500).json(
      formatErrorResponse('Error validating service', 500)
    );
  }
};

module.exports = {
  // Error handling
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,

  // Validation
  validateRequestBody,
  validateQueryParams,
  validatePaginationParams,
  validateObjectId,
  validateRequiredFields,

  // Rate limiting
  rateLimiter,

  // Business logic validation
  validateOwnerSalon,
  validateSalonExists,
  validateBookingExists,
  validateServiceBelongsToSalon,
};
