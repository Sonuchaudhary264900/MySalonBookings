import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalon } from '../../hooks/useSalon';
import { Clock, AlertTriangle, XCircle } from 'lucide-react';

const TrialBanner = () => {
  const { subscription } = useSalon();
  const navigate = useNavigate();

  if (!subscription) return null;

  const { trialActive, trialDaysRemaining, accessStatus, planType, paymentStatus } = subscription;

  // Don't show banner if active paid subscription
  if (accessStatus === 'active') return null;

  let bgClass = '';
  let icon = null;
  let message = '';

  if (trialActive && trialDaysRemaining > 3) {
    bgClass = 'bg-blue-50 border-blue-200 text-blue-800';
    icon = <Clock size={15} />;
    message = `Free trial active — ${trialDaysRemaining} days remaining`;
  } else if (trialActive && trialDaysRemaining <= 3) {
    bgClass = 'bg-yellow-50 border-yellow-200 text-yellow-800';
    icon = <AlertTriangle size={15} />;
    message = `Trial expires in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} — Choose a plan now`;
  } else {
    bgClass = 'bg-red-50 border-red-200 text-red-800';
    icon = <XCircle size={15} />;
    message = 'Trial expired — Please select a plan to continue';
  }

  return (
    <div className={`border-b px-4 py-2 flex items-center justify-between text-sm ${bgClass}`}>
      <span className="flex items-center gap-1.5 font-medium">
        {icon}
        {message}
      </span>
      <button
        onClick={() => navigate('/dashboard/billing')}
        className="text-xs font-semibold underline underline-offset-2 hover:opacity-75 transition"
      >
        Go to Billing →
      </button>
    </div>
  );
};

export default TrialBanner;
