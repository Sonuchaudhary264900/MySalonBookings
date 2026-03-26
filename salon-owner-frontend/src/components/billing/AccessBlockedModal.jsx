import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CreditCard, ArrowRight } from 'lucide-react';
import { useSalon } from '../../hooks/useSalon';

const AccessBlockedModal = () => {
  const navigate = useNavigate();
  const { subscription } = useSalon();

  const accessStatus = subscription?.accessStatus;
  const planType     = subscription?.planType;
  const hasPlan      = planType && planType !== 'free_trial';
  const isOverdue    = accessStatus === 'overdue' && hasPlan;

  const planLabel = planType === 'starter'
    ? 'Starter — ₹150/month'
    : planType === 'per_booking'
    ? 'Per Booking — ₹1/booking'
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            isOverdue
              ? 'bg-red-100 dark:bg-red-950/50'
              : 'bg-red-100 dark:bg-red-950/50'
          }`}>
            {isOverdue
              ? <CreditCard className="w-8 h-8 text-red-500 dark:text-red-400" />
              : <Lock       className="w-8 h-8 text-red-500 dark:text-red-400" />
            }
          </div>
        </div>

        {isOverdue ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Due</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Your <span className="font-semibold text-gray-700 dark:text-gray-300">{planLabel}</span> subscription payment is overdue.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mb-6">
              Complete your payment to restore full access.
            </p>
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-sm shadow-red-200 dark:shadow-red-900"
            >
              Pay Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Subscription Required</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Your free trial has ended. Choose a plan to continue using all features.
            </p>
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900"
            >
              Choose a Plan
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AccessBlockedModal;
