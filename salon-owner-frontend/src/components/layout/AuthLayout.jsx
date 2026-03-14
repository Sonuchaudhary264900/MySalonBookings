import React from 'react';

/**
 * AuthLayout Component
 * 
 * Used for:
 * - Login page
 * - Register page
 * - OTP verification
 * - Password recovery
 * 
 * Features:
 * - Centered layout
 * - Full height container
 * - Professional styling
 * - Responsive design
 */
const AuthLayout = ({ 
  children,
  title = 'Smart Salon',
  subtitle = 'Salon Management System'
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              💈 {title}
            </h1>
            <p className="text-blue-100 text-sm">{subtitle}</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {children}
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-600 text-xs mt-6">
          © 2026 Smart Salon. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;