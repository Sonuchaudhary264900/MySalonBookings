import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Users, Clock, CheckCircle2, XCircle, PlayCircle, Loader2,
  RefreshCw, Phone, Scissors, ArrowRight, Timer, ListOrdered,
  AlertCircle, CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import * as salonService from '../../services/salonService';
import { useSalon } from '../../hooks/useSalon';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   text: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40'   },
  confirmed:   { label: 'Confirmed',   dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  in_progress: { label: 'In Progress', dot: 'bg-violet-500',  text: 'text-violet-700 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-950/40'  },
};

const QUEUE_STATUSES = ['pending', 'confirmed', 'in_progress'];

/* ─── Skeleton ───────────────────────────────────────────────── */
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />
);

/* ─── Position badge ─────────────────────────────────────────── */
const PosBadge = ({ pos }) => {
  if (pos === 0) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-300 dark:shadow-indigo-900">1</span>;
  if (pos === 1) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">2</span>;
  if (pos === 2) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold">3</span>;
  return <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold">{pos + 1}</span>;
};

/* ─── Queue Card ─────────────────────────────────────────────── */
const QueueCard = ({ booking, pos, onAction, actioning }) => {
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isActioning = actioning === booking._id;

  const actions = [];
  if (booking.status === 'pending')     actions.push({ label: 'Confirm',  status: 'confirmed',   icon: CheckCircle2, cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' });
  if (booking.status === 'confirmed')   actions.push({ label: 'Start',    status: 'in_progress', icon: PlayCircle,   cls: 'bg-violet-600 hover:bg-violet-700 text-white' });
  if (['confirmed','in_progress'].includes(booking.status)) {
    actions.push({ label: 'Complete', status: 'completed', icon: CheckCheck, cls: 'bg-blue-600 hover:bg-blue-700 text-white' });
    actions.push({ label: 'No Show',  status: 'no_show',   icon: XCircle,    cls: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' });
  }
  if (booking.status === 'pending') {
    actions.push({ label: 'Cancel', status: 'cancelled', icon: XCircle, cls: 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400' });
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${pos === 0 ? 'ring-2 ring-indigo-500/30' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <PosBadge pos={pos} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{booking.customerName || 'Walk-in'}</p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} shrink-0`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: 'currentColor', opacity: 0.8 }} />
                {cfg.label}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              {booking.serviceName && (
                <span className="flex items-center gap-1">
                  <Scissors className="w-3 h-3" />
                  {booking.serviceName}
                </span>
              )}
              {booking.appointmentTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {booking.appointmentTime}
                </span>
              )}
              {booking.customerPhone && (
                <a href={`tel:${booking.customerPhone}`} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <Phone className="w-3 h-3" />
                  {booking.customerPhone}
                </a>
              )}
              {booking.totalAmount > 0 && (
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹{booking.totalAmount}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        {actions.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {actions.map(({ label, status, icon: Icon, cls }) => (
              <button
                key={status}
                onClick={() => onAction(booking._id, status)}
                disabled={isActioning}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${cls}`}
              >
                {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────── */
export default function QueuePage() {
  const { salon } = useSalon();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    document.title = 'Live Queue — GlowLoox';
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await salonService.getBookings({ date: today() });
      const active = (res.data || [])
        .filter(b => QUEUE_STATUSES.includes(b.status))
        .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
      setQueue(active);
      setLastUpdated(new Date());
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  /* ── Socket real-time ── */
  useEffect(() => {
    if (!salon?._id) return;
    const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-salon', salon._id));
    socket.on('booking-updated', fetchQueue);
    socket.on('new-booking', fetchQueue);
    socket.on('queue-updated', fetchQueue);
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [salon?._id, fetchQueue]);

  const handleAction = async (bookingId, status) => {
    setActioning(bookingId);
    try {
      await api.put(`/owner/bookings/${bookingId}`, { status });
      toast.success(status === 'completed' ? 'Booking completed!' : status === 'no_show' ? 'Marked as no-show' : 'Status updated');
      fetchQueue();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActioning(null);
    }
  };

  const inProgress = queue.filter(b => b.status === 'in_progress');
  const upcoming   = queue.filter(b => b.status !== 'in_progress');

  const now = new Date();
  const updatedLabel = lastUpdated
    ? Math.round((now - lastUpdated) / 1000) < 10
      ? 'Updated just now'
      : `Updated ${Math.round((now - lastUpdated) / 1000)}s ago`
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Queue</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? 'Loading…' : `${queue.length} active booking${queue.length !== 1 ? 's' : ''} today`}
              {updatedLabel && <span className="ml-2 text-gray-400 dark:text-gray-600 text-xs">· {updatedLabel}</span>}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchQueue(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 self-start"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats strip */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'In Progress', count: inProgress.length, icon: Timer, bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400' },
              { label: 'Upcoming',    count: upcoming.length,   icon: ListOrdered, bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Total Today', count: queue.length,      icon: Users, bg: 'bg-gray-50 dark:bg-gray-800/60', text: 'text-gray-600 dark:text-gray-400' },
            ].map(({ label, count, icon: Icon, bg, text }) => (
              <div key={label} className={`rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 flex items-center gap-3 ${bg}`}>
                <Icon className={`w-5 h-5 shrink-0 ${text}`} />
                <div>
                  <p className={`text-xl font-bold ${text}`}>{count}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-7 h-7 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-24 rounded-xl" />
                  <Skeleton className="h-7 w-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* In Progress section */}
        {!loading && inProgress.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">In Progress</h2>
            </div>
            {inProgress.map((b, i) => (
              <QueueCard key={b._id} booking={b} pos={i} onAction={handleAction} actioning={actioning} />
            ))}
          </div>
        )}

        {/* Upcoming section */}
        {!loading && upcoming.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {inProgress.length > 0 ? 'Up Next' : 'Queue'}
              </h2>
            </div>
            {upcoming.map((b, i) => (
              <QueueCard key={b._id} booking={b} pos={i} onAction={handleAction} actioning={actioning} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && queue.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-14 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Queue is clear</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No active bookings for today. New bookings will appear here automatically.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
