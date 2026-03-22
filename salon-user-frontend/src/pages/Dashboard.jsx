import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { getCustomerToken } from "../utils/auth";
import { useNotifications } from "../context/NotificationContext";

// ── Constants (matching app exactly) ────────────────────────
const FILTERS   = ['Upcoming', 'Completed', 'Cancelled', 'All'];
const PAGE_SIZE = 5;

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  confirmed:   { label: 'Confirmed',   color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  completed:   { label: 'Completed',   color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
};

// ── Helpers ───────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeLabel(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m || '00'} ${ampm}`;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── StatusBadge ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };
  return (
    <span className="px-2 py-0.5 rounded-full border text-[11px] font-bold shrink-0"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
}

// ── ReviewPrompt ──────────────────────────────────────────────
function ReviewPrompt({ bookingId, onReviewed }) {
  const [open, setOpen]           = useState(false);
  const [rating, setRating]       = useState(0);
  const [hover, setHover]         = useState(0);
  const [text, setText]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

  if (done) return (
    <div className="mt-2.5 p-2.5 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-xs text-green-600">Thank you for your review!</p>
    </div>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="mt-2.5 w-full flex items-center justify-between p-2.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
      <p className="text-xs text-indigo-700">How was your experience?</p>
      <p className="text-xs font-bold text-indigo-700">Leave a Review</p>
    </button>
  );

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await API.post('/customer/reviews', { bookingId, salonRating: rating, reviewText: text.trim() || undefined });
      setDone(true);
      onReviewed?.();
    } catch { setDone(true); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="mt-2.5 p-3 bg-indigo-50 rounded-lg space-y-2.5">
      <p className="text-xs font-bold text-indigo-700">Rate your experience</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            className="text-2xl leading-none transition">
            <span style={{ color: n <= (hover || rating) ? '#f59e0b' : '#d1d5db' }}>★</span>
          </button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
        placeholder="Share your experience (optional)"
        className="w-full border border-indigo-200 rounded-lg p-2 text-xs text-slate-700 bg-white outline-none resize-none focus:border-indigo-400 transition placeholder-slate-400" />
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={!rating || submitting}
          className="px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-indigo-700 transition flex items-center justify-center min-w-[70px]">
          {submitting ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3.5 py-2 text-xs text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── RescheduleModal ───────────────────────────────────────────
function RescheduleModal({ booking, onClose, onRescheduled }) {
  const [newDate, setNewDate]         = useState(todayString());
  const [newTime, setNewTime]         = useState('');
  const [slots, setSlots]             = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay]     = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const salonId = booking.salonId?._id || booking.salonId;
  const duration = booking.estimatedDuration || 30;

  useEffect(() => {
    if (!newDate || !salonId) return;
    setNewTime(''); setSlots([]); setBlockedSlots([]); setClosedDay(false);
    setSlotsLoading(true);
    API.get(`/public/salons/${salonId}/booked-slots?date=${newDate}&duration=${duration}`)
      .then(res => {
        const data = res.data.data || {};
        setClosedDay(data.closedDay || false);
        setSlots(data.slots || []);
        setBlockedSlots(data.blockedSlots || []);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [newDate, salonId, duration]);

  const handleSave = async () => {
    if (!newDate || !newTime) { setError('Please select a date and a time slot.'); return; }
    setSaving(true); setError('');
    try {
      await API.put(`/customer/bookings/${booking._id}/reschedule`, { appointmentDate: newDate, appointmentTime: newTime });
      onRescheduled(booking._id, newDate, newTime);
      onClose();
    } catch (err) { setError(err?.response?.data?.message || 'Failed to reschedule. Try another slot.'); }
    finally { setSaving(false); }
  };

  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    return { key, label };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5"
        onClick={e => e.stopPropagation()}>
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[17px] font-bold text-slate-900">Reschedule Booking</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Date selector */}
        <p className="text-[13px] font-semibold text-slate-500 mb-2">Select Date</p>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {quickDates.map(({ key, label }) => (
            <button key={key} onClick={() => setNewDate(key)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap border transition shrink-0 ${
                newDate === key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Slot grid */}
        <p className="text-[13px] font-semibold text-slate-500 mb-2">Select Time Slot</p>
        {slotsLoading ? (
          <div className="flex items-center gap-2 py-3">
            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-slate-400">Loading slots…</span>
          </div>
        ) : closedDay ? (
          <div className="p-3 bg-amber-50 rounded-lg mb-3">
            <p className="text-[13px] text-amber-600">Salon is closed on this day. Choose another date.</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="p-3 bg-slate-100 rounded-lg mb-3">
            <p className="text-[13px] text-slate-400">No available slots on this date.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-2.5">
              {[['#fca5a5', 'Booked'], ['#6366f1', 'Selected'], ['#e2e8f0', 'Available']].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: c }} />
                  <span className="text-[11px] text-slate-500">{l}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {slots.map(s => {
                const blocked = blockedSlots.includes(s);
                const selected = newTime === s;
                return (
                  <button key={s} onClick={() => { if (!blocked) setNewTime(s); }} disabled={blocked}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition ${
                      blocked  ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed' :
                      selected ? 'bg-indigo-600 border-indigo-600 text-white' :
                                 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}>
                    {formatTimeLabel(s)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2.5">
          <button onClick={handleSave} disabled={saving || !newTime}
            className="flex-[2] h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Reschedule'}
          </button>
          <button onClick={onClose}
            className="flex-1 h-12 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BookingCard ───────────────────────────────────────────────
function BookingCard({ booking: initialBooking, userCoords, onCancelled }) {
  const [booking, setBooking]         = useState(initialBooking);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewed, setReviewed]       = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const status = booking.status || 'pending';

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await API.post(`/customer/bookings/${booking._id}/cancel`);
      onCancelled(booking._id);
    } catch (err) { alert(err?.message || 'Could not cancel. Try again.'); }
    finally { setCancelling(false); }
  };

  const handleRescheduled = (id, date, time) => {
    setBooking(prev => ({ ...prev, appointmentDate: date, appointmentTime: time, status: 'pending' }));
  };

  const salonDoc    = booking.salonId;
  const salonName   = booking.salonName || salonDoc?.name || 'Salon';
  const salonCity   = salonDoc?.city || salonDoc?.address || '';
  const salonPhone  = salonDoc?.phone || null;
  const serviceName = booking.serviceName ||
    (Array.isArray(booking.serviceIds) ? booking.serviceIds.map(s => s?.name || s).filter(Boolean).join(' + ') : '') ||
    'Service';

  const dur = booking.estimatedDuration;
  const durLabel = dur
    ? (dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ''}` : `${dur} min`)
    : null;

  let distanceLabel = null;
  if (userCoords && salonDoc?.location?.coordinates?.length === 2) {
    const [salonLng, salonLat] = salonDoc.location.coordinates;
    const km = haversineKm(userCoords.lat, userCoords.lng, salonLat, salonLng);
    distanceLabel = km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
  }

  let mapsUrl = null;
  if (salonDoc?.location?.coordinates?.length === 2) {
    const [lng, lat] = salonDoc.location.coordinates;
    mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  } else {
    const query = [salonDoc?.address || booking.salonName, salonDoc?.city].filter(Boolean).join(', ');
    if (query) mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const canCancel     = ['pending', 'confirmed'].includes(status);
  const canReschedule = ['pending', 'confirmed'].includes(status);
  const canReview     = status === 'completed' && !reviewed && !initialBooking.reviewed;

  const detailTiles = [
    { label: 'Date',     value: formatDateLabel(booking.appointmentDate) },
    { label: 'Time',     value: formatTimeLabel(booking.appointmentTime) },
    { label: 'Amount',   value: booking.totalAmount != null ? `₹${booking.totalAmount}` : '—', amount: true },
    ...(durLabel ? [{ label: 'Duration', value: durLabel }] : []),
    { label: 'Payment',  value: booking.paymentMethod ? booking.paymentMethod.charAt(0).toUpperCase() + booking.paymentMethod.slice(1) : '—' },
    ...(distanceLabel ? [{ label: 'Distance', value: distanceLabel, accent: true }] : []),
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">

      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg shrink-0">✂</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-slate-900 truncate">{serviceName}</p>
          <p className="text-[13px] text-slate-500 mt-0.5 truncate">{salonName}</p>
          {!!salonCity && <p className="text-[12px] text-slate-400 mt-0.5 truncate">{salonCity}</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Detail tiles grid */}
      <div className="flex flex-wrap gap-2">
        {detailTiles.map(tile => (
          <div key={tile.label}
            className={`flex-1 min-w-[30%] rounded-lg p-2.5 ${tile.accent ? 'bg-indigo-50' : 'bg-slate-50'}`}>
            <p className={`text-[11px] mb-0.5 ${tile.accent ? 'text-indigo-400' : 'text-slate-400'}`}>{tile.label}</p>
            <p className={`text-[13px] font-semibold ${
              tile.amount ? 'text-indigo-600 font-bold' : tile.accent ? 'text-indigo-700' : 'text-slate-700'
            }`}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Pending banner */}
      {status === 'pending' && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">Awaiting confirmation from the salon. You'll be notified once confirmed.</p>
        </div>
      )}

      {/* Review prompt */}
      {canReview && <ReviewPrompt bookingId={booking._id} onReviewed={() => setReviewed(true)} />}
      {reviewed && (
        <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-600">Thank you for your review!</p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-2.5 border-t border-slate-50 space-y-1.5">
        <p className="text-[11px] text-slate-400">
          Booking ID: <span className="font-mono">{booking.bookingId || booking._id?.slice(-8) || '—'}</span>
        </p>
        <div className="flex flex-wrap gap-3.5">
          {!!salonPhone && (
            <a href={`tel:${salonPhone}`} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              {salonPhone}
            </a>
          )}
          {!!mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:underline">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Directions
            </a>
          )}
          {canReschedule && (
            <button onClick={() => setRescheduleOpen(true)} className="text-xs font-semibold text-indigo-600 hover:underline">
              Reschedule
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling} className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50">
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {rescheduleOpen && (
        <RescheduleModal booking={booking} onClose={() => setRescheduleOpen(false)} onRescheduled={handleRescheduled} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const [filter, setFilter]             = useState('Upcoming');
  const [bookings, setBookings]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [userCoords, setUserCoords]     = useState(null);
  const [confirmedToasts, setConfirmedToasts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const prevStatusRef = useRef({});

  const isAuth = !!getCustomerToken();

  // Get location for distance tiles
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { maximumAge: 60000, timeout: 6000 }
    );
  }, []);

  const loadBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get('/customer/bookings');
      const fresh = res.data.data?.bookings || res.data.data || [];
      const arr = Array.isArray(fresh) ? fresh : [];

      // Detect pending → confirmed
      const newlyConfirmed = arr.filter(
        b => b._id && prevStatusRef.current[b._id] === 'pending' && b.status === 'confirmed'
      );
      if (newlyConfirmed.length > 0) {
        setConfirmedToasts(prev => [...prev, ...newlyConfirmed.map(b => b._id)]);
        setFilter('Upcoming');
      }
      arr.forEach(b => { if (b._id) prevStatusRef.current[b._id] = b.status; });
      setBookings(arr);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    loadBookings();
  }, [isAuth, loadBookings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings(true);
    setRefreshing(false);
  };

  const handleCancelled = (id) => {
    setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
  };

  const filtered = bookings.filter(b => {
    if (filter === 'All')       return true;
    if (filter === 'Upcoming')  return ['pending', 'confirmed', 'in_progress'].includes(b.status);
    if (filter === 'Completed') return b.status === 'completed';
    if (filter === 'Cancelled') return b.status === 'cancelled';
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const stats = {
    total:     bookings.length,
    upcoming:  bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  // Not authenticated
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 pb-20">
        <svg className="w-14 h-14 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p className="text-[18px] font-bold text-slate-800 mt-2">Sign in to view bookings</p>
        <p className="text-[14px] text-slate-400 text-center mt-1 leading-relaxed">Track all your salon appointments in one place</p>
        <Link to="/login" className="mt-5 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl text-[15px] hover:bg-blue-700 transition">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 pt-5 pb-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">My Bookings</h1>
            <p className="text-[13px] text-slate-400 mt-0.5">
              {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
            </p>
          </div>
          {/* Notification bell */}
          <Link to="/notifications" className="relative w-9 h-9 rounded-[10px] bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

        {/* Stats row */}
        {!loading && (
          <div className="flex gap-2">
            {[
              { label: 'Total',     value: stats.total,     color: 'text-slate-900' },
              { label: 'Upcoming',  value: stats.upcoming,  color: 'text-blue-600' },
              { label: 'Completed', value: stats.completed, color: 'text-green-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex-1 bg-white rounded-xl p-3.5 text-center border border-slate-100 shadow-sm">
                <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Confirmed toasts */}
        {confirmedToasts.map(id => {
          const b = bookings.find(x => x._id === id);
          if (!b) return null;
          return (
            <div key={id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg shrink-0">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-green-700">Booking Confirmed!</p>
                  <p className="text-[11px] text-green-600 truncate mt-0.5">
                    {b.serviceName} at {b.salonName || b.salonId?.name} — {b.appointmentTime}
                  </p>
                </div>
              </div>
              <button onClick={() => setConfirmedToasts(prev => prev.filter(t => t !== id))}
                className="text-green-500 hover:text-green-700 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          );
        })}

        {/* Filter tabs — full-width row matching app exactly */}
        <div className="flex bg-white rounded-xl p-1 border border-slate-100 shadow-sm gap-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => { setFilter(f); setVisibleCount(PAGE_SIZE); }}
              className={`flex-1 py-2.5 rounded-[10px] text-xs font-semibold text-center transition ${
                filter === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <div className="flex justify-end">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition">
            <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-10 gap-2.5">
            <span className="text-5xl">📅</span>
            <p className="text-[18px] font-bold text-slate-800">
              No {filter === 'All' ? '' : filter.toLowerCase()} bookings
            </p>
            <p className="text-[14px] text-slate-400 text-center leading-relaxed max-w-xs">
              {filter === 'All' ? 'Book your first salon appointment now!' : `You have no ${filter.toLowerCase()} bookings.`}
            </p>
            {filter === 'All' && (
              <Link to="/" className="mt-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition">
                Explore Salons
              </Link>
            )}
          </div>
        )}

        {/* Booking cards */}
        {!loading && visible.map(b => (
          <BookingCard key={b._id} booking={b} userCoords={userCoords} onCancelled={handleCancelled} />
        ))}

        {/* Load more */}
        {!loading && hasMore && (
          <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 hover:bg-slate-50 transition shadow-sm">
            Load More
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        )}

        {/* All loaded */}
        {!loading && !hasMore && filtered.length > PAGE_SIZE && (
          <p className="text-center text-xs text-slate-400 pt-2 pb-1">
            All {filtered.length} bookings shown
          </p>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
