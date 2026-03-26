import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const StatsCard = ({
  label,
  value,
  sub,
  icon: Icon,
  colorClass,
  bgClass,
  borderClass,
  trend,
  trendLabel,
  sparkline,
}) => {
  const isPos = typeof trend === 'number' && trend > 0;
  const isNeg = typeof trend === 'number' && trend < 0;

  const strokeColor =
    colorClass?.includes('indigo')  ? '#6366f1'
    : colorClass?.includes('emerald') ? '#10b981'
    : colorClass?.includes('blue')    ? '#3b82f6'
    : colorClass?.includes('amber')   ? '#f59e0b'
    : colorClass?.includes('violet')  ? '#8b5cf6'
    : '#6366f1';

  return (
    <div
      className={`${bgClass} rounded-2xl p-5 border ${borderClass} relative overflow-hidden
        hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
    >
      <div className="relative">
        {/* Icon + trend badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 dark:bg-gray-900/60">
            <Icon className={`w-4 h-4 ${colorClass}`} />
          </div>
          {typeof trend === 'number' && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPos ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                    : isNeg ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              {isPos
                ? <TrendingUp className="w-2.5 h-2.5" />
                : isNeg
                ? <TrendingDown className="w-2.5 h-2.5" />
                : <Minus className="w-2.5 h-2.5" />
              }
              &nbsp;{isPos ? '+' : ''}{trend}%
            </span>
          )}
        </div>

        {/* Label + value */}
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className={`text-2xl font-black ${colorClass} leading-tight`}>{value}</p>

        {/* Sub + trend label */}
        <div className="flex items-end justify-between mt-1.5 gap-2">
          {sub && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{sub}</p>
          )}
          {trendLabel && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{trendLabel}</p>
          )}
        </div>

        {/* Sparkline */}
        {sparkline && sparkline.length > 2 && (
          <div className="mt-3 -mx-1 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
