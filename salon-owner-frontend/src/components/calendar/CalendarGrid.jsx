import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const CalendarGrid = ({
  currentMonth,
  selectedDate,
  bookingsByDate = {},
  onDateSelect,
  onMonthChange,
}) => {
  const todayKey = toKey(new Date());

  // Build 42-cell grid (6 rows × 7 cols)
  const cells = useMemo(() => {
    const year      = currentMonth.getFullYear();
    const month     = currentMonth.getMonth();
    const firstDay  = new Date(year, month, 1).getDay();          // 0 = Sun
    const daysInMo  = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const arr = [];
    // Prev-month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      arr.push({ date: new Date(year, month - 1, daysInPrev - i), cur: false });
    }
    // Current month
    for (let d = 1; d <= daysInMo; d++) {
      arr.push({ date: new Date(year, month, d), cur: true });
    }
    // Next-month padding
    const rem = 42 - arr.length;
    for (let d = 1; d <= rem; d++) {
      arr.push({ date: new Date(year, month + 1, d), cur: false });
    }
    return arr;
  }, [currentMonth]);

  // Max count in current month (for relative intensity bar)
  const maxCount = useMemo(() => {
    let max = 0;
    cells.forEach(c => {
      if (!c.cur) return;
      const cnt = bookingsByDate[toKey(c.date)]?.length || 0;
      if (cnt > max) max = cnt;
    });
    return max || 1;
  }, [cells, bookingsByDate]);

  const selectedKey = selectedDate ? toKey(selectedDate) : '';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">

      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => onMonthChange(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
        </div>

        <button
          onClick={() => onMonthChange(1)}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Day headers ── */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {DAYS.map(d => (
          <div
            key={d}
            className={`py-2.5 text-center text-xs font-semibold tracking-wide
              ${d === 'Sun' ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Date cells ── */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map((cell, idx) => {
          const key      = toKey(cell.date);
          const count    = cell.cur ? (bookingsByDate[key]?.length || 0) : 0;
          const isToday  = key === todayKey;
          const isSel    = key === selectedKey;
          const isSun    = cell.date.getDay() === 0;
          const isSat    = cell.date.getDay() === 6;
          const isWeekend = isSun || isSat;

          // Busy intensity: 0–4 scale
          const intensity = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));

          const busyBarColor =
            intensity >= 4 ? 'bg-red-400 dark:bg-red-500'
            : intensity >= 3 ? 'bg-orange-400 dark:bg-orange-500'
            : intensity >= 2 ? 'bg-amber-400 dark:bg-amber-500'
            : 'bg-indigo-400 dark:bg-indigo-500';

          const badgeColor =
            isSel
              ? 'bg-white/20 text-white'
              : intensity >= 4 ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
              : intensity >= 3 ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
              : intensity >= 2 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400';

          return (
            <button
              key={idx}
              onClick={() => cell.cur && onDateSelect(cell.date)}
              disabled={!cell.cur}
              className={`
                relative flex flex-col items-center justify-start pt-1.5 pb-1 gap-0.5
                h-14 sm:h-16
                border-b border-r border-gray-50 dark:border-gray-800/60
                transition-all duration-150 group
                ${!cell.cur
                  ? 'opacity-25 cursor-default'
                  : isSel
                  ? 'bg-indigo-600 dark:bg-indigo-600'
                  : 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer'
                }
              `}
            >
              {/* Date number */}
              <span
                className={`
                  w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold
                  transition-all duration-150 group-hover:scale-110
                  ${isSel
                    ? 'text-white'
                    : isToday
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-500/40'
                    : isWeekend
                    ? 'text-red-400 dark:text-red-500'
                    : 'text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {cell.date.getDate()}
              </span>

              {/* Today indicator ring on selected */}
              {isSel && isToday && (
                <span className="absolute top-1.5 w-7 h-7 rounded-full ring-2 ring-white/50" />
              )}

              {/* Booking count badge */}
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 rounded-full leading-tight ${badgeColor}`}>
                  {count}
                </span>
              )}

              {/* Busy bar at bottom */}
              {count > 0 && (
                <div
                  className={`absolute bottom-0 inset-x-1 h-0.5 rounded-full ${isSel ? 'bg-white/40' : busyBarColor}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-50 dark:border-gray-800/60 flex-wrap">
        {[
          { dot: 'bg-indigo-400', label: '1–2' },
          { dot: 'bg-amber-400',  label: '3–4' },
          { dot: 'bg-orange-400', label: '5–6' },
          { dot: 'bg-red-400',    label: '7+' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full ${l.dot}`} />
            {l.label} bookings
          </span>
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
