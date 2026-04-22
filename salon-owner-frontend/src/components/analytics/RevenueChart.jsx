import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line, ComposedChart,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 shadow-xl text-left min-w-[140px]">
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name === 'prevRevenue' ? 'Previous' : 'Current'}</span>
          <span className="font-bold text-gray-900 dark:text-white ml-auto">
            ₹{Number(p.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const RevenueChart = ({ data, isDark, goal = 0, previousData = null }) => {
  // Merge current + previous into a single data array for the chart
  const formatted = data.map((d, i) => ({
    ...d,
    label: d.date ? d.date.slice(5) : '',
    prevRevenue: previousData?.[i]?.revenue ?? undefined,
  }));

  const totalInPeriod = data.reduce((s, d) => s + (d.revenue || 0), 0);
  const goalPct = goal > 0 ? Math.min(100, Math.round((totalInPeriod / goal) * 100)) : 0;

  const gridColor   = isDark ? '#1f2937' : '#f3f4f6';
  const tickColor   = isDark ? '#6b7280' : '#9ca3af';
  const tickFormatter = v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;
  const xInterval   = Math.max(0, Math.floor(formatted.length / 8) - 1);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Revenue Over Time</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Daily revenue across selected period</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-500 rounded-full inline-block" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Current</span>
          </span>
          {previousData && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0 border-t border-dashed border-gray-400 inline-block" />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Previous</span>
            </span>
          )}
        </div>
      </div>

      {/* Goal tracker */}
      {goal > 0 && (
        <div className="mt-3 mb-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
              Revenue Goal
            </span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              ₹{totalInPeriod.toLocaleString()} / ₹{goal.toLocaleString()} ({goalPct}%)
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <span className="text-3xl">📊</span>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">No revenue data for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={isDark ? 0.35 : 0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              interval={xInterval}
            />
            <YAxis
              tick={{ fontSize: 9, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={tickFormatter}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#revGradient)"
              dot={false}
              activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            />
            {previousData && (
              <Line
                type="monotone"
                dataKey="prevRevenue"
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 4, fill: '#9ca3af', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default RevenueChart;
