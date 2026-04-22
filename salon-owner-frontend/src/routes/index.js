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
  ONBOARDING: '/onboarding',

  // Semi-Protected Routes (after login but before approval)
  SALON_REGISTER: '/salon/register',
  APPROVAL_WAITING: '/approval-waiting',
  SALON_SETUP: '/salon/setup',

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
  PACKAGES:      '/dashboard/packages',
  BILLING:       '/dashboard/billing',
  PROMOTIONS:    '/dashboard/promotions',
  MESSAGES:      '/dashboard/messages',
  GLOWLOOX:      '/dashboard/glowloox',
  TEAM:          '/dashboard/team',
  AUDIT:         '/dashboard/audit',
  DEVELOPER:     '/dashboard/developer',
  TEAM_CHAT:     '/dashboard/team-chat',

  // Legal (public)
  PRIVACY:       '/privacy-policy',
  TERMS:         '/terms',

  // Detailed legal pages
  LEGAL:                  '/legal',
  CUSTOMER_PRIVACY:       '/legal/customer-privacy',
  OWNER_PRIVACY:          '/legal/owner-privacy',
  CUSTOMER_TERMS:         '/legal/customer-terms',
  OWNER_TERMS:            '/legal/owner-terms',
};

export default ROUTES;