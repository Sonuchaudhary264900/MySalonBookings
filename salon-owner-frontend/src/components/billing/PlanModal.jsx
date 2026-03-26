import React from 'react';
import { X, Check, Zap, Star, Sparkles, ArrowRight } from 'lucide-react';

export const PLANS = [
  {
    key:         'per_booking',
    name:        'Pay Per Booking',
    price:       '₹1',
    period:      'per booking',
    tagline:     'Only pay for what you use',
    color:       'emerald',
    icon:        Zap,
    features:    [
      'Charged only per confirmed booking',
      'No monthly commitment',
      'All features included',
      'Usage report each month',
      'Auto-billing at month end',
    ],
    popular:     false,
    badge:       null,
  },
  {
    key:         'starter',
    name:        'Starter Plan',
    price:       '₹150',
    period:      'per month',
    tagline:     'Unlimited bookings, one flat price',
    color:       'indigo',
    icon:        Star,
    features:    [
      'Unlimited bookings included',
      'Fixed monthly cost',
      'All features included',
      'Priority support',
      'Advanced analytics',
    ],
    popular:     true,
    badge:       'Most Popular',
  },
];

const COLOR_MAP = {
  emerald: {
    border:   'border-emerald-400 dark:border-emerald-600',
    bg:       'bg-emerald-50 dark:bg-emerald-950/30',
    icon:     'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    badge:    'bg-emerald-500',
    check:    'text-emerald-600 dark:text-emerald-400',
    btn:      'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25',
    ring:     'ring-emerald-400/30',
    glow:     'from-emerald-500/0 via-emerald-500/40 to-teal-500/0',
    price:    'text-emerald-600 dark:text-emerald-400',
  },
  indigo: {
    border:   'border-indigo-400 dark:border-indigo-600',
    bg:       'bg-indigo-50 dark:bg-indigo-950/30',
    icon:     'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    badge:    'bg-gradient-to-r from-indigo-600 to-violet-600',
    check:    'text-indigo-600 dark:text-indigo-400',
    btn:      'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/25',
    ring:     'ring-indigo-400/30',
    glow:     'from-indigo-500/0 via-indigo-500/50 to-violet-500/0',
    price:    'text-indigo-600 dark:text-indigo-400',
  },
};

const PlanCard = ({ plan, current, selected, onSelect, disabled }) => {
  const c = COLOR_MAP[plan.color];
  const Icon = plan.icon;
  const isCurrent  = current === plan.key;
  const isSelected = selected === plan.key;

  return (
    <div
      onClick={() => !disabled && !isCurrent && onSelect(plan.key)}
      className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all duration-200 cursor-pointer
        ${isSelected
          ? `${c.border} ${c.bg} ring-4 ${c.ring} shadow-lg`
          : isCurrent
          ? `border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 cursor-default`
          : `border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
             hover:${c.border} hover:shadow-md hover:-translate-y-0.5`
        }
        ${disabled ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold
          text-white ${c.badge} shadow-md flex items-center gap-1 whitespace-nowrap`}>
          <Sparkles className="w-2.5 h-2.5" /> {plan.badge}
        </div>
      )}

      {/* Current badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold
          text-white bg-gray-500 dark:bg-gray-600 shadow-md whitespace-nowrap">
          Current Plan
        </div>
      )}

      {/* Top glow line when selected */}
      {isSelected && (
        <div className={`absolute top-0 left-0 w-full h-0.5 rounded-t-2xl
          bg-gradient-to-r ${c.glow}`} />
      )}

      {/* Icon + name */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{plan.name}</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{plan.tagline}</p>
        </div>
        {/* Selected check */}
        {isSelected && (
          <div className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center ${c.icon}`}>
            <Check className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-black ${c.price}`}>{plan.price}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">/{plan.period}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-1.5 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${c.check}`} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
};

const PlanModal = ({ isOpen, onClose, currentPlan, trialActive, onConfirm, loading, isChangePlan }) => {
  const [selected, setSelected] = React.useState(null);

  React.useEffect(() => {
    if (isOpen) setSelected(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPlan = PLANS.find(p => p.key === selected);
  const c = selectedPlan ? COLOR_MAP[selectedPlan.color] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Choose Your Plan</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {trialActive
                ? 'Your plan activates automatically when the free trial ends'
                : isChangePlan
                ? 'Changes apply at the start of your next billing cycle'
                : 'Select a plan to restore full access'
              }
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {PLANS.map(plan => (
              <PlanCard
                key={plan.key}
                plan={plan}
                current={currentPlan}
                selected={selected}
                onSelect={setSelected}
                disabled={loading}
              />
            ))}
          </div>

          {/* Trial note */}
          {trialActive && (
            <div className="flex items-start gap-2.5 p-3 bg-indigo-50 dark:bg-indigo-950/30
              border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                You're still in your free trial. Your selected plan will activate automatically when it ends.
                <strong> No payment needed now.</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
              text-sm font-medium text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected || loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all
              shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
              ${c ? c.btn : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'}
            `}
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
              : selected
              ? <>{trialActive ? 'Confirm Plan' : isChangePlan ? 'Schedule Change' : 'Continue to Payment'} <ArrowRight className="w-4 h-4" /></>
              : 'Select a Plan'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanModal;
