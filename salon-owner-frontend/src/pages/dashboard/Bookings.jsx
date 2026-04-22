import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar, Clock, Phone, User, IndianRupee, Scissors, X, Plus,
  ShieldOff, ShieldCheck, CalendarOff, ChevronDown, MoreHorizontal,
  CheckCircle, XCircle, PlayCircle, Loader2, MessageSquare, AlertTriangle, Users,
  Timer, Banknote, Info, WifiOff, UserX, Search, CreditCard, RotateCcw, Receipt,
  Square, CheckSquare, Ban, Download,
} from 'lucide-react';
import BulkActionBar from '../../components/BulkActionBar';
import { showUndoToast } from '../../components/UndoToast';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSalon } from '../../hooks/useSalon';
import * as salonService from '../../services/salonService';
import { formatDate, formatTime } from '../../utils/exportHelpers';
import api from '../../services/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const today   = localDate(0);
const maxDate = localDate(30);

/* ─── Status config ──────────────────────────────────────────── */
const STATUS_CFG = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/60' },
  confirmed:   { label: 'Confirmed',   dot: 'bg-indigo-500',  badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800/60' },
  in_progress: { label: 'In Progress', dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-800/60' },
  completed:   { label: 'Completed',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/60' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800/60' },
  no_show:     { label: 'No Show',     dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-800/60' },
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';
const CHAT_OPEN = new Set(['pending', 'confirmed', 'in_progress']);

const FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'pending',     label: 'Pending' },
  { id: 'confirmed',   label: 'Confirmed' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed',   label: 'Completed' },
  { id: 'cancelled',   label: 'Cancelled' },
  { id: 'no_show',     label: 'No Show' },
];

/* ─── InfoTip (Fix 13) ───────────────────────────────────────── */
const InfoTip = ({ children }) => (
  <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
    <Info className="w-3.5 h-3.5 shrink-0" />
    {children}
  </span>
);

/* ─── Payment Badge ──────────────────────────────────────────── */
const getPaymentBadge = (b) => {
  if (b.refundStatus === 'full')
    return { label: 'Refunded', icon: RotateCcw, cls: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800/50' };
  if (b.paymentStatus === 'failed')
    return { label: 'Pay Failed', icon: XCircle, cls: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/50' };
  if (b.refundStatus === 'partial')
    return { label: 'Part Refund', icon: RotateCcw, cls: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-800/50' };
  if (b.paymentMethod === 'cash' && b.cashCollected)
    return { label: 'Cash Collected', icon: Banknote, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50' };
  if (b.paymentMethod === 'cash' && !b.cashCollected)
    return { label: 'Cash Due', icon: Banknote, cls: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/50' };
  if (b.paymentStatus === 'completed')
    return { label: 'Paid Online', icon: CreditCard, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50' };
  return { label: 'Unpaid', icon: CreditCard, cls: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/50' };
};

const PaymentBadge = ({ booking }) => {
  if (!booking.totalAmount) return null;
  const { label, icon: Icon, cls } = getPaymentBadge(booking);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ${cls}`}>
      <Icon className="w-2.5 h-2.5 shrink-0" />
      {label}
    </span>
  );
};

/* ─── Skeleton row ───────────────────────────────────────────── */
const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-100 dark:border-gray-800">
    {[48, 40, 36, 32, 28, 24].map((w, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className={`h-4 rounded-lg bg-gray-200 dark:bg-gray-800`} style={{ width: `${w * 2}px` }} />
      </td>
    ))}
  </tr>
);

/* ─── Empty State ────────────────────────────────────────────── */
const EmptyState = ({ filter, onAddWalkIn, searchQuery, onClearSearch }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 animate-[fadeup_0.4s_ease_both]">
    <style>{`@keyframes fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
    <div className="relative mb-6">
      <div className="absolute inset-0 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 scale-150 blur-xl" />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950
        flex items-center justify-center shadow-inner">
        {searchQuery ? <Search className="w-9 h-9 text-indigo-400 dark:text-indigo-500" /> : <CalendarOff className="w-9 h-9 text-indigo-400 dark:text-indigo-500" />}
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
      {searchQuery ? `No results for "${searchQuery}"` : filter === 'all' ? 'No bookings yet' : `No ${filter.replace('_', ' ')} bookings`}
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8">
      {searchQuery
        ? 'Try a different name, phone number, or booking ID.'
        : filter === 'all'
          ? 'Bookings will appear here once customers start scheduling appointments.'
          : `There are no ${filter.replace('_', ' ')} bookings for this date.`}
    </p>
    {searchQuery ? (
      <button
        onClick={onClearSearch}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
          text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-4 h-4" /> Clear search
      </button>
    ) : filter === 'all' && (
      <button
        onClick={onAddWalkIn}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl
          bg-gradient-to-r from-indigo-600 to-violet-600
          hover:from-indigo-500 hover:to-violet-500
          text-white text-sm font-semibold transition-all duration-200
          shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105"
      >
        <Plus className="w-4 h-4" />
        Add Walk-in Booking
      </button>
    )}
  </div>
);

/* ─── Row action dropdown ────────────────────────────────────── */
const ActionDropdown = ({ booking, updating, onStatusChange, isBlocked, blockLoading, onToggleBlock, onMarkLate, onCollectCash, lateLoading, cashLoading, onReschedule }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const NEXT = {
    pending:     [{ status:'confirmed',   label:'Confirm',       icon: CheckCircle, cls:'text-indigo-600 dark:text-indigo-400' },
                  { status:'cancelled',   label:'Cancel',        icon: XCircle,     cls:'text-red-600 dark:text-red-400' },
                  { status:'no_show',     label:'No-show',       icon: UserX,       cls:'text-orange-600 dark:text-orange-400' }],
    confirmed:   [{ status:'in_progress', label:'Start',         icon: PlayCircle,  cls:'text-violet-600 dark:text-violet-400' },
                  { status:'cancelled',   label:'Cancel',        icon: XCircle,     cls:'text-red-600 dark:text-red-400' },
                  { status:'no_show',     label:'No-show',       icon: UserX,       cls:'text-orange-600 dark:text-orange-400' }],
    in_progress: [{ status:'completed',   label:'Mark Complete', icon: CheckCircle, cls:'text-emerald-600 dark:text-emerald-400' }],
    completed:   [],
    cancelled:   [],
    no_show:     [],
  };

  const actions = NEXT[booking.status] || [];
  const showBlock   = !booking.isWalkIn && booking.customerId;
  const showLate    = ['pending','confirmed'].includes(booking.status) && !booking.lateMarkedAt;
  const showCash    = booking.paymentMethod === 'cash' && !booking.cashCollected && booking.status !== 'cancelled';
  const showPushWarn = booking.pushFailures?.length > 0;

  const hasExtras   = showBlock || showLate || showCash;
  if (!actions.length && !hasExtras) return <span className="text-xs text-gray-400 dark:text-gray-600">—</span>;

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(v => !v);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={updating}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500
          hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
      >
        {updating
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <MoreHorizontal className="w-4 h-4" />}
      </button>

      {/* Fix 9: push failure indicator */}
      {showPushWarn && (
        <span title="Push notification failed" className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-52 rounded-xl shadow-2xl
              bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
              py-1 animate-[fadeup_0.12s_ease_both]"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            {actions.map(({ status, label, icon: Icon, cls }) => (
              <button key={status}
                onClick={() => { onStatusChange(booking._id, status); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                <Icon className={`w-4 h-4 shrink-0 ${cls}`} />
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
              </button>
            ))}

            {/* Fix 8: Mark Late */}
            {showLate && (
              <>
                {actions.length > 0 && <div className="border-t border-gray-100 dark:border-gray-800 my-1" />}
                <button
                  onClick={() => { onMarkLate(booking._id); setOpen(false); }}
                  disabled={lateLoading}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
                >
                  <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400">Mark Late</span>
                </button>
              </>
            )}
            {booking.lateMarkedAt && (
              <p className="px-3.5 py-1 text-[10px] text-orange-500 dark:text-orange-400 font-medium">Late — moved to end</p>
            )}

            {/* Fix 10: Collect Cash */}
            {showCash && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <button
                  onClick={() => { onCollectCash(booking._id); setOpen(false); }}
                  disabled={cashLoading}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
                >
                  <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400">Mark Cash Collected</span>
                </button>
              </>
            )}
            {booking.cashCollected && (
              <p className="px-3.5 py-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Cash collected</p>
            )}

            {/* Reschedule */}
            {['pending','confirmed'].includes(booking.status) && (booking.rescheduleCount || 0) < 2 && onReschedule && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <button
                  onClick={() => { onReschedule(booking); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span className="text-violet-700 dark:text-violet-400">Reschedule</span>
                  {(booking.rescheduleCount || 0) > 0 && (
                    <span className="ml-auto text-[10px] text-gray-400">{booking.rescheduleCount}/2</span>
                  )}
                </button>
              </>
            )}

            {showBlock && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <button
                  onClick={() => { onToggleBlock(booking.customerId, isBlocked); setOpen(false); }}
                  disabled={blockLoading}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
                >
                  {isBlocked
                    ? <><ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /><span className="text-gray-700 dark:text-gray-300">Unblock Customer</span></>
                    : <><ShieldOff className="w-4 h-4 text-red-500 shrink-0" /><span className="text-red-600 dark:text-red-400">Block Customer</span></>}
                </button>
              </>
            )}

            {/* Fix 9: push failure warning */}
            {showPushWarn && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <div className="flex items-center gap-2 px-3.5 py-2">
                  <WifiOff className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-[11px] text-orange-500 dark:text-orange-400">Push notification failed ({booking.pushFailures.length}x)</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Walk-in Modal ──────────────────────────────────────────── */
const WalkInModal = ({ salon, services, onClose, onSuccess }) => {
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate]         = useState(today);
  const [slot, setSlot]         = useState('');
  const [slots, setSlots]       = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const selectedService = services.find(s => s._id === serviceId);
  const timeToMinutes   = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const isPastSlot      = s => date === today && timeToMinutes(s) <= new Date().getHours()*60+new Date().getMinutes();

  useEffect(() => {
    if (!selectedService || !date || !salon?._id) return;
    setSlot(''); setSlots([]); setBlockedSlots([]); setClosedDay(false);
    setSlotsLoading(true);
    salonService.getBookedSlots(String(salon._id), date, selectedService.duration)
      .then(data => { setSlots(data.slots||[]); setBlockedSlots(data.blockedSlots||[]); setClosedDay(data.closedDay||false); })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [serviceId, date, salon?._id]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!name.trim())  { setError('Customer name is required'); return; }
    if (!phone.trim()) { setError('Customer phone is required'); return; }
    if (!serviceId)    { setError('Please select a service'); return; }
    if (!slot)         { setError('Please select a time slot'); return; }
    setError(''); setSubmitting(true);
    try {
      await onSuccess({ customerName:name.trim(), customerPhone:phone.trim(), serviceId, appointmentDate:date, appointmentTime:slot });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally { setSubmitting(false); }
  };

  const INP = `w-full px-3.5 py-2.5 rounded-xl border text-sm
    bg-white dark:bg-gray-800/70
    border-gray-200 dark:border-gray-700
    text-gray-900 dark:text-white
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
    transition-colors`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Walk-in Customer</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter customer name" required className={INP} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 9876543210" required className={INP} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} required className={INP}>
              <option value="">Select a service…</option>
              {services.map(s => (
                <option key={s._id} value={s._id}>{s.name} — {s.duration} min — ₹{s.basePrice}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
            <input type="date" min={today} max={maxDate} value={date}
              onChange={e => setDate(e.target.value)} required className={INP} />
          </div>

          {serviceId && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Time Slot
                {selectedService && <span className="ml-2 text-xs font-normal text-gray-400">({selectedService.duration} min)</span>}
              </label>
              {slotsLoading ? (
                <div className="flex items-center gap-2 py-3 text-gray-400 dark:text-gray-500 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Loading slots…
                </div>
              ) : closedDay ? (
                <p className="text-sm text-amber-600 dark:text-amber-400 py-2">Salon is closed on this day.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-2">No slots available for this date.</p>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-300 dark:bg-gray-600" /> Past</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400" /> Booked</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-indigo-500" /> Selected</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slots.map(s => {
                      const past    = isPastSlot(s);
                      const blocked = !past && blockedSlots.includes(s);
                      const selected = slot === s;
                      const [h,m]   = s.split(':').map(Number);
                      const endMin  = h*60 + m + (selectedService?.duration||30);
                      const endTime = `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`;
                      return (
                        <button key={s} type="button"
                          onClick={() => { if (!past && !blocked) setSlot(s); }}
                          className={`py-2 px-1 text-xs rounded-xl border transition-all font-medium text-center leading-tight ${
                            past    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                            : blocked ? 'bg-red-50 dark:bg-red-950/30 text-red-400 border-red-200 dark:border-red-800 cursor-not-allowed'
                            : selected ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }`}>
                          <span className="block">{s}</span>
                          <span className="block opacity-60">– {endTime}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {slot && selectedService && (
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-3.5 text-sm">
              <p className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Booking Summary</p>
              <div className="space-y-1.5 text-indigo-700 dark:text-indigo-400">
                <div className="flex justify-between"><span>Customer</span><span className="font-medium text-indigo-900 dark:text-indigo-200">{name||'—'}</span></div>
                <div className="flex justify-between"><span>Service</span><span className="font-medium text-indigo-900 dark:text-indigo-200">{selectedService.name}</span></div>
                <div className="flex justify-between"><span>Time</span><span className="font-medium text-indigo-900 dark:text-indigo-200">{slot}</span></div>
                <div className="flex justify-between border-t border-indigo-200 dark:border-indigo-800 pt-1.5 mt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-100">₹{selectedService.basePrice}</span>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || !slot}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
              bg-gradient-to-r from-indigo-600 to-violet-600
              hover:from-indigo-500 hover:to-violet-500
              text-white shadow-lg shadow-indigo-500/25
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
              flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Creating Booking…' : 'Confirm Walk-in Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Reschedule Modal ───────────────────────────────────────── */
const RescheduleModal = ({ booking, salon, services, onClose, onSuccess }) => {
  const [date, setDate]           = useState(today);
  const [slot, setSlot]           = useState('');
  const [slots, setSlots]         = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const serviceDuration = (booking.services?.[0]?.duration) || (booking.estimatedDuration) || 30;
  const timeToMinutes   = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const isPastSlot      = s => date === today && timeToMinutes(s) <= new Date().getHours()*60+new Date().getMinutes();

  useEffect(() => {
    if (!date || !salon?._id) return;
    setSlot(''); setSlots([]); setBlockedSlots([]); setClosedDay(false);
    setSlotsLoading(true);
    salonService.getBookedSlots(String(salon._id), date, serviceDuration)
      .then(data => { setSlots(data.slots||[]); setBlockedSlots(data.blockedSlots||[]); setClosedDay(data.closedDay||false); })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [date, salon?._id]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!slot) { setError('Please select a time slot'); return; }
    setError(''); setSubmitting(true);
    try {
      await onSuccess({ newDate: date, newTime: slot });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reschedule');
    } finally { setSubmitting(false); }
  };

  const INP = `w-full px-3.5 py-2.5 rounded-xl border text-sm
    bg-white dark:bg-gray-800/70 border-gray-200 dark:border-gray-700
    text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md my-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Reschedule Booking</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">{booking.customerName} · {booking.serviceName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {(booking.rescheduleCount || 0) > 0 && (
          <div className="mx-5 mt-4 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-700 dark:text-amber-400">
            Reschedule {booking.rescheduleCount}/2 used — {2 - (booking.rescheduleCount || 0)} remaining
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Date</label>
            <input type="date" min={today} max={maxDate} value={date} onChange={e => setDate(e.target.value)} required className={INP} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Time Slot
              <span className="ml-2 text-xs font-normal text-gray-400">({serviceDuration} min)</span>
            </label>
            {slotsLoading ? (
              <div className="flex items-center gap-2 py-3 text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Loading slots…
              </div>
            ) : closedDay ? (
              <p className="text-sm text-amber-600 dark:text-amber-400 py-2">Salon is closed on this day.</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">No slots available for this date.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {slots.map(s => {
                  const past    = isPastSlot(s);
                  const blocked = !past && blockedSlots.includes(s);
                  const selected = slot === s;
                  const endMin  = timeToMinutes(s) + serviceDuration;
                  const endTime = `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`;
                  return (
                    <button key={s} type="button"
                      onClick={() => { if (!past && !blocked) setSlot(s); }}
                      className={`py-2 px-1 text-xs rounded-xl border transition-all font-medium text-center leading-tight ${
                        past    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 cursor-not-allowed'
                        : blocked ? 'bg-red-50 dark:bg-red-950/30 text-red-400 border-red-200 cursor-not-allowed'
                        : selected ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:text-violet-600'
                      }`}>
                      <span className="block">{s}</span>
                      <span className="block opacity-60">– {endTime}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting || !slot}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
              bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
              text-white shadow-lg shadow-violet-500/25
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Rescheduling…' : 'Confirm Reschedule'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Booking Table Row ──────────────────────────────────────── */
const BookingRow = ({ booking, updating, onStatusChange, isBlocked, blockLoading, onToggleBlock, onOpenChat, hasUnread, staffList, onReload, onMarkLate, onCollectCash, lateLoading, cashLoading, onReschedule, onPrintReceipt, selected, onToggleSelect }) => {
  const cfg = STATUS_CFG[booking.status] || { label: booking.status, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' };
  const dateStr = booking.appointmentDate ? formatDate(booking.appointmentDate) : '—';

  return (
    <tr className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group ${selected ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}`}>
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3.5 w-8">
        <button
          onClick={() => onToggleSelect(booking._id)}
          className="text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {selected ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <Square className="w-4 h-4" />}
        </button>
      </td>
      {/* Customer */}
      <td className="px-4 py-3.5 min-w-[180px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {(booking.customerName || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{booking.customerName || 'Unknown'}</p>
            {booking.customerPhone && (
              <a href={`tel:${booking.customerPhone}`}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                <Phone className="w-3 h-3" />
                {booking.customerPhone}
              </a>
            )}
          </div>
        </div>
      </td>

      {/* Service */}
      <td className="px-4 py-3.5 min-w-[140px]">
        <div className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 shrink-0" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{booking.serviceName || '—'}</span>
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {!booking.barberId && (
            <AssignPopover booking={booking} staffList={staffList} onAssigned={onReload} />
          )}
          {booking.barberName && booking.barberId && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 font-medium">{booking.staffName || booking.barberName}</span>
          )}
          {booking.isWalkIn && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">Walk-in</span>
          )}
          {booking.customerGender && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              booking.customerGender === 'male'
                ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                : 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400'
            }`}>
              {booking.customerGender === 'male' ? 'Male' : 'Female'}
            </span>
          )}
        </div>
      </td>

      {/* Date & Time */}
      <td className="px-4 py-3.5 min-w-[140px]">
        <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 shrink-0" />
          {dateStr}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          <Clock className="w-3 h-3 shrink-0" />
          {formatTime(booking.appointmentTime)}
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
          <IndianRupee className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          {booking.totalAmount ?? '—'}
        </div>
        <div className="mt-1">
          <PaymentBadge booking={booking} />
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-1.5">
          {booking.status === 'completed' && onPrintReceipt && (
            <button
              onClick={() => onPrintReceipt(booking._id)}
              title="Download receipt"
              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30
                text-emerald-400 dark:text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400
                transition-colors"
            >
              <Receipt className="w-4 h-4" />
            </button>
          )}
          {CHAT_OPEN.has(booking.status) && (
            <button
              onClick={() => onOpenChat(booking)}
              title="Chat with customer"
              className="relative p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30
                text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400
                transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              {hasUnread && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
          )}
          <ActionDropdown
            booking={booking}
            updating={updating}
            onStatusChange={onStatusChange}
            isBlocked={isBlocked}
            blockLoading={blockLoading}
            onToggleBlock={onToggleBlock}
            onMarkLate={onMarkLate}
            onCollectCash={onCollectCash}
            lateLoading={lateLoading}
            cashLoading={cashLoading}
            onReschedule={onReschedule}
          />
        </div>
      </td>
    </tr>
  );
};

/* ─── Mobile Booking Card ────────────────────────────────────── */
const BookingCard = ({ booking, updating, onStatusChange, isBlocked, blockLoading, onToggleBlock, onOpenChat, hasUnread, staffList, onReload, onMarkLate, onCollectCash, lateLoading, cashLoading, onReschedule, onPrintReceipt, selected, onToggleSelect }) => {
  const cfg = STATUS_CFG[booking.status] || { label: booking.status, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' };
  const dateStr = booking.appointmentDate ? formatDate(booking.appointmentDate) : '—';

  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 hover:shadow-md dark:hover:shadow-gray-900 transition-all duration-200 ${selected ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20' : 'border-gray-100 dark:border-gray-800'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => onToggleSelect(booking._id)} className="shrink-0">
            {selected
              ? <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              : <Square className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
          </button>
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {(booking.customerName || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{booking.customerName || 'Unknown'}</p>
            {booking.customerPhone && (
              <a href={`tel:${booking.customerPhone}`}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 transition-colors mt-0.5">
                <Phone className="w-3 h-3" />{booking.customerPhone}
              </a>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {!booking.barberId && (
        <div className="mb-2">
          <AssignPopover booking={booking} staffList={staffList} onAssigned={onReload} />
          <span className="ml-2 text-[10px] text-red-600 dark:text-red-400">needs assignment</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5 text-gray-400" /><span className="truncate">{booking.serviceName||'—'}</span></div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-gray-400" /><span className="font-semibold text-gray-900 dark:text-white">{booking.totalAmount??'—'}</span></div>
          <PaymentBadge booking={booking} />
        </div>
        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /><span>{dateStr}</span></div>
        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /><span>{formatTime(booking.appointmentTime)}</span></div>
      </div>

      <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-800">
        {booking.status === 'pending' && <>
          <ActionBtn label="Confirm"  cls="bg-indigo-600 hover:bg-indigo-700 text-white" loading={updating} onClick={() => onStatusChange(booking._id,'confirmed')} />
          <ActionBtn label="Cancel"   cls="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800" loading={updating} onClick={() => onStatusChange(booking._id,'cancelled')} />
          <ActionBtn label="No-show"  cls="bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800" loading={updating} onClick={() => onStatusChange(booking._id,'no_show')} />
        </>}
        {booking.status === 'confirmed' && <>
          <ActionBtn label="Start"   cls="bg-violet-600 hover:bg-violet-700 text-white" loading={updating} onClick={() => onStatusChange(booking._id,'in_progress')} />
          <ActionBtn label="Cancel"  cls="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800" loading={updating} onClick={() => onStatusChange(booking._id,'cancelled')} />
          <ActionBtn label="No-show" cls="bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800" loading={updating} onClick={() => onStatusChange(booking._id,'no_show')} />
        </>}
        {booking.status === 'in_progress' && (
          <ActionBtn label="Mark Complete" cls="bg-emerald-600 hover:bg-emerald-700 text-white" loading={updating} onClick={() => onStatusChange(booking._id,'completed')} />
        )}
        {['pending','confirmed'].includes(booking.status) && !booking.lateMarkedAt && (
          <ActionBtn label="Mark Late" cls="bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" loading={lateLoading} onClick={() => onMarkLate(booking._id)} />
        )}
        {booking.paymentMethod === 'cash' && !booking.cashCollected && booking.status !== 'cancelled' && (
          <ActionBtn label="Cash Collected" cls="bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" loading={cashLoading} onClick={() => onCollectCash(booking._id)} />
        )}
        {['pending','confirmed'].includes(booking.status) && (booking.rescheduleCount || 0) < 2 && onReschedule && (
          <ActionBtn label="Reschedule" cls="bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800" loading={false} onClick={() => onReschedule(booking)} />
        )}
        {booking.status === 'completed' && onPrintReceipt && (
          <ActionBtn label="Receipt" cls="bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" loading={false} onClick={() => onPrintReceipt(booking._id)} />
        )}
        {CHAT_OPEN.has(booking.status) && (
          <button
            onClick={() => onOpenChat(booking)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border
              bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400
              border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat
            {hasUnread && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        )}
        {!booking.isWalkIn && booking.customerId && (
          <button onClick={() => onToggleBlock(booking.customerId, isBlocked)} disabled={blockLoading}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition border disabled:opacity-50 ${
              isBlocked ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
            {isBlocked ? <><ShieldCheck className="w-3.5 h-3.5"/>Unblock</> : <><ShieldOff className="w-3.5 h-3.5"/>Block</>}
          </button>
        )}
      </div>
    </div>
  );
};

const ActionBtn = ({ label, cls, loading, onClick }) => (
  <button onClick={onClick} disabled={loading}
    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${cls}`}>
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : label}
  </button>
);

/* ─── Chat Panel ─────────────────────────────────────────────── */
const ChatPanel = ({ booking, onClose }) => {
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [peerTyping, setPeerTyping] = useState(false);
  const socketRef     = useRef(null);
  const bottomRef     = useRef(null);
  const typingTimer   = useRef(null);
  const isChatOpen    = CHAT_OPEN.has(booking.status);

  useEffect(() => {
    api.get(`/owner/bookings/${booking._id}/messages`)
      .then(res => {
        const msgs = res.data.data?.messages || [];
        // Mark customer messages as read instantly in local state
        const now = new Date().toISOString();
        setMessages(msgs.map(m => m.senderRole === 'customer' && !m.readAt ? { ...m, readAt: now } : m));
        // Persist to backend (fire-and-forget)
        api.put(`/owner/bookings/${booking._id}/messages/read`).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [booking._id]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-chat', { bookingId: booking._id }));
    socket.on('chat-message', ({ bookingId, message }) => {
      if (bookingId === booking._id) {
        // If owner is already viewing this chat, mark incoming customer message as read instantly
        const msg = message.senderRole === 'customer' ? { ...message, readAt: new Date().toISOString() } : message;
        setMessages(prev => [...prev, msg]);
        if (message.senderRole === 'customer') {
          api.put(`/owner/bookings/${bookingId}/messages/read`).catch(() => {});
        }
      }
    });
    socket.on('chat-typing', ({ senderRole }) => {
      if (senderRole === 'customer') {
        setPeerTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPeerTyping(false), 2500);
      }
    });
    return () => {
      clearTimeout(typingTimer.current);
      socket.emit('leave-chat', { bookingId: booking._id });
      socket.disconnect();
    };
  }, [booking._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending || !isChatOpen) return;
    setText('');
    setSending(true);
    try {
      await api.post(`/owner/bookings/${booking._id}/messages`, { text: t });
    } catch (err) { toast.error(err?.message || 'Failed to send message'); setText(t); }
    finally { setSending(false); }
  };

  const handleKeyDown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleChange  = e => {
    setText(e.target.value);
    if (isChatOpen) socketRef.current?.emit('chat-typing', { bookingId: booking._id, senderRole: 'owner' });
  };
  const fmt = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`; };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[360px] flex flex-col
        bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {(booking.customerName || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{booking.customerName || 'Customer'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{booking.serviceName} · #{booking._id?.slice(-6)}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {!isChatOpen && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl text-xs font-medium
            bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50
            text-amber-700 dark:text-amber-400">
            Chat closed — booking is {booking.status.replace('_', ' ')}.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-gray-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
              <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-gray-400 dark:text-gray-500">No messages yet</p>
            </div>
          ) : messages.map((msg, i) => {
            const mine = msg.senderRole === 'owner';
            return (
              <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-snug break-words ${
                  mine
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
                }`}>
                  <p>{msg.text}</p>
                  <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] ${mine ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}>
                      {fmt(msg.createdAt)}
                    </span>
                    {mine && (
                      <svg width="20" height="11" viewBox="0 0 20 11" fill="none">
                        <path d="M1 5.5L4 8.5L9.5 1.5" stroke={msg.readAt ? '#25D366' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 5.5L9 8.5L14.5 1.5" stroke={msg.readAt ? '#25D366' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {peerTyping && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2 rounded-2xl rounded-bl-none bg-gray-100 dark:bg-gray-800 text-xs text-gray-400 dark:text-gray-500 italic">
                Customer is typing…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {isChatOpen && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2">
            <textarea
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Message customer…"
              rows={1}
              disabled={sending}
              className="flex-1 px-3.5 py-2.5 rounded-xl border text-sm resize-none min-h-[40px] max-h-28 overflow-y-auto
                bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
                text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center
                transition-colors disabled:opacity-40 shrink-0 self-end"
            >
              {sending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

/* ─── Inline Assign Popover ──────────────────────────────────── */
const AssignPopover = ({ booking, staffList, onAssigned }) => {
  const [open, setOpen]       = useState(false);
  const [assigning, setAssigning] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 200) });
    }
    setOpen(v => !v);
  };

  const handleAssign = async (staffId) => {
    setAssigning(true);
    setOpen(false);
    try {
      await api.put(`/owner/team/${staffId}/assign-booking`, { bookingId: booking._id });
      toast.success('Booking assigned');
      onAssigned();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={assigning}
        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full
          bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400
          font-semibold ring-1 ring-red-300 dark:ring-red-800
          hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
      >
        {assigning
          ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
          : <AlertTriangle className="w-2.5 h-2.5" />}
        UNASSIGNED {staffList.length > 0 && <ChevronDown className="w-2.5 h-2.5" />}
      </button>

      {open && staffList.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-48 rounded-xl shadow-2xl
              bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
              py-1.5 animate-[fadeup_0.12s_ease_both]"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="px-3.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Assign to</p>
            {staffList.map(s => (
              <button
                key={s._id}
                onClick={() => handleAssign(s._id)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                  {s.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-gray-700 dark:text-gray-300 text-sm">{s.name}{s.isOwner ? ' (You)' : ''}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Main Bookings Page ─────────────────────────────────────── */
const Bookings = () => {
  const { salon, services, bookings, fetchBookings, fetchServices, updateBookingStatus, createWalkInBooking } = useSalon();
  const location = useLocation();
  const [filter, setFilter]             = useState('all');
  const [updating, setUpdating]         = useState(null);
  const [showModal, setShowModal]       = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [blockedIds, setBlockedIds]     = useState(new Set());
  const [blocking, setBlocking]         = useState(null);
  const [pageLoading, setPageLoading]   = useState(false);
  const [chatBooking, setChatBooking]   = useState(null);
  const [unreadChats, setUnreadChats]   = useState(new Set());
  const [staffList, setStaffList]       = useState([]);
  const [staffFilter, setStaffFilter]   = useState('all'); // 'all' | staffId | 'unassigned'
  const [searchQuery, setSearchQuery]   = useState('');
  const [lateLoading, setLateLoading]   = useState(null);
  const [cashLoading, setCashLoading]   = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const bulkCancel = async (ids) => {
    // Optimistic update
    const prev = [...ids].map((id) => bookings?.find((b) => b._id === id));
    setSelectedIds(new Set());

    const { dismiss } = showUndoToast(`Cancelling ${ids.length} booking(s)...`, async () => {
      dismiss();
      setSelectedIds(new Set(ids));
    });

    try {
      await api.patch('/owner/bookings/bulk', { ids: [...ids], action: 'cancel' });
      await fetchBookings();
      toast.success(`${ids.length} bookings cancelled`);
    } catch { toast.error('Bulk cancel failed'); }
  };

  const handleOpenChat = useCallback((booking) => {
    setChatBooking(booking);
    setUnreadChats(prev => { const s = new Set(prev); s.delete(String(booking._id)); return s; });
  }, []);

  // Auto-open chat when navigated from MessagesPanel
  useEffect(() => {
    const openId = location.state?.openChatBookingId;
    if (!openId || !bookings?.length) return;
    const target = bookings.find((b) => b._id === openId);
    if (target) {
      handleOpenChat(target);
      window.history.replaceState({}, ''); // clear state so it doesn't re-open on refresh
    }
  }, [location.state?.openChatBookingId, bookings]);

  // Listen for incoming customer messages on the salon socket (already joined via SalonContext)
  useEffect(() => {
    const SOCKET_URL_BOOKINGS = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';
    // Re-use the existing salon socket from SalonContext via a ref isn't easy here,
    // so we just track unread state via a separate listener on window custom events.
    // The toast is handled in SalonContext; here we just mark the booking as unread.
    const handler = (e) => {
      const { bookingId } = e.detail || {};
      if (bookingId) setUnreadChats(prev => new Set([...prev, String(bookingId)]));
    };
    window.addEventListener('new-chat-message', handler);
    return () => window.removeEventListener('new-chat-message', handler);
  }, []);

  const loadBookings = useCallback(async (date, q = '') => {
    setPageLoading(true);
    try { await fetchBookings({ date: q ? undefined : date, q: q || undefined }); }
    finally { setPageLoading(false); }
  }, [fetchBookings]);

  // Debounced search — fires backend query 350ms after user stops typing
  const searchDebounceRef = useRef(null);
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      loadBookings(val.trim() ? undefined : selectedDate, val.trim());
    }, 350);
  };

  // Called after inline booking assignment so the row updates without a full reload
  const handleAssigned = useCallback(() => {
    loadBookings(selectedDate);
  }, [loadBookings, selectedDate]);

  useEffect(() => {
    loadBookings(selectedDate);
    fetchServices();
  }, [selectedDate]);

  useEffect(() => {
    api.get('/owner/team')
      .then(res => {
        // Only show active staff in the dropdown; exclude owner-only salons from showing the dropdown
        const active = (res.data.data?.staff || []).filter(s => s.isActive);
        setStaffList(active);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/owner/blocked-customers')
      .then(res => {
        const ids = new Set(
          (res.data.data?.blockedCustomers || [])
            .map(bc => bc.customerId?._id || bc.customerId)
            .filter(Boolean).map(String)
        );
        setBlockedIds(ids);
      })
      .catch(() => {});
  }, []);

  // search is handled by backend; only client-side filter remaining is status + staff
  const filteredBookings = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (staffFilter === 'unassigned') return !b.barberId;
    if (staffFilter !== 'all') return String(b.barberId) === staffFilter;
    return true;
  });

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus);
      toast.success(`Booking ${newStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setUpdating(null);
    }
  };

  const handleWalkInSuccess = async (data) => {
    await createWalkInBooking(data);
    toast.success('Walk-in booking created!');
    await loadBookings(selectedDate);
  };

  const handleToggleBlock = async (customerId, currentlyBlocked) => {
    setBlocking(customerId);
    try {
      if (currentlyBlocked) {
        await api.delete(`/owner/customers/${customerId}/block`);
        setBlockedIds(prev => { const n = new Set(prev); n.delete(String(customerId)); return n; });
        toast.success('Customer unblocked');
      } else {
        await api.post(`/owner/customers/${customerId}/block`, { reason: 'Fake booking' });
        setBlockedIds(prev => new Set([...prev, String(customerId)]));
        toast.success('Customer blocked');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update block status');
    } finally {
      setBlocking(null);
    }
  };

  // Fix 8: Mark Late
  const handleMarkLate = async (bookingId) => {
    setLateLoading(bookingId);
    try {
      await api.post(`/owner/bookings/${bookingId}/late`);
      toast.success('Booking marked as late — moved to end of queue');
      await loadBookings(selectedDate);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark late');
    } finally { setLateLoading(null); }
  };

  // Fix 10: Collect Cash
  const handleCollectCash = async (bookingId) => {
    setCashLoading(bookingId);
    try {
      await api.post(`/owner/bookings/${bookingId}/collect-cash`);
      toast.success('Cash collected');
      await loadBookings(selectedDate);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setCashLoading(null); }
  };

  const handlePrintReceipt = async (bookingId) => {
    try {
      const res = await api.get(`/owner/bookings/${bookingId}/receipt`);
      const r = res.data.data;
      const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';
      const fmtTime = (t) => { if (!t) return '—'; const [h,m] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; return `${h%12||12}:${String(m).padStart(2,'0')} ${ampm}`; };
      const servicesRows = (r.services || []).map(s =>
        `<tr><td>${s.name}</td><td>${s.duration} min</td><td style="text-align:right">₹${s.price}</td></tr>`
      ).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Receipt</title>
      <style>
        body{font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px;color:#111}
        .logo{text-align:center;margin-bottom:16px}
        .logo img{height:60px;object-fit:contain}
        h2{text-align:center;margin:0 0 4px;font-size:20px}
        .sub{text-align:center;color:#555;font-size:13px;margin-bottom:20px}
        .section{margin-bottom:16px}
        .row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}
        .label{color:#555}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
        th{text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 0;font-size:12px;color:#555}
        td{padding:5px 0;border-bottom:1px solid #f3f4f6}
        .total{font-weight:700;font-size:15px}
        .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;
          background:${r.paymentStatus==='completed'?'#d1fae5':'#fee2e2'};color:${r.paymentStatus==='completed'?'#065f46':'#991b1b'}}
        .footer{margin-top:24px;text-align:center;font-size:12px;color:#9ca3af}
        @media print{body{margin:0}}
      </style></head><body>
        ${r.salon.logoUrl ? `<div class="logo"><img src="${r.salon.logoUrl}" alt="logo"/></div>` : ''}
        <h2>${r.salon.name}</h2>
        <div class="sub">${r.salon.address || ''}<br/>${r.salon.phone || ''}${r.salon.email ? ' · '+r.salon.email : ''}</div>
        <hr/>
        <div class="section">
          <div class="row"><span class="label">Receipt #</span><span>${r.receiptNumber}</span></div>
          <div class="row"><span class="label">Date Issued</span><span>${fmt(r.issuedAt)}</span></div>
          <div class="row"><span class="label">Appointment</span><span>${fmt(r.appointment.date)} at ${fmtTime(r.appointment.time)}</span></div>
          <div class="row"><span class="label">Booking ID</span><span>${r.appointment.bookingId||'—'}</span></div>
        </div>
        <hr/>
        <div class="section">
          <div class="row"><span class="label">Customer</span><span>${r.customer.name}</span></div>
          ${r.customer.phone ? `<div class="row"><span class="label">Phone</span><span>${r.customer.phone}</span></div>` : ''}
          ${r.staff.name ? `<div class="row"><span class="label">Staff</span><span>${r.staff.name}</span></div>` : ''}
        </div>
        <hr/>
        <table><thead><tr><th>Service</th><th>Duration</th><th style="text-align:right">Price</th></tr></thead>
        <tbody>${servicesRows}</tbody></table>
        <div class="row"><span class="label">Subtotal</span><span>₹${r.subtotal}</span></div>
        ${r.discount ? `<div class="row"><span class="label">Discount${r.couponApplied?' ('+r.couponApplied+')':''}</span><span>-₹${r.discount}</span></div>` : ''}
        <div class="row total"><span>Total</span><span>₹${r.total}</span></div>
        <div class="row"><span class="label">Payment</span><span>${r.paymentMethod||'—'} <span class="badge">${r.paymentStatus}</span></span></div>
        ${r.salon.gstNumber ? `<div class="row"><span class="label">GST No.</span><span>${r.salon.gstNumber}</span></div>` : ''}
        <div class="footer">Thank you for visiting ${r.salon.name}!</div>
      </body></html>`;
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 400);
    } catch (err) {
      toast.error('Could not load receipt');
    }
  };

  // Fix 11: multi-device sync — listen for booking-updated from other owner tabs
  useEffect(() => {
    if (!salon?._id) return;
    const SOCKET_URL2 = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';
    const syncSocket = io(SOCKET_URL2, { transports: ['polling', 'websocket'] });
    syncSocket.on('connect', () => syncSocket.emit('join-salon', { salonId: salon._id }));
    syncSocket.on('booking-updated', () => { loadBookings(selectedDate); });
    return () => syncSocket.disconnect();
  }, [salon?._id, selectedDate]);

  const dateLabel = selectedDate === today
    ? 'today'
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage and track all your salon appointments
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date picker */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="pl-3.5 pr-9 py-2 rounded-xl border text-sm
                  bg-white dark:bg-gray-900
                  border-gray-200 dark:border-gray-700
                  text-gray-700 dark:text-gray-300
                  focus:outline-none focus:ring-2 focus:ring-indigo-500
                  transition-colors cursor-pointer appearance-none"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Staff filter — only shown when salon has at least one non-owner staff member */}
            {staffList.filter(s => !s.isOwner).length > 0 && (
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={staffFilter}
                  onChange={e => setStaffFilter(e.target.value)}
                  className="pl-8 pr-8 py-2 rounded-xl border text-sm appearance-none
                    bg-white dark:bg-gray-900
                    border-gray-200 dark:border-gray-700
                    text-gray-700 dark:text-gray-300
                    focus:outline-none focus:ring-2 focus:ring-indigo-500
                    transition-colors cursor-pointer"
                >
                  <option value="all">All Staff</option>
                  <option value="unassigned">Unassigned</option>
                  {staffList.map(s => (
                    <option key={s._id} value={s._id}>{s.name}{s.isOwner ? ' (You)' : ''}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Export CSV */}
            <button
              onClick={() => {
                const rows = [
                  ['Customer', 'Phone', 'Service', 'Date', 'Time', 'Status', 'Amount', 'Payment'],
                  ...filteredBookings.map(b => [
                    b.customerName || '',
                    b.customerPhone || '',
                    b.serviceName || '',
                    formatDate(b.appointmentDate),
                    formatTime(b.appointmentTime),
                    b.status,
                    b.totalAmount ?? '',
                    b.paymentMethod || '',
                  ]),
                ];
                const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                a.download = `bookings-${selectedDate || 'all'}.csv`;
                a.click();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                border border-gray-200 dark:border-gray-700
                text-gray-600 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Add Walk-in */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                bg-gradient-to-r from-indigo-600 to-violet-600
                hover:from-indigo-500 hover:to-violet-500
                text-white transition-all duration-200
                shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add Walk-in
            </button>
          </div>
        </div>

        {/* ── Count subtitle ── */}
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-3">
          <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredBookings.length}</span>{' '}
          booking{filteredBookings.length !== 1 ? 's' : ''} · {dateLabel}
        </p>

        {/* ── Search ── */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name, phone or booking ID…"
            className="w-full pl-9 pr-9 py-2 rounded-xl border text-sm
              bg-white dark:bg-gray-900
              border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              placeholder-gray-400 dark:placeholder-gray-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => {
            const active = filter === f.id;
            const count  = f.id === 'all' ? bookings.length : bookings.filter(b => b.status === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    active
                      ? 'bg-white/25 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        {pageLoading ? (
          <>
            {/* Desktop skeleton table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                    {['Customer','Service','Date & Time','Amount','Status',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</tbody>
              </table>
            </div>
            {/* Mobile skeleton cards */}
            <div className="md:hidden space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 animate-pulse space-y-3">
                  <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800"/><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4"/><div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2"/></div></div>
                  <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(j=><div key={j} className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg"/>)}</div>
                </div>
              ))}
            </div>
          </>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
            <EmptyState filter={filter} onAddWalkIn={() => setShowModal(true)} searchQuery={searchQuery} onClearSearch={() => handleSearchChange('')} />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                    <th className="pl-4 pr-2 py-3 w-8">
                      <button
                        onClick={() => {
                          const allIds = filteredBookings.map(b => b._id);
                          const allSelected = allIds.every(id => selectedIds.has(id));
                          setSelectedIds(allSelected ? new Set() : new Set(allIds));
                        }}
                        className="text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {filteredBookings.length > 0 && filteredBookings.every(b => selectedIds.has(b._id))
                          ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    {['Customer','Service','Date & Time','Amount','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(booking => (
                    <BookingRow
                      key={booking._id}
                      booking={booking}
                      updating={updating === booking._id}
                      onStatusChange={handleStatusChange}
                      isBlocked={booking.customerId ? blockedIds.has(String(booking.customerId)) : false}
                      blockLoading={blocking === String(booking.customerId)}
                      onToggleBlock={handleToggleBlock}
                      onOpenChat={handleOpenChat}
                      hasUnread={unreadChats.has(String(booking._id))}
                      staffList={staffList}
                      onReload={handleAssigned}
                      onMarkLate={handleMarkLate}
                      onCollectCash={handleCollectCash}
                      lateLoading={lateLoading === booking._id}
                      cashLoading={cashLoading === booking._id}
                      onReschedule={setRescheduleBooking}
                      onPrintReceipt={handlePrintReceipt}
                      selected={selectedIds.has(booking._id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredBookings.map(booking => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  updating={updating === booking._id}
                  onStatusChange={handleStatusChange}
                  isBlocked={booking.customerId ? blockedIds.has(String(booking.customerId)) : false}
                  blockLoading={blocking === String(booking.customerId)}
                  onToggleBlock={handleToggleBlock}
                  onOpenChat={handleOpenChat}
                  hasUnread={unreadChats.has(String(booking._id))}
                  staffList={staffList}
                  onReload={handleAssigned}
                  onMarkLate={handleMarkLate}
                  onCollectCash={handleCollectCash}
                  lateLoading={lateLoading === booking._id}
                  cashLoading={cashLoading === booking._id}
                  onReschedule={setRescheduleBooking}
                  onPrintReceipt={handlePrintReceipt}
                  selected={selectedIds.has(booking._id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={[...selectedIds]}
        onClear={() => setSelectedIds(new Set())}
        actions={[
          { label: 'Cancel', icon: Ban, variant: 'danger', onClick: bulkCancel },
        ]}
      />

      {/* Walk-in Modal */}
      {showModal && (
        <WalkInModal
          salon={salon}
          services={services}
          onClose={() => setShowModal(false)}
          onSuccess={handleWalkInSuccess}
        />
      )}

      {/* Chat Panel */}
      {chatBooking && (
        <ChatPanel
          booking={chatBooking}
          onClose={() => setChatBooking(null)}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          salon={salon}
          services={services}
          onClose={() => setRescheduleBooking(null)}
          onSuccess={async ({ newDate, newTime }) => {
            await api.put(`/owner/bookings/${rescheduleBooking._id}/reschedule`, { newDate, newTime });
            toast.success('Booking rescheduled');
            loadBookings(selectedDate);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default Bookings;
