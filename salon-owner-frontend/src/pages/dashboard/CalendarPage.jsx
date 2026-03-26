import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarDays, RefreshCw, ChevronLeft, ChevronRight, List, Grid3X3, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CalendarGrid    from '../../components/calendar/CalendarGrid';
import DayDetails      from '../../components/calendar/DayDetails';
import BookingModal    from '../../components/calendar/BookingModal';
import { useSalon }    from '../../hooks/useSalon';
import * as salonService from '../../services/salonService';

/* ─── helpers ───────────────────────────────────────────────── */
const toKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ─── Stat card ──────────────────────────────────────────────── */
const StatCard = ({ label, value, color, bg }) => (
  <div className={`${bg} rounded-2xl p-4 border border-white/50 dark:border-gray-800`}>
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
  </div>
);

/* ─── Weekly mini view ───────────────────────────────────────── */
const WeekView = ({ weekStart, bookingsByDate, selectedDate, onDateSelect }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayKey = toKey(today());
  const selKey   = toKey(selectedDate);

  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1">
      {days.map((d, i) => {
        const key   = toKey(d);
        const count = bookingsByDate[key]?.length || 0;
        const isTod = key === todayKey;
        const isSel = key === selKey;

        return (
          <button
            key={i}
            onClick={() => onDateSelect(d)}
            className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-2.5 rounded-xl shrink-0
              flex-1 min-w-[40px] transition-all duration-150
              ${isSel
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : isTod
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
              }
            `}
          >
            <span className="text-[10px] font-semibold opacity-70">{DAY_NAMES[d.getDay()]}</span>
            <span className="text-sm font-bold">{d.getDate()}</span>
            {count > 0 && (
              <span className={`text-[9px] font-bold px-1 rounded-full
                ${isSel ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ─── Main page ──────────────────────────────────────────────── */
export default function CalendarPage() {
  const { salon, services, fetchServices } = useSalon();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode,     setViewMode]     = useState('month'); // 'month' | 'week'
  const [weekStart,    setWeekStart]    = useState(() => {
    const d = today();
    d.setDate(d.getDate() - d.getDay()); // go to Sunday
    return d;
  });

  const [allBookings,  setAllBookings]  = useState([]);
  const [dayLoading,   setDayLoading]   = useState(false);
  const [pageLoading,  setPageLoading]  = useState(false);
  const [modalState,   setModalState]   = useState(null); // {mode:'add'|'edit', booking:null|{...}}

  /* ── Fetch all bookings (no date filter = recent bookings for calendar badges) ── */
  const loadBookings = useCallback(async (silent = false) => {
    if (!silent) setPageLoading(true);
    try {
      const res = await salonService.getBookings({});
      setAllBookings(Array.isArray(res.data) ? res.data : []);
    } catch {
      if (!silent) toast.error('Failed to load bookings');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!services.length) fetchServices();
    loadBookings();
  }, []);  // eslint-disable-line

  /* ── Group by date for calendar badges ── */
  const bookingsByDate = useMemo(() => {
    const map = {};
    allBookings.forEach(b => {
      const k = b.appointmentDate ? toKey(new Date(b.appointmentDate)) : null;
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(b);
    });
    return map;
  }, [allBookings]);

  /* ── Bookings for selected date ── */
  const dayBookings = useMemo(() => {
    return bookingsByDate[toKey(selectedDate)] || [];
  }, [selectedDate, bookingsByDate]);

  /* ── Month navigation ── */
  const handleMonthChange = (dir) => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  /* ── Week navigation ── */
  const handleWeekChange = (dir) => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  /* ── Date select ── */
  const handleDateSelect = (date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    setSelectedDate(d);
    // Sync month view to stay in the selected month
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  /* ── Open add modal ── */
  const handleAddBooking = () => {
    setModalState({ mode: 'add', booking: null });
  };

  /* ── Open edit modal ── */
  const handleEditBooking = (booking) => {
    setModalState({ mode: 'edit', booking });
  };

  /* ── Status change ── */
  const handleStatusChange = useCallback(async (bookingId, status) => {
    try {
      await salonService.updateBookingStatus(bookingId, status);
      setAllBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
      const labels = { completed: 'Completed', cancelled: 'Cancelled', confirmed: 'Confirmed', in_progress: 'In Progress', pending: 'Pending' };
      toast.success(`Booking marked as ${labels[status] || status}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update booking');
    }
  }, []);

  /* ── Save (add / edit) ── */
  const handleSave = useCallback(async (formData) => {
    try {
      if (modalState.mode === 'add') {
        const payload = {
          customerName:    formData.customerName,
          customerPhone:   formData.customerPhone,
          serviceId:       formData.serviceId,
          appointmentDate: formData.date,
          appointmentTime: formData.time,
          duration:        formData.duration,
          salonId:         salon?._id,
        };
        const res = await salonService.createWalkInBooking(payload);
        if (res?.data) {
          setAllBookings(prev => [res.data, ...prev]);
          toast.success('Booking added!');
        }
      } else {
        // Edit: update status (and other fields where API allows)
        await salonService.updateBookingStatus(modalState.booking._id, formData.status);
        setAllBookings(prev =>
          prev.map(b => b._id === modalState.booking._id ? { ...b, status: formData.status } : b)
        );
        toast.success('Booking updated!');
      }
      setModalState(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save booking');
      throw err; // let modal show saving=false
    }
  }, [modalState, salon]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const todayKey = toKey(today());
    return {
      todayCount: bookingsByDate[todayKey]?.length || 0,
      total:      allBookings.length,
      pending:    allBookings.filter(b => b.status === 'pending').length,
      completed:  allBookings.filter(b => b.status === 'completed').length,
    };
  }, [allBookings, bookingsByDate]);

  /* ── Default date string for modal ── */
  const defaultDateStr = toKey(selectedDate);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <CalendarDays className="w-5 h-5 text-white" />
                </div>
                Calendar
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
                Manage bookings and your daily schedule
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View toggle */}
              <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('month')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'month'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" /> Month
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'week'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Week
                </button>
              </div>

              <button
                onClick={() => loadBookings()}
                disabled={pageLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                  text-sm font-medium text-gray-600 dark:text-gray-300
                  hover:bg-white dark:hover:bg-gray-800 bg-white dark:bg-gray-900 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${pageLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleAddBooking}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                  bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
                  hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/20"
              >
                + Add Booking
              </button>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Today"    value={stats.todayCount} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60" />
            <StatCard label="Total"    value={stats.total}      color="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/60" />
            <StatCard label="Pending"  value={stats.pending}    color="text-amber-600 dark:text-amber-400"   bg="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60" />
            <StatCard label="Completed" value={stats.completed}  color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60" />
          </div>

          {/* ── Loading overlay ── */}
          {pageLoading && (
            <div className="flex items-center justify-center py-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading bookings…
              </div>
            </div>
          )}

          {/* ── Week view strip ── */}
          {viewMode === 'week' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => handleWeekChange(-1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
                    hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' – '}
                  {(() => { const e = new Date(weekStart); e.setDate(e.getDate() + 6); return e.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); })()}
                </span>
                <button
                  onClick={() => handleWeekChange(1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
                    hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <WeekView
                weekStart={weekStart}
                bookingsByDate={bookingsByDate}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </div>
          )}

          {/* ── Main grid: Calendar + Day Details ── */}
          <div className={`grid gap-5 ${viewMode === 'month' ? 'lg:grid-cols-[1fr_360px]' : 'grid-cols-1 lg:grid-cols-[1fr_360px]'}`}>

            {/* Left: calendar grid (month view only) or empty spacer in week mode */}
            {viewMode === 'month' ? (
              <CalendarGrid
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                bookingsByDate={bookingsByDate}
                onDateSelect={handleDateSelect}
                onMonthChange={handleMonthChange}
              />
            ) : (
              /* In week mode, show a compact timeline of the week's bookings */
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" /> Week Overview
                  </h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(weekStart);
                    d.setDate(d.getDate() + i);
                    const key    = toKey(d);
                    const bks    = bookingsByDate[key] || [];
                    const isTod  = key === toKey(today());
                    const isSel  = key === toKey(selectedDate);
                    return (
                      <button
                        key={i}
                        onClick={() => handleDateSelect(d)}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all
                          ${isSel ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                      >
                        <div className={`w-10 text-center shrink-0`}>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase">
                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}
                          </p>
                          <p className={`text-lg font-bold ${isTod ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {d.getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          {bks.length === 0 ? (
                            <p className="text-xs text-gray-300 dark:text-gray-600">No bookings</p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {bks.slice(0, 4).map(b => (
                                <span key={b._id}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-medium truncate max-w-[80px]">
                                  {b.appointmentTime} {b.customerName?.split(' ')[0]}
                                </span>
                              ))}
                              {bks.length > 4 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
                                  +{bks.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {bks.length > 0 && (
                          <span className="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                            {bks.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right: Day details */}
            <DayDetails
              date={selectedDate}
              bookings={dayBookings}
              loading={dayLoading}
              onAddBooking={handleAddBooking}
              onEditBooking={handleEditBooking}
              onStatusChange={handleStatusChange}
            />
          </div>

        </div>
      </div>

      {/* ── Booking modal ── */}
      {modalState && (
        <BookingModal
          isOpen={true}
          onClose={() => setModalState(null)}
          booking={modalState.booking}
          services={services}
          salon={salon}
          onSave={handleSave}
          defaultDate={defaultDateStr}
        />
      )}
    </DashboardLayout>
  );
}
