/**
 * Route Constants
 * 
 * All routes are defined here for easy refactoring
 */

const ROUTES = {
  // Public Routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  // Semi-Protected Routes (after login but before approval)
  SALON_REGISTER: '/salon/register',
  APPROVAL_WAITING: '/approval-waiting',

  // Protected Routes (after approval)
  DASHBOARD: '/dashboard',
  SERVICES: '/dashboard/services',
  BOOKINGS: '/dashboard/bookings',
  ANALYTICS: '/dashboard/analytics',
  REVIEWS: '/dashboard/reviews',
  PROFILE: '/dashboard/profile',
  SETTINGS: '/dashboard/settings',
  NOTIFICATIONS: '/dashboard/notifications',
  GALLERY:       '/dashboard/gallery',
  CALENDAR:      '/dashboard/calendar',
  CUSTOMERS:     '/dashboard/customers',
  COUPONS:       '/dashboard/coupons',

  // Legal (public)
  PRIVACY:       '/privacy-policy',
  TERMS:         '/terms',
};

export default ROUTES;