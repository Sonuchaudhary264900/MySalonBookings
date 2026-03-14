import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ROUTES from './index';

/**
 * PublicRoute Component
 * 
 * For public routes (login, register, home)
 * - If user is logged in: redirects to dashboard
 * - If user is not logged in: renders route
 * - If loading: shows loading screen
 * 
 * Usage:
 * <Route element={<PublicRoute />}>
 *   <Route path="/" element={<Home />} />
 *   <Route path="/login" element={<Login />} />
 *   <Route path="/register" element={<Register />} />
 * </Route>
 */
const PublicRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // User is authenticated
  if (isAuthenticated && user) {
    // Redirect based on user status
    if (user.status === 'mobile_verified') {
      return <Navigate to={ROUTES.SALON_REGISTER} replace />;
    }

    if (user.status === 'pending_approval' || user.status === 'salon_registered') {
      return <Navigate to={ROUTES.APPROVAL_WAITING} replace />;
    }

    // User is fully approved
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // User is not authenticated, allow access to public routes
  return <Outlet />;
};

export default PublicRoute;