// utils/helpers.js
/*
  Helpers Utility
  Common helper functions for:
  - ID generation
  - Random string generation
  - Array/object manipulation
  - Date calculations
  - Status checks
*/

const constants = require('../config/constants');

// ===================================================
// GENERATE UNIQUE ID
// ===================================================
const generateUniqueId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

// ===================================================
// GENERATE RANDOM STRING
// ===================================================
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ===================================================
// GENERATE RANDOM OTP
// ===================================================
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return otp;
};

// ===================================================
// GENERATE REFERRAL CODE
// ===================================================
const generateReferralCode = (customerId) => {
  const idPart = customerId.toString().slice(-6).toUpperCase();
  const random = generateRandomString(4);
  return `REF_${idPart}_${random}`;
};

// ===================================================
// GENERATE BOOKING ID
// ===================================================
const generateBookingId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `BOOK-${timestamp}-${random}`;
};

// ===================================================
// GENERATE TRANSACTION ID
// ===================================================
const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = generateRandomString(6);
  return `TXN-${timestamp}-${random}`;
};

// ===================================================
// CHECK IF DATE IS IN FUTURE
// ===================================================
const isDateInFuture = (date) => {
  const appointmentDate = new Date(date);
  const now = new Date();
  return appointmentDate > now;
};

// ===================================================
// CHECK IF DATE IS IN PAST
// ===================================================
const isDateInPast = (date) => {
  const appointmentDate = new Date(date);
  const now = new Date();
  return appointmentDate < now;
};

// ===================================================
// GET DAYS DIFFERENCE
// ===================================================
const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// ===================================================
// GET HOURS DIFFERENCE
// ===================================================
const getHoursDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  return diffHours;
};

// ===================================================
// GET MINUTES DIFFERENCE
// ===================================================
const getMinutesDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffMinutes = Math.ceil(diffTime / (1000 * 60));
  return diffMinutes;
};

// ===================================================
// IS TIME AVAILABLE (between start and end)
// ===================================================
const isTimeAvailable = (time, startTime, endTime) => {
  return time >= startTime && time <= endTime;
};

