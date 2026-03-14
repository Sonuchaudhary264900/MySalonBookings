// utils/formatters.js
/*
  Formatters Utility
  Functions to format:
  - API responses
  - Dates and times
  - Currency and amounts
  - Phone numbers and emails
  - Data structures
*/

const constants = require('../config/constants');

// ===================================================
// SUCCESS RESPONSE FORMATTER
// ===================================================
const formatSuccessResponse = (data = null, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

// ===================================================
// ERROR RESPONSE FORMATTER
// ===================================================
const formatErrorResponse = (message = 'Error', statusCode = 500, errors = null) => {
  return {
    success: false,
    statusCode,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };
};

// ===================================================
// PAGINATION RESPONSE FORMATTER
// ===================================================
const formatPaginatedResponse = (data = [], total = 0, page = 1, limit = 10) => {
  const pages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages,
      hasMore: page < pages,
    },
    timestamp: new Date().toISOString(),
  };
};

// ===================================================
// DATE FORMATTING
// ===================================================
const formatDate = (date, format = 'DD-MM-YYYY') => {
  if (!date) return '';

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  const formats = {
    'DD-MM-YYYY': `${day}-${month}-${year}`,
    'MM-DD-YYYY': `${month}-${day}-${year}`,
    'YYYY-MM-DD': `${year}-${month}-${day}`,
    'DD-MM-YYYY HH:MM': `${day}-${month}-${year} ${hours}:${minutes}`,
    'DD-MM-YYYY HH:MM:SS': `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`,
    'HH:MM': `${hours}:${minutes}`,
    'HH:MM:SS': `${hours}:${minutes}:${seconds}`,
  };

  return formats[format] || d.toString();
};

// ===================================================
// TIME FORMATTING
// ===================================================
const formatTime = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
};

// ===================================================
// CURRENCY FORMATTING
// ===================================================
const formatCurrency = (amount, currency = 'INR') => {
  if (!amount && amount !== 0) return '';

  const formatMap = {
    INR: (amount) => `₹${amount.toLocaleString('en-IN')}`,
  };

  return (formatMap[currency] || formatMap['INR'])(amount);
};

// ===================================================
// PHONE NUMBER FORMATTING
// ===================================================
const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // If already in +91... format
  if (phone.startsWith('+')) {
    return phone;
  }

  // If 10 digit Indian number
  if (phone.length === 10) {
    return `+91${phone}`;
  }

  return phone;
};

// ===================================================
// PHONE NUMBER MASKING
// ===================================================
const maskPhoneNumber = (phone) => {
  if (!phone) return '';

  // Show only last 4 digits: +91 XXXX XXXX XX
  const visible = phone.slice(-4);
  const masked = phone.slice(0, -4) + 'X'.repeat(Math.max(0, phone.length - 4));

  return `${masked}${visible}`;
};

// ===================================================
// EMAIL MASKING
// ===================================================
const maskEmail = (email) => {
  if (!email) return '';

  const [name, domain] = email.split('@');
  if (!name || !domain) return email;

  const visibleName = name.slice(0, 2) + '*'.repeat(Math.max(1, name.length - 2));
  return `${visibleName}@${domain}`;
};

// ===================================================
// AADHAR MASKING
// ===================================================
const maskAadhar = (aadhar) => {
  if (!aadhar) return '';

  // Show only last 4 digits: XXXX XXXX XXXX
  return `XXXX XXXX ${aadhar.slice(-4)}`;
};

// ===================================================
// BANK ACCOUNT MASKING
// ===================================================
const maskBankAccount = (accountNumber) => {
  if (!accountNumber) return '';

  const visible = accountNumber.slice(-4);
  const masked = 'X'.repeat(Math.max(1, accountNumber.length - 4)) + visible;

  // Format with spaces
  return masked.replace(/\B(?=(.{4})+(?!.))/g, ' ');
};

// ===================================================
// FORMAT USER PROFILE
// ===================================================
const formatUserProfile = (user, type = 'customer') => {
  if (type === 'customer') {
    return {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      gender: user.gender,
      profilePhoto: user.profilePhoto,
      totalBookings: user.totalBookings,
      completedBookings: user.completedBookings,
      loyaltyPoints: user.loyaltyPoints,
      membershipTier: user.membershipTier,
      averageRating: user.averageRating,
      createdAt: formatDate(user.createdAt, 'DD-MM-YYYY'),
    };
  }

  if (type === 'owner') {
    return {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      businessName: user.businessName,
      profilePhoto: user.profilePhoto,
      status: user.status,
      approvalStatus: user.approvalStatus,
      salonId: user.salonId,
      totalBookings: user.totalBookings,
      totalRevenue: formatCurrency(user.totalRevenue),
      averageRating: user.averageRating,
      createdAt: formatDate(user.createdAt, 'DD-MM-YYYY'),
    };
  }

  return user;
};

