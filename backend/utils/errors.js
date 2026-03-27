// utils/errors.js
/*
  Custom Error Classes
  Standardized error handling throughout the application
*/

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      statusCode: this.statusCode,
      message: this.message,
      timestamp: this.timestamp,
    };
  }
}

// 400 - Bad Request
class BadRequestError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

// 401 - Unauthorized
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

// 403 - Forbidden
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

// 404 - Not Found
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// 409 - Conflict (Duplicate)
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

// 422 - Unprocessable Entity (Validation)
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

// 429 - Too Many Requests
class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// 500 - Internal Server Error
class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

// Payment Error
class PaymentError extends AppError {
  constructor(message, statusCode = 402) {
    super(message, statusCode);
    this.name = 'PaymentError';
  }
}

// Database Error
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

// External Service Error (Cloudinary, Twilio, etc.)
class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(`${service} service error: ${message}`, 503);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

// Authentication Error
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

// Token Error
class TokenError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401);
    this.name = 'TokenError';
  }
}

// OTP Error
class OTPError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'OTPError';
  }
}

// Booking Error
class BookingError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'BookingError';
  }
}

// Salon Error
class SalonError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'SalonError';
  }
}

// Usage Examples:
/*
throw new BadRequestError('Invalid email format');
throw new UnauthorizedError('Please login first');
throw new NotFoundError('Salon not found');
throw new ConflictError('Email already registered');
throw new ValidationError('Validation failed', [{ field: 'email', message: 'Invalid format' }]);
throw new PaymentError('Payment processing failed');
throw new ExternalServiceError('Twilio', 'SMS sending failed');
throw new TokenError('Token expired');
throw new OTPError('Invalid OTP');
*/

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  PaymentError,
  DatabaseError,
  ExternalServiceError,
  AuthenticationError,
  TokenError,
  OTPError,
  BookingError,
  SalonError,
};