// ===================================================
// SORT ARRAY BY PROPERTY
// ===================================================
const sortByProperty = (array, property, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (a[property] < b[property]) {
      return order === 'asc' ? -1 : 1;
    }
    if (a[property] > b[property]) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

// ===================================================
// GROUP ARRAY BY PROPERTY
// ===================================================
const groupByProperty = (array, property) => {
  return array.reduce((groups, item) => {
    const key = item[property];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
};

// ===================================================
// FILTER ARRAY BY MULTIPLE CONDITIONS
// ===================================================
const filterByConditions = (array, conditions = {}) => {
  return array.filter((item) => {
    return Object.keys(conditions).every((key) => item[key] === conditions[key]);
  });
};

// ===================================================
// DEEP CLONE OBJECT
// ===================================================
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// ===================================================
// MERGE OBJECTS
// ===================================================
const mergeObjects = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (typeof target === 'object' && typeof source === 'object') {
    for (const key in source) {
      if (typeof source[key] === 'object') {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeObjects(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeObjects(target, ...sources);
};

// ===================================================
// GET PROPERTY VALUES FROM ARRAY
// ===================================================
const getPropertyValues = (array, property) => {
  return array.map((item) => item[property]);
};

// ===================================================
// REMOVE DUPLICATES FROM ARRAY
// ===================================================
const removeDuplicates = (array) => {
  return [...new Set(array)];
};

// ===================================================
// REMOVE DUPLICATES FROM ARRAY OF OBJECTS
// ===================================================
const removeDuplicateObjects = (array, property) => {
  return array.filter((item, index, self) => index === self.findIndex((t) => t[property] === item[property]));
};

// ===================================================
// CALCULATE REFUND AMOUNT
// ===================================================
const calculateRefundAmount = (totalAmount, cancelledAtTime, appointmentTime) => {
  const hoursBeforeAppointment = getHoursDifference(cancelledAtTime, appointmentTime);

  if (hoursBeforeAppointment >= 24) {
    // Full refund if cancelled 24+ hours before
    return totalAmount;
  } else if (hoursBeforeAppointment >= 1) {
    // 50% refund if cancelled 1-24 hours before
    return Math.round((totalAmount * 50) / 100);
  } else {
    // No refund if cancelled within 1 hour
    return 0;
  }
};

// ===================================================
// CALCULATE LOYALTY POINTS
// ===================================================
const calculateLoyaltyPoints = (totalAmount) => {
  // 1 point per rupee (can be adjusted)
  return Math.round(totalAmount);
};

// ===================================================
// GET NEXT AVAILABLE TIME SLOT
// ===================================================
const getNextAvailableTimeSlot = (currentTime, duration, salmonWorkingHours) => {
  // Very basic implementation - should be improved
  const [hours, minutes] = currentTime.split(':');
  let slotMinutes = parseInt(hours) * 60 + parseInt(minutes) + duration;

  if (slotMinutes > 24 * 60) {
    return null; // Not available today
  }

  const slotHours = Math.floor(slotMinutes / 60);
  const slotMins = slotMinutes % 60;

  return `${String(slotHours).padStart(2, '0')}:${String(slotMins).padStart(2, '0')}`;
};

// ===================================================
// GET DAY NAME FROM DATE
// ===================================================
const getDayName = (date) => {
  const dayIndex = new Date(date).getDay();
  return constants.DAYS_OF_WEEK[dayIndex];
};

// ===================================================
// IS SALON OPEN ON GIVEN DATE
// ===================================================
const isSalonOpenOnDate = (date, workingHours) => {
  const dayName = getDayName(date).toLowerCase();
  const dayHours = workingHours[dayName];

  if (!dayHours || dayHours.isClosed) {
    return false;
  }

  return true;
};

// ===================================================
// CALCULATE DISTANCE BASED ON LAT/LONG (simple)
// ===================================================
const getDistance = (lat1, lon1, lat2, lon2) => {
  // Simplified - doesn't account for Earth's curvature
  const latDiff = Math.abs(lat2 - lat1);
  const lonDiff = Math.abs(lon2 - lon1);
  return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // Approximate km
};

// ===================================================
// IS VALID MONGODB OBJECTID
// ===================================================
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// ===================================================
// CONVERT ARRAY TO PAGINATION
// ===================================================
const paginateArray = (array, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: array.slice(start, end),
    total: array.length,
    page,
    limit,
    pages: Math.ceil(array.length / limit),
    hasMore: end < array.length,
  };
};

// ===================================================
// RETRY ASYNC FUNCTION
// ===================================================
const retryAsync = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ===================================================
// DELAY EXECUTION
// ===================================================
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ===================================================
// SEND ASYNC NOTIFICATION (non-blocking)
// ===================================================
const sendNotificationAsync = async (notificationFn) => {
  // Send notification without waiting for response
  setImmediate(() => {
    notificationFn().catch((error) => {
      console.error('Error sending notification:', error);
    });
  });
};

module.exports = {
  // ID & String generation
  generateUniqueId,
  generateRandomString,
  generateOTP,
  generateReferralCode,
  generateBookingId,
  generateTransactionId,

  // Date calculations
  isDateInFuture,
  isDateInPast,
  getDaysDifference,
  getHoursDifference,
  getMinutesDifference,
  isTimeAvailable,
  getDayName,

  // Array operations
  sortByProperty,
  groupByProperty,
  filterByConditions,
  getPropertyValues,
  removeDuplicates,
  removeDuplicateObjects,

  // Object operations
  deepClone,
  mergeObjects,

  // Business logic
  calculateRefundAmount,
  calculateLoyaltyPoints,
  getNextAvailableTimeSlot,
  isSalonOpenOnDate,
  getDistance,

  // Validation
  isValidObjectId,

  // Utilities
  paginateArray,
  retryAsync,
  delay,
  sendNotificationAsync,
};
