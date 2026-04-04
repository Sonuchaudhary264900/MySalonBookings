import React from 'react';
import { Check, RefreshCw, TrendingUp, Sparkles } from 'lucide-react';

const GOALS = [
  {
    id:    'repeat_customers',
    Icon:  RefreshCw,
    title: 'Increase Repeat Customers',
    desc:  'Reward loyalty and encourage clients to visit regularly',
    tag:   'Best for retention',
    border:     'border-indigo-400 dark:border-indigo-500/70',
    bg:         'bg-gradient-to-br from-indigo-50 to-blue-50/60 dark:from-indigo-950/50 dark:to-blue-950/30',
    iconBg:     'bg-indigo-100 dark:bg-indigo-900/50',
    iconColor:  'text-indigo-600 dark:text-indigo-400',
    titleColor: 'text-indigo-900 dark:text-indigo-100',
    descColor:  'text-indigo-600/80 dark:text-indigo-400/90',
    tagColor:   'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/60',
    checkBg:    'bg-indigo-500',
    glow:       'shadow-indigo-500/20',
  },
  {
    id:    'increase_revenue',
    Icon:  TrendingUp,
    title: 'Increase Revenue',
    desc:  'Grow monthly recurring income with upfront billing cycles',
    tag:   'Maximizes income',
    border:     'border-emerald-400 dark:border-emerald-500/70',
    bg:         'bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/50 dark:to-teal-950/30',
    iconBg:     'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor:  'text-emerald-600 dark:text-emerald-400',
    titleColor: 'text-emerald-900 dark:text-emerald-100',
    descColor:  'text-emerald-600/80 dark:text-emerald-400/90',
    tagColor:   'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60',
    checkBg:    'bg-emerald-500',
    glow:       'shadow-emerald-500/20',
  },
  {
    id:    'promote_services',
    Icon:  Sparkles,
    title: 'Promote Specific Services',
    desc:  'Drive bookings for featured or underutilised services',
    tag:   'Service discovery',
    border:     'border-violet-400 dark:border-violet-500/70',
    bg:         'bg-gradient-to-br from-violet-50 to-purple-50/60 dark:from-violet-950/50 dark:to-purple-950/30',
    iconBg:     'bg-violet-100 dark:bg-violet-900/50',
    iconColor:  'text-violet-600 dark:text-violet-400',
    titleColor: 'text-violet-900 dark:text-violet-100',
    descColor:  'text-violet-600/80 dark:text-violet-400/90',
    tagColor:   'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/60',
    checkBg:    'bg-violet-500',
    glow:       'shadow-violet-500/20',
  },
];

const GOAL_CONFIRM = {
  repeat_customers: 'AI will suggest loyalty perks and sustainable pricing to keep clients coming back.',
  increase_revenue: 'AI will recommend pricing optimised for conversion and recurring monthly income.',
  promote_services: 'AI will suggest free service perks to boost discovery and first-time trials.',
};

export default function Step1Goal({ form, onChange }) {
  return (
    <div className="space-y-5 py-3">

      {/* Heading */}
      <div className="space-y-1">
        <h3 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-[-0.01em]">
          What's your goal?
        </h3>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
          Choose your primary objective — this shapes the AI's pricing and benefit recommendations.
        </p>
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {GOALS.map((goal, i) => {
          const active = form.goal === goal.id;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => onChange({ goal: goal.id })}
              style={{ '--i': i }}
              className={`
                mem-card w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left
                transition-all duration-250 active:scale-[0.985]
                ${active
                  ? `${goal.border} ${goal.bg} shadow-lg ${goal.glow} -translate-y-px`
                  : `border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.03]
                     hover:border-gray-300 dark:hover:border-white/15
                     hover:bg-gray-50/80 dark:hover:bg-white/[0.05]
                     hover:shadow-sm hover:-translate-y-px`
                }
              `}
            >
              {/* Icon container */}
              <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                transition-all duration-250
                ${active ? `${goal.iconBg} shadow-sm scale-105` : 'bg-gray-100 dark:bg-white/[0.06]'}
              `}>
                <goal.Icon
                  size={22}
                  strokeWidth={1.75}
                  className={active ? goal.iconColor : 'text-gray-400 dark:text-gray-500'}
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-bold mb-0.5 tracking-[-0.005em]
                  ${active ? goal.titleColor : 'text-gray-800 dark:text-gray-100'}`}>
                  {goal.title}
                </p>
                <p className={`text-xs leading-relaxed
                  ${active ? goal.descColor : 'text-gray-400 dark:text-gray-500'}`}>
                  {goal.desc}
                </p>
              </div>

              {/* Tag + radio */}
              <div className="shrink-0 flex flex-col items-end gap-2.5">
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap
                  transition-all duration-200
                  ${active ? goal.tagColor : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500'}`}>
                  {goal.tag}
                </span>
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center border-2
                  transition-all duration-250 ease-[cubic-bezier(0.34,1.4,0.64,1)]
                  ${active
                    ? `${goal.checkBg} border-transparent scale-110`
                    : 'border-gray-300 dark:border-white/20 bg-white dark:bg-transparent scale-100'
                  }
                `}>
                  {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirmation note */}
      {form.goal && (
        <div className="mem-card bg-gray-50 dark:bg-white/[0.04] rounded-2xl px-4 py-3.5
          border border-gray-200/80 dark:border-white/[0.07]"
          style={{ '--i': 0 }}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Goal set — </span>
            {GOAL_CONFIRM[form.goal]}
          </p>
        </div>
      )}
    </div>
  );
}
