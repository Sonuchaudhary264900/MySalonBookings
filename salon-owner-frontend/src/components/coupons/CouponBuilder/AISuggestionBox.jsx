import React from 'react';
import { Sparkles, TrendingUp, Zap, Target } from 'lucide-react';

const PCT_INSIGHTS = [
  { minVal: 25, label: 'Excellent', sub: 'Flash-sale level — very high conversion rate' },
  { minVal: 20, label: 'High',      sub: 'Sweet spot — strong conversion for most salons' },
  { minVal: 15, label: 'Good',      sub: 'Solid offer — works well for regular customers' },
  { minVal: 10, label: 'Moderate',  sub: 'Light discount — 15–20% converts 2× better' },
  { minVal: 0,  label: 'Low',       sub: 'Too low to drive urgency — consider 15%+' },
];

const FIXED_INSIGHTS = [
  { minVal: 200, label: 'High Value', sub: 'Premium offer — attracts high-spend customers' },
  { minVal: 100, label: 'Good Value', sub: 'Solid flat discount — broad customer appeal' },
  { minVal: 50,  label: 'Moderate',   sub: 'Light offer — try ₹100+ for better results' },
  { minVal: 0,   label: 'Low Value',  sub: 'Very low flat amount — unlikely to drive bookings' },
];

const PCT_TIPS = [
  { minVal: 20, tip: 'Coupons at 20%+ see 3× more first-time bookings than lower discounts' },
  { minVal: 15, tip: 'The 15–20% range is the sweet spot for repeat-customer campaigns' },
  { minVal: 10, tip: 'Add an expiry date (7–14 days) to create urgency and boost usage' },
  { minVal: 0,  tip: 'Increase discount to 15%+ — this range sees the best conversion rates' },
];

const FIXED_TIPS = [
  { minVal: 100, tip: 'Pair this with a min order requirement to protect your margins' },
  { minVal: 50,  tip: 'Flat discounts work best with a min order of 3–5× the discount amount' },
  { minVal: 0,   tip: 'Consider increasing to ₹100+ or switching to a percentage discount' },
];

export default function AISuggestionBox({ discountType, discountValue }) {
  const val = parseFloat(discountValue) || 0;
  if (!val) return null;

  const insights = discountType === 'percentage' ? PCT_INSIGHTS : FIXED_INSIGHTS;
  const tips     = discountType === 'percentage' ? PCT_TIPS     : FIXED_TIPS;

  const insight = insights.find(i => val >= i.minVal) ?? insights[insights.length - 1];
  const tip     = tips.find(t => val >= t.minVal)?.tip ?? tips[tips.length - 1].tip;

  const displayVal = discountType === 'percentage'
    ? `${val}% OFF`
    : `₹${val} OFF`;

  const recMin = discountType === 'percentage' ? '15%' : '₹100';
  const recMax = discountType === 'percentage' ? '25%' : '₹200';

  return (
    <div className="relative overflow-hidden rounded-2xl
      border border-indigo-200/80 dark:border-indigo-700/40
      bg-gradient-to-br from-indigo-50 via-violet-50/80 to-purple-50/60
      dark:from-indigo-950/60 dark:via-violet-950/40 dark:to-purple-950/30
      p-5 shadow-sm">

      {/* Orbs */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-400/15 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-violet-400/10 dark:bg-violet-500/8 rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[11px] font-black text-indigo-800 dark:text-indigo-200 uppercase tracking-[0.08em]">
            AI Suggestion
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full
          bg-white/70 dark:bg-white/8
          border border-indigo-200/60 dark:border-indigo-700/40
          text-indigo-700 dark:text-indigo-300">
          <Target size={10} strokeWidth={2.5} />
          {insight.label} Conversion
        </span>
      </div>

      {/* Stats */}
      <div className="relative grid grid-cols-3 gap-2.5 mb-4">
        {[
          {
            label: 'Your Coupon',
            value: displayVal,
            sub: discountType === 'percentage' ? 'percentage' : 'flat amount',
            highlight: true,
            valueClass: 'text-indigo-700 dark:text-indigo-300',
          },
          {
            label: 'Rec. Range',
            value: recMin,
            sub: `up to ${recMax}`,
            highlight: false,
            valueClass: 'text-gray-700 dark:text-gray-300',
          },
          {
            label: 'Forecast',
            value: insight.label,
            sub: 'conversion',
            highlight: false,
            valueClass: 'text-emerald-700 dark:text-emerald-300',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl px-2.5 py-3 text-center transition-shadow duration-200
              ${stat.highlight
                ? 'bg-white dark:bg-white/10 border-2 border-indigo-300/80 dark:border-indigo-500/50 shadow-sm'
                : 'bg-white/60 dark:bg-white/[0.04]'
              }`}
          >
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`text-[12px] font-black leading-none mb-0.5 ${stat.valueClass}`}>
              {stat.value}
            </p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="relative space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 rounded-md bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
            <span className="font-black">{insight.label}</span> — {insight.sub}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
            {tip}
          </span>
        </div>
      </div>
    </div>
  );
}
