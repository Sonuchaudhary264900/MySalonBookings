// utils/validators.js
/*
  Validators Utility
  Centralized validation functions for:
  - Email, phone, password validation
  - Salon/service/barber data validation
  - Booking validation
  - Payment validation
  - File validation
*/

const constants = require('../config/constants');

// ===================================================
// EMAIL VALIDATION
// ===================================================
const validateEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// ===================================================
// PHONE NUMBER VALIDATION
// ===================================================
const validatePhone = (phone) => {
  // Indian mobile numbers only: +91 followed by 10 digits starting with 6, 7, 8, or 9
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// ===================================================
// PASSWORD VALIDATION
// ===================================================
const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return passwordRegex.test(password);
};

// ===================================================
// NAME VALIDATION
// ===================================================
const validateName = (name) => {
  if (!name || typeof name !== 'string') return false;
  if (name.trim().length < 2) return false;
  if (name.trim().length > 100) return false;
  // Only letters, numbers, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name);
};

// ===================================================
// PINCODE VALIDATION (India)
// ===================================================
const validatePincode = (pincode) => {
  const pincodeRegex = /^\d{6}$/;
  return pincodeRegex.test(pincode);
};

// ===================================================
// IFSC CODE VALIDATION (India)
// ===================================================
const validateIFSC = (ifsc) => {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc);
};

// ===================================================
// AADHAR NUMBER VALIDATION (India)
// ===================================================
const validateAadhar = (aadhar) => {
  const aadharRegex = /^\d{12}$/;
  return aadharRegex.test(aadhar);
};

// ===================================================
// PAN VALIDATION (India)
// ===================================================
const validatePAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

// ===================================================
// TIME VALIDATION (HH:MM format)
// ===================================================
const validateTime = (time) => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(time)) return false;

  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const minute = parseInt(minutes);

  // Check if time is within working hours
  if (hour < constants.WORKING_HOURS.MIN_HOUR || hour > constants.WORKING_HOURS.MAX_HOUR) {
    return false;
  }

  return true;
};

// ===================================================
// PRICE VALIDATION
// ===================================================
const validatePrice = (price) => {
  if (typeof price !== 'number') return false;
  if (price < 0) return false;
  if (price > 999999) return false; // Max 10 lakh
  return true;
};

// ===================================================
// DURATION VALIDATION
// ===================================================
const validateDuration = (duration) => {
  if (typeof duration !== 'number') return false;
  if (duration < 1) return false;
  if (duration > 480) return false; // Max 8 hours
  return true;
};

// ===================================================
// RATING VALIDATION
// ===================================================
const validateRating = (rating) => {
  if (typeof rating !== 'number') return false;
  if (rating < constants.RATING.MIN || rating > constants.RATING.MAX) return false;
  return true;
};

// ===================================================
// REVIEW TEXT VALIDATION
// ===================================================
const validateReviewText = (text) => {
  if (!text || typeof text !== 'string') return false;
  if (text.trim().length < constants.RATING.MIN_REVIEW_LENGTH) return false;
  if (text.trim().length > constants.RATING.MAX_REVIEW_LENGTH) return false;
  return true;
};

// ===================================================
// GENDER VALIDATION
// ===================================================
const validateGender = (gender) => {
  return ['male', 'female'].includes(gender);
};

