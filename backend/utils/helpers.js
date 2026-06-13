// utils/helpers.js
const crypto = require('crypto');

// ===================================================
// GENERATE RANDOM STRING (internal use)
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
// GENERATE UNIQUE ID
// ===================================================
const generateUniqueId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

// ===================================================
// GENERATE OTP
// ===================================================
const generateOTP = (length = 6) => {
  // Cryptographically secure — crypto.randomInt is unbiased and unpredictable,
  // unlike Math.random() which is not safe for security tokens.
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString();
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
// GET HOURS DIFFERENCE (used in calculateRefundAmount)
// ===================================================
const getHoursDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60));
};

// ===================================================
// CALCULATE REFUND AMOUNT
// ===================================================
const calculateRefundAmount = (totalAmount, cancelledAtTime, appointmentTime) => {
  const hoursBeforeAppointment = getHoursDifference(cancelledAtTime, appointmentTime);
  if (hoursBeforeAppointment >= 24) return totalAmount;
  if (hoursBeforeAppointment >= 1)  return Math.round((totalAmount * 50) / 100);
  return 0;
};

module.exports = {
  generateUniqueId,
  generateOTP,
  generateReferralCode,
  generateBookingId,
  calculateRefundAmount,
};
