import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

const AccessBlockedModal = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <Lock size={28} className="text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Subscription Required</h2>
        <p className="text-gray-500 text-sm mb-6">
          Your free trial has ended. Please select a plan to continue using all features.
        </p>
        <button
          onClick={() => navigate('/dashboard/billing')}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
        >
          Choose a Plan
        </button>
      </div>
    </div>
  );
};

export default AccessBlockedModal;
