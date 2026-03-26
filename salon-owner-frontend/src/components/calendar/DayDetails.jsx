import React, { useState } from 'react';
import { Plus, CalendarDays, Check, X, Edit2, Clock, User, Scissors, IndianRupee, ChevronDown } from 'lucide-react';

const STATUS_CFG = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400',   badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800',   bar: 'bg-amber-400'   },
  confirmed:   { label: 'Confirmed',   dot: 'bg-indigo-500',  text: 'text-indigo-600 dark:text-indigo-400',  badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800', bar: 'bg-indigo-500'  },
  in_progress: { label: 'In Progress', dot: 'bg-violet-500',  text: 'text-violet-600 dark:text-violet-400',  badge: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-800', bar: 'bg-violet-500'  },
  completed:   { label: 'Completed',   dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800', bar: 'bg-emerald-500' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-gray-400',    text: 'text-gray-500 dark:text-gray-400',      badge: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700',               bar: 'bg-gray-400'    },
};

const cfg = (status) => STATUS_CFG[status] || STATUS_CFG.pending;

const toKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};

const isToday = (date) => toKey(new Date()) === toKey(date);

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div className="animate-pulse flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
    <div className="w-1 rounded-full bg-gray-100 dark:bg-gray-800 self-stretch" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4" />
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-1/2" />
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-1/3" />
    </div>
    <div className="w-16 h-5 bg-gray-100 dark:bg-gray-800 rounded-full" />
  </div>
);

/* ── Action menu per booking ── */
const ActionMenu = ({ booking, onEdit, onStatusChange }) => {
  const [open, setOpen] = useState(false);
  const canComplete   = ['pending', 'confirmed', 'in_progress'].includes(booking.status);
  const canProgress   = booking.status === 'confirmed';
  const canCancel     = ['pending', 'confirmed'].includes(booking.status);
  const canReactivate = booking.status === 'cancelled';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
            rounded-xl shadow-lg overflow-hidden w-40 py-1">
            <button
              onClick={() => { onEdit(booking); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Booking
            </button>
            {canProgress && (
              <button
                onClick={() => { onStatusChange(booking._id, 'in_progress'); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400
                  hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors text-left"
              >
                <Clock className="w-3.5 h-3.5" /> Mark In Progress
              </button>
            )}
            {canComplete && (
              <button
                onClick={() => { onStatusChange(booking._id, 'completed'); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400
                  hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors text-left"
              >
                <Check className="w-3.5 h-3.5" /> Mark Completed
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => { onStatusChange(booking._id, 'cancelled'); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
            {canReactivate && (
              <button
                onClick={() => { onStatusChange(booking._id, 'pending'); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400
                  hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left"
              >
                <Check className="w-3.5 h-3.5" /> Reactivate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ── Booking card ── */
const BookingCard = ({ booking, onEdit, onStatusChange }) => {
  const s = cfg(booking.status);
  return (
    <div className={`group flex gap-3 p-3 rounded-xl border transition-all duration-150
      ${booking.status === 'cancelled'
        ? 'opacity-60 border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40'
        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm'
      }`}
    >
      {/* Left color bar */}
      <div className={`w-1 rounded-full shrink-0 ${s.bar}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + status + actions */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {booking.customerName || 'Unknown Customer'}
            </p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${s.badge}`}>
            {s.label}
          </span>
          <ActionMenu booking={booking} onEdit={onEdit} onStatusChange={onStatusChange} />
        </div>

        {/* Row 2: Meta info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {booking.appointmentTime && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              {booking.appointmentTime}
              {booking.duration ? ` · ${booking.duration}m` : ''}
            </span>
          )}
          {(booking.serviceName || booking.service?.name) && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 truncate">
              <Scissors className="w-3 h-3 shrink-0" />
              {booking.serviceName || booking.service?.name}
            </span>
          )}
          {booking.totalAmount > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-3 h-3" />
              {booking.totalAmount}
            </span>
          )}
        </div>

        {/* Row 3: Customer phone if available */}
        {booking.customerPhone && (
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">{booking.customerPhone}</p>
        )}
      </div>
    </div>
  );
};

/* ── Timeline slot (mini) ── */
const TimelineBar = ({ bookings }) => {
  if (!bookings.length) return null;

  // Group by status for the mini count row
  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(counts).map(([status, count]) => {
        const s = cfg(status);
        return (
          <span key={status} className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {count} {s.label}
          </span>
        );
      })}
    </div>
  );
};

/* ── Main DayDetails component ── */
const DayDetails = ({ date, bookings = [], loading, onAddBooking, onEditBooking, onStatusChange }) => {
  const sorted = [...bookings].sort((a, b) =>
    (a.appointmentTime || '').localeCompare(b.appointmentTime || '')
  );

  const today   = isToday(date);
  const dateObj = date instanceof Date ? date : new Date(date);

  const dayLabel = today
    ? 'Today'
    : dateObj.toLocaleDateString('en-IN', { weekday: 'long' });

  const dateLabel = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden h-full min-h-[500px]">

      {/* ── Header ── */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{dayLabel}</h3>
              {today && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{dateLabel}</p>
          </div>

          <button
            onClick={onAddBooking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0
              bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold
              hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Status summary bar */}
        {sorted.length > 0 && !loading && (
          <div className="mt-3">
            <TimelineBar bookings={sorted} />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2.5">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>

        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
              <CalendarDays className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No bookings</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Tap "+ Add" to schedule one
            </p>
          </div>

        ) : (
          <div className="p-4 space-y-2">
            {sorted.map(b => (
              <BookingCard
                key={b._id}
                booking={b}
                onEdit={onEditBooking}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: total count ── */}
      {sorted.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-50 dark:border-gray-800/60 text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {sorted.length} booking{sorted.length !== 1 ? 's' : ''} scheduled
        </div>
      )}
    </div>
  );
};

export default DayDetails;
