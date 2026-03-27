import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { getCustomerToken } from "../utils/auth";
import { useNotifications } from "../context/NotificationContext";

function getUserName() {
  try {
    const token = localStorage.getItem("customerToken");
    if (!token) return "there";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.name || payload.firstName || payload.username || "there";
  } catch { return "there"; }
}

const FILTERS   = ['Upcoming', 'Completed', 'Cancelled', 'All'];
const PAGE_SIZE = 5;

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  confirmed:   { label: 'Confirmed',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  in_progress: { label: 'In Progress', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  completed:   { label: 'Completed',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  cancelled:   { label: 'Cancelled',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
};

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
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'var(--t-text-3)', bg: 'var(--t-input-bg)', border: 'var(--t-border)' };
  return (
    <span style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
}

// ── ReviewPrompt ──────────────────────────────────────────────
function ReviewPrompt({ bookingId, onReviewed }) {
  const [open, setOpen]             = useState(false);
  const [rating, setRating]         = useState(0);
  const [hover, setHover]           = useState(0);
  const [text, setText]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);

  if (done) return (
    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10 }}>
      <p style={{ fontSize: 12, color: '#34d399' }}>Thank you for your review! ✨</p>
    </div>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.14)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
    >
      <p style={{ fontSize: 12, color: 'var(--t-accent)' }}>How was your experience?</p>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-accent)' }}>Leave a Review →</p>
    </button>
  );

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await API.post('/customer/reviews', { bookingId, salonRating: rating, reviewText: text.trim() || undefined });
      setDone(true); onReviewed?.();
    } catch { setDone(true); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ marginTop: 10, padding: '14px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-accent)', marginBottom: 10 }}>Rate your experience</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: n <= (hover || rating) ? '#f59e0b' : 'var(--t-border)' }}>★</button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Share your experience (optional)"
        style={{ width: '100%', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'none', background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)', boxSizing: 'border-box', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmit} disabled={!rating || submitting}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: !rating || submitting ? 'not-allowed' : 'pointer', opacity: !rating || submitting ? 0.6 : 1, minWidth: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {submitting ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} /> : 'Submit'}
        </button>
        <button onClick={() => setOpen(false)} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--t-text-3)' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── RescheduleModal ───────────────────────────────────────────
