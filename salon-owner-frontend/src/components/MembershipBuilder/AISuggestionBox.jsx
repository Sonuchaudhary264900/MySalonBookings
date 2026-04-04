import React from 'react';
import { Sparkles, TrendingUp, Zap, Leaf, Flame, Gem } from 'lucide-react';

const PLAN_META = {
  Basic:          { Icon: Leaf,  label: 'Starter Plan',  conversion: 'High — great entry offer'     },
  'Most Popular': { Icon: Flame, label: 'Most Popular',  conversion: 'High — sweet spot pricing'    },
  Premium:        { Icon: Gem,   label: 'Premium Plan',  conversion: 'Selective — premium audience' },
};

const GOAL_TIP = {
  repeat_customers: 'Loyalty memberships increase return visits by 2–3×',
  increase_revenue: 'Upfront billing creates predictable monthly income',
  promote_services: 'Free service perks drive discovery and trial bookings',
};

export default function AISuggestionBox({ totalValue, discountPct, recommendedPrice, savings, planCategory, goal }) {
  const meta = PLAN_META[planCategory] || PLAN_META['Most Popular'];
  const tip  = goal ? GOAL_TIP[goal] : null;

  if (totalValue === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl
      border border-violet-200/80 dark:border-violet-700/40
      bg-gradient-to-br from-violet-50 via-purple-50/80 to-indigo-50/60
      dark:from-violet-950/60 dark:via-purple-950/40 dark:to-indigo-950/30
      p-5 shadow-sm">

      {/* Ambient orbs */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-violet-400/15 dark:bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-purple-400/10 dark:bg-purple-500/8 rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[11px] font-black text-violet-800 dark:text-violet-200 uppercase tracking-[0.08em]">
            AI Suggestion
          </span>
        </div>
        {/* Plan badge — icon + label, no emoji */}
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full
          bg-white/70 dark:bg-white/8
          border border-violet-200/80 dark:border-violet-700/50
          text-violet-700 dark:text-violet-300">
          <meta.Icon size={11} strokeWidth={2} />
          {meta.label}
        </span>
      </div>

      {/* Stats */}
      <div className="relative grid grid-cols-3 gap-2.5 mb-4">
        {[
          {
            label: 'Total Value',
            value: `₹${totalValue.toLocaleString('en-IN')}`,
            sub: 'retail price',
            valueClass: 'text-gray-800 dark:text-gray-200',
            highlight: false,
          },
          {
            label: 'Rec. Price',
            value: `₹${recommendedPrice.toLocaleString('en-IN')}`,
            sub: `${discountPct}% off`,
            valueClass: 'text-violet-700 dark:text-violet-300',
            highlight: true,
          },
          {
            label: 'Savings',
            value: `₹${savings.toLocaleString('en-IN')}`,
            sub: 'for customer',
            valueClass: 'text-emerald-700 dark:text-emerald-300',
            highlight: false,
          },
        ].map((stat) => (
          <div key={stat.label}
            className={`rounded-xl px-2.5 py-3 text-center transition-shadow duration-200
              ${stat.highlight
                ? 'bg-white dark:bg-white/10 border-2 border-violet-300/80 dark:border-violet-500/50 shadow-sm'
                : 'bg-white/60 dark:bg-white/[0.04]'
              }`}>
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`text-[13px] font-black leading-none mb-0.5 ${stat.valueClass}`}>
              {stat.value}
            </p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="relative space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 rounded-md bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-[11px] text-violet-700 dark:text-violet-300 font-medium leading-relaxed">
            Expected conversion: <span className="font-black">{meta.conversion}</span>
          </span>
        </div>
        {tip && (
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">{tip}</span>
          </div>
        )}
      </div>
    </div>
  );
}
