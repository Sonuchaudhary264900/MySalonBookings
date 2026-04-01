import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar, Clock, Phone, User, IndianRupee, Scissors, X, Plus,
  ShieldOff, ShieldCheck, CalendarOff, ChevronDown, MoreHorizontal,
  CheckCircle, XCircle, PlayCircle, Loader2, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
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
];

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
const EmptyState = ({ filter, onAddWalkIn }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 animate-[fadeup_0.4s_ease_both]">
    <style>{`@keyframes fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
    <div className="relative mb-6">
      {/* Glow rings */}
      <div className="absolute inset-0 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 scale-150 blur-xl" />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950
        flex items-center justify-center shadow-inner">
        <CalendarOff className="w-9 h-9 text-indigo-400 dark:text-indigo-500" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
      {filter === 'all' ? 'No bookings yet' : `No ${filter.replace('_', ' ')} bookings`}
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8">
      {filter === 'all'
        ? 'Bookings will appear here once customers start scheduling appointments.'
        : `There are no ${filter.replace('_', ' ')} bookings for this date.`}
    </p>
    {filter === 'all' && (
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
const ActionDropdown = ({ booking, updating, onStatusChange, isBlocked, blockLoading, onToggleBlock }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const NEXT = {
    pending:     [{ status:'confirmed', label:'Confirm',       icon: CheckCircle, cls:'text-indigo-600 dark:text-indigo-400' },
                  { status:'cancelled', label:'Cancel',        icon: XCircle,     cls:'text-red-600 dark:text-red-400' }],
    confirmed:   [{ status:'in_progress', label:'Start',       icon: PlayCircle,  cls:'text-violet-600 dark:text-violet-400' },
                  { status:'cancelled',   label:'Cancel',      icon: XCircle,     cls:'text-red-600 dark:text-red-400' }],
    in_progress: [{ status:'completed', label:'Mark Complete', icon: CheckCircle, cls:'text-emerald-600 dark:text-emerald-400' }],
    completed:   [],
    cancelled:   [],
  };

  const actions = NEXT[booking.status] || [];
  const showBlock = !booking.isWalkIn && booking.customerId;
  if (!actions.length && !showBlock) return <span className="text-xs text-gray-400 dark:text-gray-600">—</span>;

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

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-48 rounded-xl shadow-2xl
              bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
              py-1 animate-[fadeup_0.12s_ease_both]"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            {actions.map(({ status, label, icon: Icon, cls }) => (
              <button key={status}
                onClick={() => { onStatusChange(booking._id, status); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left rounded-lg mx-0">
                <Icon className={`w-4 h-4 shrink-0 ${cls}`} />
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
              </button>
            ))}

            {showBlock && (
              <>
                {actions.length > 0 && <div className="border-t border-gray-100 dark:border-gray-800 my-1" />}
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

/* ─── Booking Table Row ──────────────────────────────────────── */
const BookingRow = ({ booking, updating, onStatusChange, isBlocked, blockLoading, onToggleBlock, onOpenChat }) => {
  const cfg = STATUS_CFG[booking.status] || { label: booking.status, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' };
  const dateStr = booking.appointmentDate ? formatDate(booking.appointmentDate) : '—';

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group">
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
        <div className="flex gap-1 mt-1">
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
          {CHAT_OPEN.has(booking.status) && (
            <button
              onClick={() => onOpenChat(booking)}
              title="Chat with customer"
              className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30
                text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400
                transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          <ActionDropdown
            booking={booking}
            updating={updating}
            onStatusChange={onStatusChange}
            isBlocked={isBlocked}
            blockLoading={blockLoading}
            onToggleBlock={onToggleBlock}
          />
        </div>
      </td>
    </tr>
  );
};

/* ─── Mobile Booking Card ────────────────────────────────────── */
const BookingCard = ({ booking, updating, onStatusChange, isBlocked, blockLoading, onToggleBlock, onOpenChat }) => {
  const cfg = STATUS_CFG[booking.status] || { label: booking.status, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' };
  const dateStr = booking.appointmentDate ? formatDate(booking.appointmentDate) : '—';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 hover:shadow-md dark:hover:shadow-gray-900 transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
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

      <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5 text-gray-400" /><span className="truncate">{booking.serviceName||'—'}</span></div>
        <div className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-gray-400" /><span className="font-semibold text-gray-900 dark:text-white">{booking.totalAmount??'—'}</span></div>
        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /><span>{dateStr}</span></div>
        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /><span>{formatTime(booking.appointmentTime)}</span></div>
      </div>

      <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-800">
        {booking.status === 'pending' && <>
          <ActionBtn label="Confirm" cls="bg-indigo-600 hover:bg-indigo-700 text-white" loading={updating} onClick={() => onStatusChange(booking._id,'confirmed')} />
          <ActionBtn label="Cancel"  cls="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800" loading={updating} onClick={() => onStatusChange(booking._id,'cancelled')} />
        </>}
        {booking.status === 'confirmed' && <>
          <ActionBtn label="Start"  cls="bg-violet-600 hover:bg-violet-700 text-white" loading={updating} onClick={() => onStatusChange(booking._id,'in_progress')} />
          <ActionBtn label="Cancel" cls="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800" loading={updating} onClick={() => onStatusChange(booking._id,'cancelled')} />
        </>}
        {booking.status === 'in_progress' && (
          <ActionBtn label="Mark Complete" cls="bg-emerald-600 hover:bg-emerald-700 text-white" loading={updating} onClick={() => onStatusChange(booking._id,'completed')} />
        )}
        {CHAT_OPEN.has(booking.status) && (
          <button
            onClick={() => onOpenChat(booking)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border
              bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400
              border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat
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
      .then(res => setMessages(res.data.data?.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [booking._id]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-chat', { bookingId: booking._id }));
    socket.on('chat-message', ({ bookingId, message }) => {
      if (bookingId === booking._id) setMessages(prev => [...prev, message]);
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
      socketRef.current?.emit('chat-send', { bookingId: booking._id, senderRole: 'owner', text: t });
    } catch { toast.error('Failed to send message'); setText(t); }
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
                  <p className={`text-[10px] mt-0.5 ${mine ? 'text-indigo-200 text-right' : 'text-gray-400 dark:text-gray-500'}`}>
                    {fmt(msg.createdAt)}
                  </p>
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

/* ─── Main Bookings Page ─────────────────────────────────────── */
const Bookings = () => {
  const { salon, services, bookings, fetchBookings, fetchServices, updateBookingStatus, createWalkInBooking } = useSalon();
  const [filter, setFilter]             = useState('all');
  const [updating, setUpdating]         = useState(null);
  const [showModal, setShowModal]       = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [blockedIds, setBlockedIds]     = useState(new Set());
  const [blocking, setBlocking]         = useState(null);
  const [pageLoading, setPageLoading]   = useState(false);
  const [chatBooking, setChatBooking]   = useState(null);

  const loadBookings = useCallback(async (date) => {
    setPageLoading(true);
    try { await fetchBookings({ date }); }
    finally { setPageLoading(false); }
  }, [fetchBookings]);

  useEffect(() => {
    loadBookings(selectedDate);
    fetchServices();
  }, [selectedDate]);

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

  const filteredBookings = bookings.filter(b => filter === 'all' ? true : b.status === filter);

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
            <EmptyState filter={filter} onAddWalkIn={() => setShowModal(true)} />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
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
                      onOpenChat={setChatBooking}
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
                  onOpenChat={setChatBooking}
                />
              ))}
            </div>
          </>
        )}
      </div>

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
    </DashboardLayout>
  );
};

export default Bookings;