function RescheduleModal({ booking, onClose, onRescheduled }) {
  const [newDate, setNewDate]           = useState(todayString());
  const [newTime, setNewTime]           = useState('');
  const [slots, setSlots]               = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay]       = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  const salonId  = booking.salonId?._id || booking.salonId;
  const duration = booking.estimatedDuration || 30;

  useEffect(() => {
    if (!newDate || !salonId) return;
    setNewTime(''); setSlots([]); setBlockedSlots([]); setClosedDay(false); setSlotsLoading(true);
    API.get(`/public/salons/${salonId}/booked-slots?date=${newDate}&duration=${duration}`)
      .then(res => { const d = res.data.data || {}; setClosedDay(d.closedDay || false); setSlots(d.slots || []); setBlockedSlots(d.blockedSlots || []); })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [newDate, salonId, duration]);

  const handleSave = async () => {
    if (!newDate || !newTime) { setError('Please select a date and a time slot.'); return; }
    setSaving(true); setError('');
    try {
      await API.put(`/customer/bookings/${booking._id}/reschedule`, { appointmentDate: newDate, appointmentTime: newTime });
      onRescheduled(booking._id, newDate, newTime); onClose();
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--t-text)' }}>Reschedule Booking</p>
          <button onClick={onClose} style={{ background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--t-text-3)' }}>✕</button>
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text-3)', marginBottom: 8 }}>Select Date</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }} className="scrollbar-hide">
          {quickDates.map(({ key, label }) => (
            <button key={key} onClick={() => setNewDate(key)}
              style={{ padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', border: '1px solid', flexShrink: 0, transition: 'all 0.18s',
                background: newDate === key ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--t-input-bg)',
                borderColor: newDate === key ? 'transparent' : 'var(--t-border)',
                color: newDate === key ? '#fff' : 'var(--t-text-2)',
                boxShadow: newDate === key ? '0 0 16px rgba(99,102,241,0.35)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text-3)', marginBottom: 8 }}>Select Time Slot</p>
        {slotsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
            <span style={{ width: 16, height: 16, border: '2px solid rgba(99,102,241,0.4)', borderTopColor: '#6366f1', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--t-text-3)' }}>Loading slots…</span>
          </div>
        ) : closedDay ? (
          <div style={{ padding: '12px 14px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#fbbf24' }}>Salon is closed on this day. Choose another date.</p>
          </div>
        ) : slots.length === 0 ? (
          <div style={{ padding: '12px 14px', background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--t-text-3)' }}>No available slots on this date.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              {[['rgba(248,113,113,0.7)', 'Booked'], ['#6366f1', 'Selected'], ['var(--t-border)', 'Available']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                  <span style={{ fontSize: 11, color: 'var(--t-text-3)' }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {slots.map(s => {
                const blocked  = blockedSlots.includes(s);
                const selected = newTime === s;
                return (
                  <button key={s} onClick={() => { if (!blocked) setNewTime(s); }} disabled={blocked}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: blocked ? 'not-allowed' : 'pointer', transition: 'all 0.18s',
                      background: blocked ? 'rgba(248,113,113,0.1)' : selected ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--t-input-bg)',
                      borderColor: blocked ? 'rgba(248,113,113,0.3)' : selected ? 'transparent' : 'var(--t-border)',
                      color: blocked ? '#f87171' : selected ? '#fff' : 'var(--t-text-2)',
                      boxShadow: selected ? '0 0 14px rgba(99,102,241,0.35)' : 'none',
                    }}>
                    {formatTimeLabel(s)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !newTime}
            style={{ flex: 2, height: 48, borderRadius: 14, border: 'none', cursor: saving || !newTime ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, opacity: saving || !newTime ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {saving ? <span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} /> : 'Confirm Reschedule'}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, height: 48, borderRadius: 14, background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', cursor: 'pointer', color: 'var(--t-text-2)', fontWeight: 600, fontSize: 14 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BookingCard ───────────────────────────────────────────────
function BookingCard({ booking: initialBooking, userCoords, onCancelled }) {
  const [booking, setBooking]           = useState(initialBooking);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewed, setReviewed]         = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const status = booking.status || 'pending';

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try { await API.post(`/customer/bookings/${booking._id}/cancel`); onCancelled(booking._id); }
    catch (err) { alert(err?.message || 'Could not cancel. Try again.'); }
    finally { setCancelling(false); }
  };

  const handleRescheduled = (id, date, time) =>
    setBooking(prev => ({ ...prev, appointmentDate: date, appointmentTime: time, status: 'pending' }));

  const salonDoc    = booking.salonId;
  const salonName   = booking.salonName || salonDoc?.name || 'Salon';
  const salonCity   = salonDoc?.city || salonDoc?.address || '';
  const salonPhone  = salonDoc?.phone || null;
  const serviceName = booking.serviceName ||
    (Array.isArray(booking.serviceIds) ? booking.serviceIds.map(s => s?.name || s).filter(Boolean).join(' + ') : '') || 'Service';

  const dur = booking.estimatedDuration;
  const durLabel = dur ? (dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ''}` : `${dur} min`) : null;

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
    { label: 'Amount',   value: booking.totalAmount != null ? `₹${booking.totalAmount}` : '—', accent: true },
    ...(durLabel ? [{ label: 'Duration', value: durLabel }] : []),
    { label: 'Payment',  value: booking.paymentMethod ? booking.paymentMethod.charAt(0).toUpperCase() + booking.paymentMethod.slice(1) : '—' },
    ...(distanceLabel ? [{ label: 'Distance', value: distanceLabel }] : []),
  ];

  return (
    <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', borderRadius: 20, padding: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', flexShrink: 0, boxShadow: '0 0 16px rgba(99,102,241,0.3)' }}>✂</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{serviceName}</p>
          <p style={{ fontSize: 13, color: 'var(--t-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{salonName}</p>
          {!!salonCity && <p style={{ fontSize: 12, color: 'var(--t-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{salonCity}</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Detail tiles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {detailTiles.map(tile => (
          <div key={tile.label} style={{ flex: '1 1 30%', minWidth: 0, borderRadius: 10, padding: '10px 12px', background: tile.accent ? 'rgba(99,102,241,0.08)' : 'var(--t-bg-2)', border: `1px solid ${tile.accent ? 'rgba(99,102,241,0.18)' : 'var(--t-border)'}` }}>
            <p style={{ fontSize: 11, color: tile.accent ? 'var(--t-accent)' : 'var(--t-text-3)', marginBottom: 2 }}>{tile.label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: tile.accent ? 'var(--t-accent)' : 'var(--t-text)' }}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Pending banner */}
      {status === 'pending' && (
        <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: '#fbbf24' }}>Awaiting confirmation from the salon. You'll be notified once confirmed.</p>
        </div>
      )}

      {canReview && <ReviewPrompt bookingId={booking._id} onReviewed={() => setReviewed(true)} />}
      {reviewed && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10 }}>
          <p style={{ fontSize: 12, color: '#34d399' }}>Thank you for your review! ✨</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ paddingTop: 12, borderTop: '1px solid var(--t-border)', marginTop: 4 }}>
        <p style={{ fontSize: 11, color: 'var(--t-text-3)', marginBottom: 8 }}>
          Booking ID: <span style={{ fontFamily: 'monospace' }}>{booking.bookingId || booking._id?.slice(-8) || '—'}</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {!!salonPhone && (
            <a href={`tel:${salonPhone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--t-accent)', textDecoration: 'none' }}>
              <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              {salonPhone}
            </a>
          )}
          {!!mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#34d399', textDecoration: 'none' }}>
              <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Directions
            </a>
          )}
          {canReschedule && (
            <button onClick={() => setRescheduleOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--t-accent)' }}>
              Reschedule
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling} style={{ background: 'none', border: 'none', cursor: cancelling ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: '#f87171', opacity: cancelling ? 0.5 : 1 }}>
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {rescheduleOpen && <RescheduleModal booking={booking} onClose={() => setRescheduleOpen(false)} onRescheduled={handleRescheduled} />}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const [filter, setFilter]               = useState('Upcoming');
  const [bookings, setBookings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [userCoords, setUserCoords]       = useState(null);
  const [confirmedToasts, setConfirmedToasts] = useState([]);
  const [visibleCount, setVisibleCount]   = useState(PAGE_SIZE);
  const prevStatusRef = useRef({});

  const isAuth   = !!getCustomerToken();
  const userName = getUserName();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, { maximumAge: 60000, timeout: 6000 }
    );
  }, []);

  const loadBookings = useCallback(async (silent = false, signal = null) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get('/customer/bookings');
      if (signal?.aborted) return;
      const fresh = res.data.data?.bookings || res.data.data || [];
      const arr = Array.isArray(fresh) ? fresh : [];
      const newlyConfirmed = arr.filter(b => b._id && prevStatusRef.current[b._id] === 'pending' && b.status === 'confirmed');
      if (newlyConfirmed.length > 0) { setConfirmedToasts(prev => [...prev, ...newlyConfirmed.map(b => b._id)]); setFilter('Upcoming'); }
      arr.forEach(b => { if (b._id) prevStatusRef.current[b._id] = b.status; });
      setBookings(arr);
    } catch { if (!signal?.aborted) setBookings([]); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    const signal = { aborted: false };
    loadBookings(false, signal);
    return () => { signal.aborted = true; };
  }, [isAuth, loadBookings]);

  const handleRefresh = async () => { setRefreshing(true); await loadBookings(true); setRefreshing(false); };
  const handleCancelled = id => setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));

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

  const nextUpcoming = bookings
    .filter(b => ['pending', 'confirmed'].includes(b.status))
    .sort((a, b) => {
      const da = new Date(String(a.appointmentDate).slice(0,10)+'T'+(a.appointmentTime||'12:00')+':00');
      const db = new Date(String(b.appointmentDate).slice(0,10)+'T'+(b.appointmentTime||'12:00')+':00');
      return da - db;
    })[0] || null;

  if (!isAuth) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--t-bg)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
      <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-text)', marginBottom: 8 }}>Sign in to view bookings</p>
      <p style={{ fontSize: 14, color: 'var(--t-text-3)', textAlign: 'center', lineHeight: 1.7, marginBottom: 24, maxWidth: 280 }}>Track all your salon appointments in one place</p>
      <Link to="/login" style={{ padding: '12px 32px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, borderRadius: 14, textDecoration: 'none', boxShadow: '0 0 28px rgba(99,102,241,0.4)', fontSize: 15 }}>Sign In →</Link>
    </div>
  );

  return (
    <div style={{ background: 'var(--t-bg)', minHeight: '100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg,#3730a3 0%,#4f46e5 40%,#7c3aed 70%,#6d28d9 100%)', padding: '32px 16px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.25) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>My Bookings</p>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 4, letterSpacing: '-0.5px' }}>Welcome back, {userName} 👋</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Ready for your next look today?</p>
            </div>
            <Link to="/notifications" style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, textDecoration: 'none' }}>
              <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              {unreadCount > 0 && <span style={{ position: 'absolute', top: 1, right: 1, minWidth: 16, height: 16, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid #4f46e5' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Upcoming',  value: loading ? '—' : stats.upcoming,  icon: '📅' },
              { label: 'Completed', value: loading ? '—' : stats.completed, icon: '✅' },
              { label: 'Total',     value: loading ? '—' : stats.total,     icon: '📋' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 18, marginBottom: 2 }}>{icon}</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Next upcoming mini-card */}
          {!loading && nextUpcoming && (
            <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✂</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextUpcoming.serviceName || (Array.isArray(nextUpcoming.serviceIds) ? nextUpcoming.serviceIds.map(s => s?.name || s).filter(Boolean).join(' + ') : '') || 'Service'}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {nextUpcoming.salonName || nextUpcoming.salonId?.name || 'Salon'} · {formatDateLabel(nextUpcoming.appointmentDate)}{nextUpcoming.appointmentTime ? ` · ${formatTimeLabel(nextUpcoming.appointmentTime)}` : ''}
                  </p>
                </div>
              </div>
              <StatusBadge status={nextUpcoming.status} />
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' }}>

        {/* Confirmed toasts */}
        {confirmedToasts.map(id => {
          const b = bookings.find(x => x._id === id);
          if (!b) return null;
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 14, gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>Booking Confirmed!</p>
                  <p style={{ fontSize: 11, color: 'rgba(52,211,153,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{b.serviceName} at {b.salonName || b.salonId?.name} — {b.appointmentTime}</p>
                </div>
              </div>
              <button onClick={() => setConfirmedToasts(prev => prev.filter(t => t !== id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', flexShrink: 0, fontSize: 14 }}>✕</button>
            </div>
          );
        })}

        {/* Filter tabs */}
        <div style={{ display: 'flex', background: 'var(--t-card)', border: '1px solid var(--t-border)', borderRadius: 14, padding: 4, gap: 4, marginBottom: 10 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => { setFilter(f); setVisibleCount(PAGE_SIZE); }}
              style={{
                flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: filter === f ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--t-text-3)',
                boxShadow: filter === f ? '0 0 14px rgba(99,102,241,0.35)' : 'none',
              }}>
              {f}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: refreshing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--t-accent)', opacity: refreshing ? 0.5 : 1 }}>
            <svg style={{ width: 13, height: 13, animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <span style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', textAlign: 'center', gap: 12 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              {filter === 'Completed' ? '✅' : filter === 'Cancelled' ? '🚫' : '📅'}
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-text)' }}>
              {filter === 'All' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
            </p>
            <p style={{ fontSize: 14, color: 'var(--t-text-3)', lineHeight: 1.7, maxWidth: 280 }}>
              {filter === 'All' ? "You haven't booked any salon yet. Find top-rated salons near you!" : `You have no ${filter.toLowerCase()} bookings right now.`}
            </p>
            {(filter === 'All' || filter === 'Upcoming') && (
              <Link to="/" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, borderRadius: 14, textDecoration: 'none', fontSize: 14, boxShadow: '0 0 28px rgba(99,102,241,0.4)' }}>
                🔍 Book Your First Salon →
              </Link>
            )}
          </div>
        )}

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!loading && visible.map(b => (
            <BookingCard key={b._id} booking={b} userCoords={userCoords} onCancelled={handleCancelled} />
          ))}
        </div>

        {/* Load more */}
        {!loading && hasMore && (
          <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            style={{ width: '100%', marginTop: 12, padding: '14px', background: 'var(--t-card)', border: '1px solid var(--t-border)', borderRadius: 14, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--t-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            Load More
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
        )}

        {!loading && !hasMore && filtered.length > PAGE_SIZE && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--t-text-3)', marginTop: 12 }}>All {filtered.length} bookings shown</p>
        )}
      </div>
    </div>
  );
}
