import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

/**
 * StatsCard — premium KPI card with sparkline, trend badge, and glow accent.
 *
 * colorClass  – Tailwind text-* class that sets the value + icon colour
 * bgClass     – Tailwind bg-* class for the card surface
 * borderClass – Tailwind border-* class
 * accent      – optional CSS colour for the top-border stripe & sparkline (hex)
 */
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
  accent,
}) => {
  const isPos = typeof trend === 'number' && trend > 0;
  const isNeg = typeof trend === 'number' && trend < 0;
  const isFlat = typeof trend === 'number' && trend === 0;

  // Derive stroke colour from the accent prop or fall back to colorClass heuristic
  const strokeColor =
    accent ||
    (colorClass?.includes('indigo')  ? '#6366f1'
    : colorClass?.includes('emerald') ? '#10b981'
    : colorClass?.includes('blue')    ? '#3b82f6'
    : colorClass?.includes('amber')   ? '#f59e0b'
    : colorClass?.includes('violet')  ? '#8b5cf6'
    : colorClass?.includes('rose')    ? '#f43f5e'
    : '#6366f1');

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl p-5
        ${bgClass}
        border ${borderClass}
        hover:-translate-y-1
        hover:shadow-lg dark:hover:shadow-black/30
        transition-all duration-200
      `}
    >
      {/* Accent top stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, ${strokeColor}00, ${strokeColor}, ${strokeColor}00)` }}
      />

      {/* Subtle background glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity blur-2xl pointer-events-none"
        style={{ backgroundColor: strokeColor }}
      />

      <div className="relative">
        {/* Icon row + trend badge */}
        <div className="flex items-start justify-between gap-2 mb-4">
          {/* Icon pill */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 dark:bg-gray-900/60 shadow-sm border border-white/80 dark:border-gray-700/50 shrink-0">
            {Icon && <Icon className={`w-4.5 h-4.5 ${colorClass}`} />}
          </div>

          {/* Trend badge */}
          {typeof trend === 'number' && (
            <span className={`
              flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0
              ${isPos  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
              : isNeg  ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
              :           'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}
            `}>
              {isPos  ? <TrendingUp  className="w-3 h-3" />
              : isNeg ? <TrendingDown className="w-3 h-3" />
              :         <Minus className="w-3 h-3" />}
              {isPos ? '+' : ''}{trend}%
            </span>
          )}
        </div>

        {/* Label */}
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
          {label}
        </p>

        {/* Value */}
        <p className={`text-2xl font-black ${colorClass} leading-tight`}>{value}</p>

        {/* Sub + trend label */}
        <div className="flex items-end justify-between mt-1 gap-2">
          {sub && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">{sub}</p>
          )}
          {trendLabel && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-auto">{trendLabel}</p>
          )}
        </div>

        {/* Sparkline */}
        {sparkline && sparkline.length > 2 && (
          <div className="mt-4 -mx-1 h-10 opacity-80 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline} margin={{ top: 2, right: 4, left: 4, bottom: 2 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={strokeColor}
                  strokeWidth={2}
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
