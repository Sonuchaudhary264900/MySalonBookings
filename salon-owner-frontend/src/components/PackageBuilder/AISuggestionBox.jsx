import React from 'react';
import { Sparkles, TrendingUp, Zap, Target } from 'lucide-react';

const CONVERSION = [
  { minPct: 20, label: 'Excellent', sub: 'Maximum customer appeal — high booking rate expected' },
  { minPct: 15, label: 'High',      sub: 'Sweet spot for most customers — strong conversion'    },
  { minPct: 10, label: 'Good',      sub: 'Attractive for regulars — decent conversion rate'     },
  { minPct: 1,  label: 'Low',       sub: 'Consider 15–20% for significantly better conversion'  },
  { minPct: 0,  label: 'None',      sub: 'No discount — packages with offers see 3× more bookings' },
];

const TIPS = [
  { minPct: 20, tip: 'Premium bundle pricing — ideal for new customer acquisition campaigns' },
  { minPct: 15, tip: 'Standard bundle discount — works well for existing loyal customers'    },
  { minPct: 10, tip: 'Light discount applied — try 15–20% for significantly better results'  },
  { minPct: 0,  tip: 'Packages with 15%+ off see 3× more bookings than full-price bundles'   },
];

export default function AISuggestionBox({ totalValue, discountPct, recommendedPrice, savings }) {
  if (!totalValue || totalValue === 0) return null;

  const conv = CONVERSION.find(c => discountPct >= c.minPct) ?? CONVERSION[CONVERSION.length - 1];
  const tip  = TIPS.find(t => discountPct >= t.minPct)?.tip ?? TIPS[TIPS.length - 1].tip;

  return (
    <div className="relative overflow-hidden rounded-2xl
      border border-indigo-200/80 dark:border-indigo-700/40
      bg-gradient-to-br from-indigo-50 via-violet-50/80 to-purple-50/60
      dark:from-indigo-950/60 dark:via-violet-950/40 dark:to-purple-950/30
      p-5 shadow-sm">

      {/* Ambient orbs */}
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
          {conv.label} Conversion
        </span>
      </div>

      {/* Stats */}
      <div className="relative grid grid-cols-3 gap-2.5 mb-4">
        {[
          {
            label: 'Total Value',
            value: `₹${totalValue.toLocaleString('en-IN')}`,
            sub: 'retail price',
            highlight: false,
            valueClass: 'text-gray-800 dark:text-gray-200',
          },
          {
            label: 'Rec. Price',
            value: `₹${recommendedPrice.toLocaleString('en-IN')}`,
            sub: `${Math.round((1 - recommendedPrice / totalValue) * 100)}% off`,
            highlight: true,
            valueClass: 'text-indigo-700 dark:text-indigo-300',
          },
          {
            label: 'Customer Saves',
            value: `₹${savings.toLocaleString('en-IN')}`,
            sub: 'savings',
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
          <div className="w-4 h-4 rounded-md bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
            Forecast: <span className="font-black">{conv.sub}</span>
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
