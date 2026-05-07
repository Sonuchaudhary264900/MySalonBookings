import React from 'react';
const AuthLayout = ({
  children,
  title = 'GlowLoox Partner',
  subtitle = 'Business Management Dashboard'
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              {title}
            </h1>
            <p className="text-violet-100 text-sm">{subtitle}</p>
          </div>
          <div className="px-6 py-8">
            {children}
          </div>
        </div>
        <p className="text-center text-gray-500 text-xs mt-6">
          © 2026 GlowLoox · Gigamind Technologies Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;