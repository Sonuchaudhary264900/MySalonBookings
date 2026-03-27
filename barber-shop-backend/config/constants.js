// config/constants.js
/*
  Application Constants
  Used throughout the application
  Keep all magic numbers and strings here
*/

module.exports = {
  // ===== ROLES =====
  ROLES: {
    OWNER: 'owner',
    CUSTOMER: 'customer',
    ADMIN: 'admin',
  },

  // ===== OWNER STATUS =====
  OWNER_STATUS: {
    MOBILE_VERIFIED: 'mobile_verified',
    SALON_REGISTERED: 'salon_registered',
    APPROVED: 'approved',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BANNED: 'banned',
  },

  // ===== SALON APPROVAL STATUS =====
  SALON_APPROVAL_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  // ===== BOOKING STATUS =====
  BOOKING_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  // ===== PAYMENT STATUS =====
  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },

  // ===== PAYMENT METHODS =====
  PAYMENT_METHODS: {
    ONLINE: 'online',
    CASH: 'cash',
    WALLET: 'wallet',
  },

  // ===== GENDER =====
  GENDER: {
    MALE: 'male',
    FEMALE: 'female',
  },

  // ===== OTP SETTINGS =====
  OTP: {
    LENGTH: 6,                          // OTP length in digits
    EXPIRY_TIME: 10 * 60 * 1000,        // 10 minutes in milliseconds
    RESEND_WAIT_TIME: 30 * 1000,        // 30 seconds before resend
    MAX_ATTEMPTS: 5,                    // Max wrong attempts before blocking
  },

  // ===== JWT SETTINGS =====
  JWT: {
    OWNER_EXPIRY: '24h',
    CUSTOMER_EXPIRY: '24h',
    ADMIN_EXPIRY: '24h',
    REFRESH_TOKEN_EXPIRY: '7d',
  },

  // ===== PAGINATION =====
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  // ===== QUEUE SETTINGS =====
  QUEUE: {
    AVERAGE_SERVICE_DURATION: 30,       // minutes
    REMINDER_TIME_BEFORE: 10,           // minutes before appointment
  },

  // ===== RATING & REVIEW =====
  RATING: {
    MIN: 1,
    MAX: 5,
    MIN_REVIEW_LENGTH: 10,
    MAX_REVIEW_LENGTH: 1000,
  },

  // ===== DISTANCE =====
  DISTANCE: {
    DEFAULT_RADIUS: 10,                 // 10 km radius
    UNIT: 'km',
  },

  // ===== FILE UPLOAD =====
  FILE_UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024,     // 5 MB
    ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
    CLOUDINARY_FOLDER: 'my-salon-bookings',
    MAX_PHOTOS: 10,
  },

  // ===== WORKING HOURS =====
  WORKING_HOURS: {
    MIN_HOUR: 6,                        // 6 AM
    MAX_HOUR: 23,                       // 11 PM
    DEFAULT_OPEN: '09:00',
    DEFAULT_CLOSE: '18:00',
  },

  // ===== SUBSCRIPTION PLANS =====
  SUBSCRIPTION_PLANS: {
    FREE: 'free',
    BASIC: 'basic',
    PREMIUM: 'premium',
  },

  // ===== ERROR CODES =====
  ERROR_CODES: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    INVALID_OTP: 'INVALID_OTP',
    OTP_EXPIRED: 'OTP_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    SERVER_ERROR: 'SERVER_ERROR',
    SALON_NOT_APPROVED: 'SALON_NOT_APPROVED',
    INVALID_TIME_SLOT: 'INVALID_TIME_SLOT',
    BOOKING_CANCELLED: 'BOOKING_CANCELLED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
  },

  // ===== HTTP STATUS CODES =====
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // ===== MESSAGES =====
  MESSAGES: {
    GENERIC_ERROR: 'Something went wrong. Please try again later.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    OTP_SENT: 'OTP sent successfully. Check your email/SMS.',
    OTP_VERIFIED: 'OTP verified successfully.',
    LOGIN_SUCCESS: 'Login successful.',
    LOGOUT_SUCCESS: 'Logout successful.',
    BOOKING_CONFIRMED: 'Booking confirmed successfully.',
    BOOKING_CANCELLED: 'Booking cancelled successfully.',
  },

  // ===== EMAIL TEMPLATES =====
  EMAIL_SUBJECTS: {
    OTP: 'Your OTP for My Salon Bookings',
    BOOKING_CONFIRMATION: 'Booking Confirmation - My Salon Bookings',
    BOOKING_REMINDER: 'Appointment Reminder - My Salon Bookings',
    SALON_APPROVAL: 'Salon Approved - Welcome to My Salon Bookings',
    SALON_REJECTION: 'Salon Application - Review Required',
    PASSWORD_RESET: 'Password Reset - My Salon Bookings',
  },

  // ===== ADMIN SETTINGS =====
  ADMIN: {
    APPROVAL_AUTO_REJECT_DAYS: 30,      // Auto reject after 30 days if not approved
  },

  // ===== MEMBERSHIP TIERS =====
  MEMBERSHIP_TIERS: {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
  },

  // ===== DAYS OF WEEK =====
  DAYS_OF_WEEK: [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ],

  // ===== SERVICE CATEGORIES =====
  SERVICE_CATEGORIES: {
    HAIRCUT: 'haircut',
    BEARD_TRIM: 'beard_trim',
    COLORING: 'coloring',
    TREATMENT: 'treatment',
    STYLING: 'styling',
    SHAVING: 'shaving',
  },

  // ===== CANCELLATION POLICIES =====
  CANCELLATION_POLICY: {
    REFUND_PERCENTAGE: 100,             // 100% refund if cancelled 24+ hours before
    PARTIAL_REFUND_PERCENTAGE: 50,      // 50% refund if cancelled 1-24 hours before
    NO_REFUND_PERCENTAGE: 0,            // No refund if cancelled within 1 hour
  },
};
