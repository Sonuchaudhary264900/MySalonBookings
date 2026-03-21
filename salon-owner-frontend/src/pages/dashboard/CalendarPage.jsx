import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { formatTime } from '../../utils/exportHelpers';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_COLORS = {
  confirmed:   { bg: 'bg-green-100',  text: 'text-green-700',  bar: 'bg-green-500'  },
  pending:     { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' },
  completed:   { bg: 'bg-blue-100',   text: 'text-blue-700',   bar: 'bg-blue-500'   },
  cancelled:   { bg: 'bg-red-100',    text: 'text-red-600',    bar: 'bg-red-500'    },
  in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', bar: 'bg-purple-500' },
};

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]               = useState(today.getFullYear());
  const [month, setMonth]             = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  const [bookingDates, setBookingDates] = useState({});
  const [dayBookings, setDayBookings]   = useState([]);
  const [loadingDay, setLoadingDay]     = useState(false);

  const fetchMonthBookings = useCallback(async (y, m) => {
    try {
      const startDate = `${y}-${String(m + 1).padStart(2,'0')}-01`;
      const lastDay   = new Date(y, m + 1, 0).getDate();
      const endDate   = `${y}-${String(m + 1).padStart(2,'0')}-${lastDay}`;
      const res = await api.get(`/owner/bookings?startDate=${startDate}&endDate=${endDate}`);
      const d = res.data.data;
      const list = Array.isArray(d) ? d : (d?.bookings || []);
      const counts = {};
      list.forEach((b) => {
        const dateStr = (b.appointmentDate || b.date || '').slice(0, 10);
        if (dateStr) counts[dateStr] = (counts[dateStr] || 0) + 1;
      });
      setBookingDates(counts);
    } catch {
      setBookingDates({});
    }
  }, []);

  const fetchDayBookings = useCallback(async (dateStr) => {
    setLoadingDay(true);
    try {
      const res = await api.get(`/owner/bookings?date=${dateStr}`);
      const d = res.data.data;
      setDayBookings(Array.isArray(d) ? d : (d?.bookings || []));
    } catch {
      setDayBookings([]);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  useEffect(() => { fetchMonthBookings(year, month); }, [year, month, fetchMonthBookings]);
  useEffect(() => { fetchDayBookings(selectedDate); }, [selectedDate, fetchDayBookings]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = toDateStr(today);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage bookings by date</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Calendar Card */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Month Navigator */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <ChevronLeft className="w-5 h-5 text-indigo-600" />
              </button>
              <span className="font-bold text-gray-900 text-lg">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <ChevronRight className="w-5 h-5 text-indigo-600" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEK_DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 p-2 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const count      = bookingDates[dateStr] || 0;
                const isToday    = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition
                      ${isSelected ? 'bg-indigo-600 text-white' : isToday ? 'border-2 border-indigo-600 text-indigo-600' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {day}
                    {count > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Bookings Panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-bold text-gray-900">
                {selectedDate === todayStr ? 'Today' : selectedDate}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingDay ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : dayBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Calendar className="w-10 h-10 text-gray-300" />
                  <p className="text-gray-400 text-sm">No bookings for this day</p>
                </div>
              ) : (
                dayBookings.map((b) => {
                  const colors = STATUS_COLORS[b.status] || { bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-400' };
                  return (
                    <div key={b._id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <div className={`w-1 self-stretch rounded-full ${colors.bar}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{b.customerName || 'Customer'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{b.serviceName} · {formatTime(b.appointmentTime)}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${colors.bg} ${colors.text}`}>
                        {b.status?.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