// ===================================================
// FILE VALIDATION
// ===================================================
const validateFile = (file) => {
  if (!file) return { valid: false, error: 'No file provided' };

  // Check file size
  if (file.size > constants.FILE_UPLOAD.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${constants.FILE_UPLOAD.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  // Check file type
  if (!constants.FILE_UPLOAD.ALLOWED_FORMATS.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file format. Only JPEG, PNG, and WebP allowed',
    };
  }

  return { valid: true };
};

// ===================================================
// BOOKING DATA VALIDATION
// ===================================================
const validateBookingData = (data) => {
  const errors = [];

  if (!data.salonId) errors.push('Salon is required');
  const hasService = data.serviceId || (Array.isArray(data.serviceIds) && data.serviceIds.length > 0);
  if (!hasService) errors.push('At least one service is required');
  if (!data.appointmentTime) errors.push('Appointment time is required');
  if (!data.paymentMethod || !['online', 'cash', 'wallet'].includes(data.paymentMethod)) {
    errors.push('Valid payment method is required');
  }

  // Validate appointment date is today or in future (compare date strings to avoid timezone issues)
  if (data.appointmentDate) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (data.appointmentDate < todayStr) {
      errors.push('Appointment date must be today or in the future');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ===================================================
// SALON DATA VALIDATION
// ===================================================
const validateSalonData = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 3) {
    errors.push('Salon name must be at least 3 characters');
  }

  if (!data.phone || !validatePhone(data.phone)) {
    errors.push('Valid phone number with country code is required');
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('Valid email format is required');
  }

  if (!data.address || data.address.trim().length < 5) {
    errors.push('Complete address is required');
  }

  if (!data.city || data.city.trim().length < 2) {
    errors.push('City is required');
  }

  // location coordinates are resolved server-side via Google Maps — not validated here

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ===================================================
// SERVICE DATA VALIDATION
// ===================================================
const validateServiceData = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Service name is required');
  }

  if (!validatePrice(data.basePrice)) {
    errors.push('Valid price is required');
  }

  if (!validateDuration(data.duration)) {
    errors.push('Valid duration is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ===================================================
// OWNER REGISTRATION DATA VALIDATION
// ===================================================
const validateOwnerRegistration = (data) => {
  const errors = [];

  if (!data.phone || !validatePhone(data.phone)) {
    errors.push('Valid phone number with country code is required');
  }

  if (!data.name || !validateName(data.name)) {
    errors.push('Valid name is required');
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || !validatePassword(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ===================================================
// CUSTOMER REGISTRATION DATA VALIDATION
// ===================================================
const validateCustomerRegistration = (data) => {
  const errors = [];

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Valid phone number with country code is required');
  }

  if (!data.name || !validateName(data.name)) {
    errors.push('Valid name is required');
  }

  if (!data.gender || !validateGender(data.gender)) {
    errors.push('Valid gender is required');
  }

  if (data.password && !validatePassword(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ===================================================
// OTP VALIDATION
// ===================================================
const validateOTP = (otp) => {
  if (!otp || typeof otp !== 'string') return false;
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

// ===================================================
// PAGINATION VALIDATION
// ===================================================
const validatePagination = (page = 1, limit = 10) => {
  let validPage = parseInt(page);
  let validLimit = parseInt(limit);

  if (isNaN(validPage) || validPage < 1) validPage = 1;
  if (isNaN(validLimit) || validLimit < 1) validLimit = 10;
  if (validLimit > constants.PAGINATION.MAX_LIMIT) {
    validLimit = constants.PAGINATION.MAX_LIMIT;
  }

  return { page: validPage, limit: validLimit };
};

// ===================================================
// COUPON CODE VALIDATION
// ===================================================
const validateCouponCode = (code) => {
  if (!code || typeof code !== 'string') return false;
  const codeRegex = /^[A-Z0-9]{4,20}$/;
  return codeRegex.test(code.toUpperCase());
};

// ===================================================
// COORDINATES VALIDATION
// ===================================================
const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  return true;
};

// ===================================================
// DISTANCE BETWEEN COORDINATES (Haversine formula)
// ===================================================
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  return distance;
};

module.exports = {
  // Email, phone, password
  validateEmail,
  validatePhone,
  validatePassword,
  validateName,

  // Location & banking
  validatePincode,
  validateIFSC,
  validateAadhar,
  validatePAN,
  validateCoordinates,

  // Time & price
  validateTime,
  validatePrice,
  validateDuration,

  // Ratings & reviews
  validateRating,
  validateReviewText,

  // Other
  validateGender,
  validateFile,
  validateOTP,
  validateCouponCode,

  // Complex validation
  validateBookingData,
  validateSalonData,
  validateServiceData,
  validateOwnerRegistration,
  validateCustomerRegistration,

  // Pagination & distance
  validatePagination,
  calculateDistance,
};
