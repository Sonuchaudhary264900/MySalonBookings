import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import { useAuth } from '../../hooks/useAuth';
import { useSalon } from '../../hooks/useSalon';
import ROUTES from '../../routes';

/**
 * ApprovalWaiting Page
 * 
 * Shown when:
 * - User has registered
 * - Salon has been created
 * - Waiting for admin approval
 * 
 * Features:
 * - Status display
 * - What to expect information
 * - Refresh button to check status
 * - Logout option
 */
const ApprovalWaiting = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { salon, fetchSalon } = useSalon();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Auto-check status on mount
  useEffect(() => {
    const checkApproval = async () => {
      setLoading(true);
      try {
        await fetchSalon();
      } catch (error) {
        console.error('Error fetching salon:', error);
      } finally {
        setLoading(false);
      }
    };

    checkApproval();
  }, []);

  // If approved, refresh user then redirect to dashboard (once)
  useEffect(() => {
    if (salon?.approvalStatus === 'approved' && !redirecting) {
      setRedirecting(true);
      refreshUser().then(() => navigate(ROUTES.DASHBOARD));
    }
  }, [salon?.approvalStatus, navigate, refreshUser, redirecting]);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      await fetchSalon();
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <Clock className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Under Review</h1>
            <p className="text-orange-100">Your salon is being verified</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8 space-y-6">
            {/* Status Card */}
            <Card className="border-2 border-yellow-200 bg-yellow-50">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Status</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className={`font-bold ${
                        salon?.approvalStatus === 'approved' ? 'text-green-600' :
                        salon?.approvalStatus === 'rejected' ? 'text-red-600' :
                        'text-orange-600'
                      }`}>
                        {salon?.approvalStatus === 'approved' ? 'Approved' :
                         salon?.approvalStatus === 'rejected' ? 'Rejected' :
                         'Pending Approval'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-700">Salon:</span>
                  <span className="text-sm text-gray-600">{salon?.name || 'Loading...'}</span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-700">Owner:</span>
                  <span className="text-sm text-gray-600">{user?.name || 'Loading...'}</span>
                </div>
              </div>
            </Card>

            {/* What to Expect */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">What Happens Next?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>Our team will verify your salon information</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>We'll check documents and credentials</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>You'll receive approval via email & SMS</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span>Access full dashboard features</span>
                </li>
              </ul>
            </div>

            {/* Timeline */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Approval Timeline</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="w-0.5 h-6 bg-gray-300 my-1" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Submitted</p>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
                    <div className="w-0.5 h-6 bg-gray-300 my-1" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Under Review</p>
                    <p className="text-xs text-gray-500">24-48 hours</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-5 h-5 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Approved</p>
                    <p className="text-xs text-gray-500">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Alert */}
            <Alert
              type="info"
              title="Need Help?"
              description="Contact support@smartsalon.com if you have any questions"
            />

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                variant="primary"
                fullWidth
                loading={checkingStatus}
                onClick={handleCheckStatus}
              >
                Refresh Status
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={handleLogout}
                disabled={checkingStatus}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          © 2026 Smart Salon. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ApprovalWaiting;