// ===================================================
// FORMAT BOOKING DETAILS
// ===================================================
const formatBookingDetails = (booking) => {
  return {
    bookingId: booking.bookingId,
    status: booking.status,
    appointmentDate: formatDate(booking.appointmentDate, 'DD-MM-YYYY'),
    appointmentTime: booking.appointmentTime,
    serviceName: booking.serviceName,
    salonName: booking.salonName,
    barberName: booking.barberName,
    totalAmount: formatCurrency(booking.totalAmount),
    paymentStatus: booking.paymentStatus,
    rating: booking.rating,
    createdAt: formatDate(booking.createdAt, 'DD-MM-YYYY HH:MM'),
  };
};

// ===================================================
// FORMAT SALON LIST
// ===================================================
const formatSalonList = (salons) => {
  return salons.map((salon) => ({
    id: salon._id,
    name: salon.name,
    address: salon.address,
    phone: salon.phone,
    photos: salon.photos,
    logo: salon.logo,
    city: salon.city,
    distance: salon.distance || 'N/A', // If calculated
    averageRating: salon.averageRating,
    totalReviews: salon.totalReviews,
    isOpen: salon.openNow,
    acceptsOnlinePayment: salon.acceptsOnlinePayment,
  }));
};

// ===================================================
// FORMAT SERVICE DETAILS
// ===================================================
const formatServiceDetails = (service) => {
  return {
    id: service._id,
    name: service.name,
    description: service.description,
    category: service.category,
    price: formatCurrency(service.basePrice),
    duration: formatTime(service.duration),
    durationMinutes: service.duration,
    averageRating: service.averageRating,
    totalReviews: service.totalReviews,
    photos: service.photos,
  };
};

// ===================================================
// FORMAT REVIEW DETAILS
// ===================================================
const formatReviewDetails = (review) => {
  return {
    id: review._id,
    salonRating: review.salonRating,
    barberRating: review.barberRating,
    serviceRating: review.serviceRating,
    title: review.title,
    reviewText: review.reviewText,
    photos: review.photos,
    createdAt: formatDate(review.createdAt, 'DD-MM-YYYY'),
    isVerified: review.isVerified,
    helpfulCount: review.helpfulCount,
  };
};

// ===================================================
// FORMAT QUEUE STATUS
// ===================================================
const formatQueueStatus = (queue) => {
  return {
    salonId: queue.salonId,
    date: formatDate(queue.date, 'DD-MM-YYYY'),
    totalWaiting: queue.totalWaiting,
    totalServed: queue.totalServed,
    averageWaitTime: formatTime(queue.averageWaitTime),
    currentlyServing: queue.queue.find((q) => q.status === 'in_progress'),
    nextInQueue: queue.queue.find((q) => q.status === 'waiting'),
  };
};

// ===================================================
// FORMAT STATS
// ===================================================
const formatStats = (stats) => {
  return {
    totalBookings: stats.totalBookings || 0,
    completedBookings: stats.completedBookings || 0,
    cancelledBookings: stats.cancelledBookings || 0,
    totalRevenue: formatCurrency(stats.totalRevenue || 0),
    averageRating: stats.averageRating || 0,
    totalReviews: stats.totalReviews || 0,
    conversionRate:
      stats.totalBookings > 0
        ? `${((stats.completedBookings / stats.totalBookings) * 100).toFixed(2)}%`
        : 'N/A',
  };
};

// ===================================================
// TRUNCATE TEXT
// ===================================================
const truncateText = (text, length = 100) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// ===================================================
// CAPITALIZE STRING
// ===================================================
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// ===================================================
// FORMAT FULL NAME
// ===================================================
const formatFullName = (firstName, lastName = '') => {
  if (lastName) {
    return `${capitalize(firstName)} ${capitalize(lastName)}`;
  }
  return capitalize(firstName);
};

module.exports = {
  // Response formatters
  formatSuccessResponse,
  formatErrorResponse,
  formatPaginatedResponse,

  // Date & time
  formatDate,
  formatTime,

  // Currency & numbers
  formatCurrency,

  // Privacy (masking)
  formatPhoneNumber,
  maskPhoneNumber,
  maskEmail,
  maskAadhar,
  maskBankAccount,

  // Complex formatters
  formatUserProfile,
  formatBookingDetails,
  formatSalonList,
  formatServiceDetails,
  formatReviewDetails,
  formatQueueStatus,
  formatStats,

  // Text utilities
  truncateText,
  capitalize,
  formatFullName,
};
