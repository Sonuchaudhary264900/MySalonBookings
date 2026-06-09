import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSalon } from '../hooks/useSalon';
import ROUTES from './index';

const Spinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      <p className="text-slate-500 text-sm">Loading...</p>
    </div>
  </div>
);

const ServerDown = ({ onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center">
    <div className="text-center space-y-4 max-w-sm px-4">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <span className="text-red-500 text-2xl">!</span>
      </div>
      <h2 className="text-lg font-semibold text-slate-700">Server Unavailable</h2>
      <p className="text-slate-500 text-sm">Could not connect to the server. Please check your connection and try again.</p>
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
      >
        Retry
      </button>
    </div>
  </div>
);

const ProtectedRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const { salon, salonInitialized, salonFetchFailed, fetchSalon } = useSalon();

  const needsApprovalCheck =
    user?.status === 'pending_approval' || user?.status === 'salon_registered';

  // Fetch salon once on load — only for owners, not staff
  useEffect(() => {
    if (isAuthenticated && !salonInitialized && user?.role !== 'staff') {
      fetchSalon();
    }
  }, [isAuthenticated, salonInitialized, fetchSalon, user?.role]);

  // Wait for auth
  if (loading) return <Spinner />;

  // Not logged in
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;

  // Needs salon registration — send to new unified onboarding
  if (user?.status === 'mobile_verified') {
    return <Navigate to={ROUTES.ONBOARDING} replace />;
  }

  // Owner status is pending — wait for salon data before deciding (prevents flash)
  if (needsApprovalCheck) {
    if (!salonInitialized) return <Spinner />;
    if (salonFetchFailed) return <ServerDown onRetry={fetchSalon} />;
    if (salon?.approvalStatus === 'approved') {
      // First-time approved: if no categories set yet, send to setup
      const hasCategories = Array.isArray(salon.offeredCategories) && salon.offeredCategories.length > 0;
      if (!hasCategories) return <Navigate to={ROUTES.SALON_SETUP} replace />;
      return <Outlet />;
    }
    return <Navigate to={ROUTES.APPROVAL_WAITING} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;