import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_COLORS = {
  Completed: '#10b981',
  Pending:   '#f59e0b',
  Cancelled: '#ef4444',
  Confirmed: '#3b82f6',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-gray-900 dark:text-white">{d.name}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: STATUS_COLORS[d.name] }}>
        {d.value} bookings ({d.pct}%)
      </p>
    </div>
  );
};

const BookingChart = ({ completed = 0, pending = 0, cancelled = 0, confirmed = 0 }) => {
  const raw = [
    { name: 'Completed', value: completed },
    { name: 'Confirmed', value: confirmed },
    { name: 'Pending',   value: pending },
    { name: 'Cancelled', value: cancelled },
  ].filter(d => d.value > 0);

  const total = raw.reduce((a, d) => a + d.value, 0);
  const data  = raw.map(d => ({ ...d, pct: total > 0 ? Math.round((d.value / total) * 100) : 0 }));

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-44 gap-3 text-sm text-gray-400 dark:text-gray-500">
        <span className="text-4xl">📋</span>
        No bookings yet
      </div>
    );
  }

  return (
    <div>
      <div className="relative" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={76}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map(entry => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{total}</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-wide">Total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.name] }} />
            <span className="text-[10px] text-gray-600 dark:text-gray-400 flex-1 truncate">{d.name}</span>
            <span className="text-[11px] font-bold text-gray-900 dark:text-white">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingChart;
