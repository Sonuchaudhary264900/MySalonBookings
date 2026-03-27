// utils/messages.js
/*
  Messages Constants
  Standardized messages for:
  - API responses
  - Error messages
  - Success messages
  - Validation messages
*/

module.exports = {
  // ===================================================
  // AUTH MESSAGES
  // ===================================================
  AUTH: {
    // Success
    OTP_SENT: 'OTP sent successfully. Check your email/SMS.',
    OTP_VERIFIED: 'OTP verified successfully.',
    LOGIN_SUCCESS: 'Login successful.',
    LOGOUT_SUCCESS: 'Logout successful.',
    REGISTRATION_SUCCESS: 'Registration successful.',
    PASSWORD_CHANGED: 'Password changed successfully.',
    PASSWORD_RESET_SENT: 'Password reset link sent to your email.',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully.',

    // Errors
    INVALID_CREDENTIALS: 'Invalid email/phone or password.',
    INVALID_OTP: 'Invalid OTP. Please try again.',
    OTP_EXPIRED: 'OTP has expired. Request a new one.',
    OTP_MAX_ATTEMPTS: 'Maximum OTP attempts exceeded. Please try again later.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied.',
    USER_NOT_FOUND: 'User not found.',
    EMAIL_ALREADY_EXISTS: 'Email already registered.',
    PHONE_ALREADY_EXISTS: 'Phone number already registered.',
    WEAK_PASSWORD: 'Password must be at least 6 characters with letters and numbers.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.',
  },

  // ===================================================
  // SALON MESSAGES
  // ===================================================
  SALON: {
    // Success
    SALON_CREATED: 'Salon registered successfully. Pending admin approval.',
    SALON_UPDATED: 'Salon details updated successfully.',
    SALON_DELETED: 'Salon deleted successfully.',
    SALON_APPROVED: 'Salon approved successfully.',
    SALON_REJECTED: 'Salon rejected.',

    // Errors
    SALON_NOT_FOUND: 'Salon not found.',
    SALON_NOT_APPROVED: 'Salon is not approved yet.',
    SALON_INACTIVE: 'Salon is currently inactive.',
    UNAUTHORIZED_SALON_ACCESS: 'You do not have access to this salon.',
    SALON_ALREADY_EXISTS: 'Salon already exists.',
  },

  // ===================================================
  // SERVICE MESSAGES
  // ===================================================
  SERVICE: {
    // Success
    SERVICE_CREATED: 'Service added successfully.',
    SERVICE_UPDATED: 'Service updated successfully.',
    SERVICE_DELETED: 'Service deleted successfully.',

    // Errors
    SERVICE_NOT_FOUND: 'Service not found.',
    INVALID_SERVICE_DATA: 'Invalid service data provided.',
    SERVICE_ALREADY_EXISTS: 'Service already exists for this salon.',
  },

  // ===================================================
  // STYLIST / STAFF MESSAGES
  // ===================================================
  BARBER: {
    // Success
    BARBER_CREATED: 'Stylist added successfully.',
    BARBER_UPDATED: 'Stylist details updated successfully.',
    BARBER_DELETED: 'Stylist removed successfully.',

    // Errors
    BARBER_NOT_FOUND: 'Stylist not found.',
    BARBER_NOT_AVAILABLE: 'Stylist is not available.',
  },

  // ===================================================
  // BOOKING MESSAGES
  // ===================================================
  BOOKING: {
    // Success
    BOOKING_CREATED: 'Booking confirmed successfully.',
    BOOKING_UPDATED: 'Booking updated successfully.',
    BOOKING_CONFIRMED: 'Booking confirmed.',
    BOOKING_CANCELLED: 'Booking cancelled successfully.',
    BOOKING_COMPLETED: 'Booking completed.',

    // Errors
    BOOKING_NOT_FOUND: 'Booking not found.',
    BOOKING_EXPIRED: 'Booking time has passed.',
    BOOKING_CANCELLED_ALREADY: 'Booking is already cancelled.',
    BOOKING_COMPLETED_ALREADY: 'Booking is already completed.',
    INVALID_TIME_SLOT: 'Selected time slot is not available.',
    BARBER_UNAVAILABLE: 'Selected barber is not available at this time.',
    INVALID_BOOKING_DATA: 'Invalid booking data provided.',
  },

  // ===================================================
  // PAYMENT MESSAGES
  // ===================================================
  PAYMENT: {
    // Success
    PAYMENT_INITIATED: 'Payment initiated. Please complete payment.',
    PAYMENT_SUCCESSFUL: 'Payment successful.',
    REFUND_INITIATED: 'Refund initiated. You will receive it within 3-5 business days.',
    REFUND_SUCCESSFUL: 'Refund processed successfully.',

    // Errors
    PAYMENT_FAILED: 'Payment failed. Please try again.',
    PAYMENT_INVALID_SIGNATURE: 'Payment verification failed.',
    INSUFFICIENT_BALANCE: 'Insufficient wallet balance.',
    INVALID_PAYMENT_METHOD: 'Invalid payment method.',
    PAYMENT_ALREADY_PROCESSED: 'Payment already processed.',
  },

  // ===================================================
  // REVIEW MESSAGES
  // ===================================================
  REVIEW: {
    // Success
    REVIEW_SUBMITTED: 'Review submitted successfully.',
    REVIEW_UPDATED: 'Review updated successfully.',
    REVIEW_DELETED: 'Review deleted successfully.',

    // Errors
    REVIEW_NOT_FOUND: 'Review not found.',
    REVIEW_ALREADY_EXISTS: 'You have already reviewed this booking.',
    INVALID_RATING: 'Rating must be between 1 and 5.',
  },

  // ===================================================
  // COUPON MESSAGES
  // ===================================================
  COUPON: {
    // Success
    COUPON_APPLIED: 'Coupon applied successfully.',
    COUPON_REMOVED: 'Coupon removed.',

    // Errors
    COUPON_NOT_FOUND: 'Coupon not found.',
    COUPON_INVALID: 'This coupon code is invalid or expired.',
    COUPON_EXPIRED: 'This coupon has expired.',
    COUPON_USED: 'You have already used this coupon maximum times.',
    COUPON_MIN_AMOUNT: 'Minimum order amount not met for this coupon.',
  },

  // ===================================================
  // PROFILE MESSAGES
  // ===================================================
  PROFILE: {
    // Success
    PROFILE_UPDATED: 'Profile updated successfully.',
    PROFILE_PHOTO_UPDATED: 'Profile photo updated successfully.',
    LOCATION_ADDED: 'Location added successfully.',
    LOCATION_UPDATED: 'Location updated successfully.',
    LOCATION_DELETED: 'Location deleted successfully.',

    // Errors
    PROFILE_NOT_FOUND: 'Profile not found.',
    INVALID_PROFILE_DATA: 'Invalid profile data provided.',
  },

  // ===================================================
  // QUEUE MESSAGES
  // ===================================================
  QUEUE: {
    // Success
    QUEUE_UPDATED: 'Queue updated.',

    // Errors
    QUEUE_NOT_FOUND: 'Queue not found.',
  },

  // ===================================================
  // GENERIC MESSAGES
  // ===================================================
  GENERIC: {
    // Success
    SUCCESS: 'Operation successful.',
    CREATED: 'Created successfully.',
    UPDATED: 'Updated successfully.',
    DELETED: 'Deleted successfully.',
    RETRIEVED: 'Retrieved successfully.',

    // Errors
    ERROR: 'Something went wrong. Please try again later.',
    NOT_FOUND: 'Resource not found.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
    INVALID_REQUEST: 'Invalid request.',
    MISSING_REQUIRED_FIELDS: 'Missing required fields.',
    DUPLICATE_ENTRY: 'This entry already exists.',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',

    // Pagination
    RESULTS_NOT_FOUND: 'No results found.',
    PAGE_NOT_FOUND: 'Page not found.',

    // File upload
    FILE_REQUIRED: 'File is required.',
    INVALID_FILE_TYPE: 'Invalid file type. Only images are allowed.',
    FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
    FILE_UPLOAD_FAILED: 'File upload failed. Please try again.',
  },

  // ===================================================
  // ADMIN MESSAGES
  // ===================================================
  ADMIN: {
    // Success
    SALON_APPROVED: 'Salon approved successfully.',
    SALON_REJECTED: 'Salon rejected.',
    USER_BANNED: 'User banned successfully.',
    USER_UNBANNED: 'User unbanned successfully.',
    REPORT_GENERATED: 'Report generated successfully.',

    // Errors
    ADMIN_ONLY: 'This action is only available for admins.',
    INVALID_ACTION: 'Invalid admin action.',
  },

  // ===================================================
  // LOYALTY & WALLET MESSAGES
  // ===================================================
  LOYALTY: {
    // Success
    POINTS_ADDED: 'Loyalty points added.',
    POINTS_REDEEMED: 'Loyalty points redeemed successfully.',
    WALLET_BALANCE_ADDED: 'Wallet balance added successfully.',
    WALLET_BALANCE_DEDUCTED: 'Amount deducted from wallet.',

    // Errors
    INSUFFICIENT_POINTS: 'Insufficient loyalty points.',
    INVALID_AMOUNT: 'Invalid amount.',
  },

  // ===================================================
  // VALIDATION MESSAGES
  // ===================================================
  VALIDATION: {
    EMAIL_REQUIRED: 'Email is required.',
    EMAIL_INVALID: 'Please provide a valid email.',
    PHONE_REQUIRED: 'Phone number is required.',
    PHONE_INVALID: 'Please provide a valid phone number.',
    PASSWORD_REQUIRED: 'Password is required.',
    PASSWORD_WEAK: 'Password must be at least 6 characters.',
    NAME_REQUIRED: 'Name is required.',
    NAME_INVALID: 'Please provide a valid name.',
    PRICE_INVALID: 'Please provide a valid price.',
    DURATION_INVALID: 'Please provide a valid duration.',
    TIME_INVALID: 'Please provide a valid time.',
    DATE_INVALID: 'Please provide a valid date.',
    RATING_INVALID: 'Rating must be between 1 and 5.',
    GENDER_REQUIRED: 'Gender is required.',
    GENDER_INVALID: 'Please select a valid gender.',
    ADDRESS_REQUIRED: 'Address is required.',
    CITY_REQUIRED: 'City is required.',
    LOCATION_INVALID: 'Please provide valid location coordinates.',
  },

  // ===================================================
  // NOTIFICATION MESSAGES
  // ===================================================
  NOTIFICATION: {
    // SMS
    OTP_SMS: (otp) => `Your OTP is: ${otp}. Valid for 10 minutes.`,
    BOOKING_CONFIRMATION_SMS: (salonName, time) =>
      `Booking confirmed at ${salonName} at ${time}. Thank you!`,
    APPOINTMENT_REMINDER_SMS: (time) => `Reminder: Your appointment is at ${time}. See you soon!`,
    QUEUE_UPDATE_SMS: (position) => `Your position in queue: #${position}. You're getting closer!`,
    YOURE_NEXT_SMS: () => 'You\'re next! Come in now.',

    // EMAIL
    WELCOME_EMAIL: 'Welcome to My Salon Bookings!',
    OTP_EMAIL: 'Your OTP for verification',
    BOOKING_CONFIRMATION_EMAIL: 'Booking Confirmation',
    APPOINTMENT_REMINDER_EMAIL: 'Appointment Reminder',
    SALON_APPROVAL_EMAIL: 'Salon Approved',
    SALON_REJECTION_EMAIL: 'Salon Application Review Required',
  },
};
