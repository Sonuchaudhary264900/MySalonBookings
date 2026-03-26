import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalon } from '../../hooks/useSalon';
import { Clock, AlertTriangle, XCircle, CreditCard, ArrowRight } from 'lucide-react';

const TrialBanner = () => {
  const { subscription } = useSalon();
  const navigate = useNavigate();

  if (!subscription) return null;

  const { trialActive, trialDaysRemaining, accessStatus, planType } = subscription;

  // Active paid subscription — no banner needed
  if (accessStatus === 'active') return null;

  const hasPlan    = planType && planType !== 'free_trial';
  const planLabel  = planType === 'starter' ? 'Starter ₹150/month' : planType === 'per_booking' ? 'Per Booking ₹1/booking' : '';

  let cfg = { bg: '', border: '', text: '', icon: null, message: '', cta: 'Go to Billing' };

  if (trialActive && trialDaysRemaining > 3) {
    cfg = {
      bg:      'bg-blue-50 dark:bg-blue-950/30',
      border:  'border-blue-200 dark:border-blue-800/60',
      text:    'text-blue-800 dark:text-blue-300',
      icon:    <Clock className="w-4 h-4 shrink-0" />,
      message: `Free trial active — ${trialDaysRemaining} days remaining`,
      cta:     'View Plans',
    };
  } else if (trialActive && trialDaysRemaining <= 3) {
    cfg = {
      bg:      'bg-amber-50 dark:bg-amber-950/30',
      border:  'border-amber-200 dark:border-amber-800/60',
      text:    'text-amber-800 dark:text-amber-300',
      icon:    <AlertTriangle className="w-4 h-4 shrink-0" />,
      message: `Trial expires in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} — choose a plan now`,
      cta:     'Choose a plan',
    };
  } else if (accessStatus === 'overdue' && hasPlan) {
    cfg = {
      bg:      'bg-red-50 dark:bg-red-950/30',
      border:  'border-red-200 dark:border-red-800/60',
      text:    'text-red-800 dark:text-red-300',
      icon:    <CreditCard className="w-4 h-4 shrink-0" />,
      message: `Payment due — ${planLabel} plan`,
      cta:     'Pay now',
    };
  } else {
    cfg = {
      bg:      'bg-red-50 dark:bg-red-950/30',
      border:  'border-red-200 dark:border-red-800/60',
      text:    'text-red-800 dark:text-red-300',
      icon:    <XCircle className="w-4 h-4 shrink-0" />,
      message: 'Trial expired — Please select a plan to continue',
      cta:     'Choose plan',
    };
  }

  return (
    <div className={`border-b px-4 py-2 flex items-center justify-between gap-4 text-sm transition-colors duration-300 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className="flex items-center gap-2 font-medium text-xs md:text-sm">
        {cfg.icon}
        {cfg.message}
      </span>
      <button
        onClick={() => navigate('/dashboard/billing')}
        className="flex items-center gap-1 text-xs font-semibold shrink-0 hover:opacity-75 transition-opacity"
      >
        {cfg.cta}
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default TrialBanner;
