import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../services/api";
import { formatDate, formatTime } from "../utils/formatters";

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1")
  .replace(/\/api\/v1\/?$/, "");

// Decode JWT payload to extract customer ID without extra API call
const getCustomerIdFromToken = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]))?.id || null;
  } catch { return null; }
};

const CACHE_KEY = "smartsalon_booking_statuses";

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "bg-amber-50 text-amber-600 border border-amber-200" },
  confirmed:   { label: "Confirmed",   color: "bg-blue-50 text-blue-600 border border-blue-200" },
  in_progress: { label: "In Progress", color: "bg-violet-50 text-violet-600 border border-violet-200" },
  completed:   { label: "Completed",   color: "bg-green-50 text-green-600 border border-green-200" },
  cancelled:   { label: "Cancelled",   color: "bg-red-50 text-red-500 border border-red-200" },
};

const FILTERS = ["All", "Upcoming", "Completed", "Cancelled"];

// Haversine distance in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function ReviewPrompt({ bookingId, salonId, onReviewed }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return (
    <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
      ✅ Thank you for your review!
    </div>
  );

  if (!open) return (
    <div className="mt-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700 flex items-center justify-between">
      <span>⭐ How was your experience?</span>
      <button onClick={() => setOpen(true)} className="font-semibold hover:underline ml-2">Leave a Review</button>
    </div>
  );

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await API.post("/customer/reviews", { bookingId, salonRating: rating, reviewText: text.trim() || undefined });
      setDone(true);
      onReviewed?.(bookingId);
    } catch {
      // silent — already reviewed
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 px-3 py-3 bg-indigo-50 border border-indigo-100 rounded-lg space-y-2">
      <p className="text-xs font-semibold text-indigo-700">Rate your experience</p>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`text-xl transition-colors ${n <= (hover || rating) ? "text-amber-400" : "text-slate-300"}`}
          >★</button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
        placeholder="Share your experience (optional)"
        className="w-full px-2 py-1.5 border border-indigo-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
      />
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={!rating || submitting}
          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
          {submitting ? "Submitting…" : "Submit"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">Cancel</button>
      </div>
    </div>
  );
}

function RescheduleModal({ booking, onClose, onRescheduled }) {
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  const [newDate, setNewDate] = useState(today);
  const [newTime, setNewTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const salonId = booking.salonId?._id || booking.salonId;
  const duration = booking.estimatedDuration || 30;

  // Fetch available slots whenever date changes
  useEffect(() => {
    if (!newDate || !salonId) return;
    setNewTime("");
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);
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
    if (!newDate || !newTime) { setError("Please select a date and an available time slot."); return; }
    setSaving(true);
    setError("");
    try {
      await API.put(`/customer/bookings/${booking._id}/reschedule`, { appointmentDate: newDate, appointmentTime: newTime });
      onRescheduled(booking._id, newDate, newTime);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reschedule. Please try another slot.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Reschedule Booking</h3>

        {/* Date picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Select Date</label>
          <input type="date" min={today} value={newDate} onChange={e => setNewDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {/* Available slots */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Time Slot</label>
          {slotsLoading ? (
            <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Loading slots…
            </div>
          ) : closedDay ? (
            <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">🔒 Salon is closed on this day. Choose another date.</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">No available slots on this date.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-300" /> Booked</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-indigo-600" /> Selected</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded border border-slate-200" /> Available</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {slots.map(s => {
                  const blocked = blockedSlots.includes(s);
                  const selected = newTime === s;
                  return (
                    <button key={s} type="button"
                      onClick={() => { if (!blocked) setNewTime(s); }}
                      disabled={blocked}
                      className={`py-2 px-1 text-xs rounded-lg border font-medium transition-all text-center ${
                        blocked
                          ? "bg-red-50 text-red-400 border-red-200 cursor-not-allowed"
                          : selected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !newTime}
            className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? "Saving…" : "Confirm Reschedule"}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking, userCoords, onCancelled }) {
  const [cancelling, setCancelling] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [bookingData, setBookingData] = useState(booking);
  const status = bookingData.status || "pending";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const handleCancel = async () => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancelling(true);
    try {
      await API.post(`/customer/bookings/${booking._id}/cancel`);
      onCancelled(booking._id);
    } catch {
      alert("Failed to cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduled = (id, date, time) => {
    setBookingData(prev => ({ ...prev, appointmentDate: date, appointmentTime: time, status: "pending" }));
  };

  // appointmentDate may come as full ISO ("2026-03-14T12:00:00.000Z") or "YYYY-MM-DD"
  const dateOnly = bookingData.appointmentDate ? String(bookingData.appointmentDate).slice(0, 10) : null;
  const dateStr = dateOnly ? formatDate(dateOnly + "T12:00:00") : "—";

  // Duration label
  const dur = booking.estimatedDuration;
  const durLabel = dur ? (dur >= 60 ? `${dur / 60}h` : `${dur} min`) : null;

  // Distance — salonId is populated with location, address, city, phone
  const salonDoc = booking.salonId;
  let distanceLabel = null;
  if (userCoords && salonDoc?.location?.coordinates?.length === 2) {
    const [salonLng, salonLat] = salonDoc.location.coordinates;
    const km = getDistanceKm(userCoords.lat, userCoords.lng, salonLat, salonLng);
    distanceLabel = formatDistance(km);
  }

  const salonName = booking.salonName || salonDoc?.name || "Salon";
  const salonCity = salonDoc?.city || salonDoc?.address || "";
  const salonPhone = salonDoc?.phone || null;

  // Google Maps link — prefer coordinates, fall back to address search
  let mapsUrl = null;
  if (salonDoc?.location?.coordinates?.length === 2) {
    const [lng, lat] = salonDoc.location.coordinates;
    mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  } else {
    const query = [salonDoc?.address || booking.salonName, salonDoc?.city].filter(Boolean).join(", ");
    if (query) mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-sm transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center text-white text-xl shrink-0">
            ✂
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{booking.serviceName || "Service"}</h3>
            <p className="text-sm text-slate-500">{salonName}</p>
            {salonCity && <p className="text-xs text-slate-400">{salonCity}</p>}
          </div>
        </div>
        <span className={`badge text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Detail grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm">
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-slate-400 text-xs mb-0.5">Date</p>
          <p className="text-slate-700 font-medium">{dateStr}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-slate-400 text-xs mb-0.5">Time</p>
          <p className="text-slate-700 font-medium">{formatTime(bookingData.appointmentTime)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-slate-400 text-xs mb-0.5">Amount</p>
          <p className="text-indigo-600 font-bold">₹{booking.totalAmount ?? "—"}</p>
        </div>
        {durLabel && (
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-slate-400 text-xs mb-0.5">Duration</p>
            <p className="text-slate-700 font-medium">{durLabel}</p>
          </div>
        )}
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-slate-400 text-xs mb-0.5">Payment</p>
          <p className="text-slate-700 font-medium capitalize">{booking.paymentMethod || "—"}</p>
        </div>
        {distanceLabel && (
          <div className="bg-indigo-50 rounded-lg p-2.5">
            <p className="text-indigo-400 text-xs mb-0.5">Distance</p>
            <p className="text-indigo-700 font-medium flex items-center gap-1"><img src="https://img.freepik.com/free-vector/location_53876-25530.jpg" alt="location" className="w-4 h-4 object-contain" /> {distanceLabel}</p>
          </div>
        )}
      </div>

      {/* Pending info banner */}
      {status === "pending" && (
        <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          ⏳ Awaiting confirmation from the salon. You'll be notified here once confirmed.
        </div>
      )}

      {/* Review prompt for completed bookings */}
      {status === "completed" && !reviewed && (
        <ReviewPrompt bookingId={booking._id} salonId={booking.salonId?._id || booking.salonId} onReviewed={() => setReviewed(true)} />
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-400">
          Booking ID: <span className="font-mono text-slate-500">{booking.bookingId || booking._id?.slice(-8)}</span>
        </p>
        <div className="flex items-center gap-3">
          {salonPhone && (
            <a
              href={`tel:${salonPhone}`}
              className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
            >
              📞 {salonPhone}
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 font-medium hover:underline flex items-center gap-1"
            >
              <img src="https://img.freepik.com/free-vector/location_53876-25530.jpg" alt="location" className="w-4 h-4 object-contain" /> Get Directions
            </a>
          )}
          {["pending", "confirmed"].includes(status) && (
            <button
              onClick={() => setRescheduleOpen(true)}
              className="text-xs text-indigo-500 font-medium hover:underline"
            >
              Reschedule
            </button>
          )}
          {["pending", "confirmed"].includes(status) && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      </div>

      {rescheduleOpen && (
        <RescheduleModal
          booking={bookingData}
          onClose={() => setRescheduleOpen(false)}
          onRescheduled={handleRescheduled}
        />
      )}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("Upcoming");

  const handleCancelled = (bookingId) => {
    setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: "cancelled" } : b));
  };
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const [confirmedToasts, setConfirmedToasts] = useState([]); // newly confirmed bookings
  const token = localStorage.getItem("customerToken");
  const pollRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadBookings();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }

    // ── Socket.IO real-time updates ──────────────────────────
    const customerId = getCustomerIdFromToken(token);
    if (customerId) {
      const socket = io(SOCKET_URL, { transports: ["websocket", "polling"], reconnectionAttempts: 5 });
      socketRef.current = socket;
      socket.emit("join-customer-room", customerId);
      socket.on("booking-status-changed", ({ bookingId, status }) => {
        setBookings(prev =>
          prev.map(b => b._id === bookingId ? { ...b, status } : b)
        );
        // Detect newly confirmed via socket too
        if (status === "confirmed") {
          setConfirmedToasts(prev => [...prev, bookingId]);
          setFilter("Upcoming");
        }
      });
    }

    // Poll every 30 seconds as fallback
    pollRef.current = setInterval(() => loadBookings(true), 30000);
    return () => {
      clearInterval(pollRef.current);
      socketRef.current?.disconnect();
    };
  }, []);

  // Dismiss a toast
  const dismissToast = (id) => setConfirmedToasts(prev => prev.filter(t => t !== id));

  const loadBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get("/customer/bookings");
      const fresh = res.data.data?.bookings || res.data.data || [];

      // Compare with cached statuses — detect pending → confirmed
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
        const newlyConfirmed = fresh.filter(
          b => cached[b._id] === "pending" && b.status === "confirmed"
        );
        if (newlyConfirmed.length > 0) {
          setConfirmedToasts(prev => [...prev, ...newlyConfirmed.map(b => b._id)]);
          setFilter("Upcoming"); // switch to upcoming so they see it
        }
        // Update cache
        const updated = {};
        fresh.forEach(b => { updated[b._id] = b.status; });
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch { /* ignore cache errors */ }

      setBookings(fresh);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (filter === "All") return true;
    if (filter === "Upcoming") return ["pending", "confirmed", "in_progress"].includes(b.status);
    if (filter === "Completed") return b.status === "completed";
    if (filter === "Cancelled") return b.status === "cancelled";
    return true;
  });

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b) => ["pending", "confirmed", "in_progress"].includes(b.status)).length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-muted mt-1">Track and manage all your appointments.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total",     value: stats.total,    color: "text-slate-700" },
            { label: "Upcoming",  value: stats.upcoming, color: "text-blue-600" },
            { label: "Completed", value: stats.completed, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Confirmation toasts */}
        {confirmedToasts.length > 0 && bookings
          .filter(b => confirmedToasts.includes(b._id))
          .map(b => (
            <div key={b._id} className="flex items-start justify-between gap-3 mb-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">Booking Confirmed!</p>
                  <p className="text-xs text-green-600">
                    <strong>{b.serviceName}</strong> at <strong>{b.salonName}</strong> — {b.appointmentTime}
                  </p>
                </div>
              </div>
              <button onClick={() => dismissToast(b._id)} className="text-green-400 hover:text-green-600 text-lg leading-none shrink-0">×</button>
            </div>
          ))
        }

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-100 mb-5 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all min-w-max px-3 ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-5">
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-11 h-11 skeleton rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton rounded w-1/2" />
                    <div className="h-3 skeleton rounded w-1/3" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((j) => <div key={j} className="h-12 skeleton rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {filter === "All" ? "No bookings yet" : `No ${filter.toLowerCase()} bookings`}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              {filter === "All" ? "Book your first appointment to get started." : "Try a different filter."}
            </p>
            {filter === "All" && (
              <button onClick={() => navigate("/")} className="btn-primary">Browse Salons</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <BookingCard key={b._id} booking={b} userCoords={userCoords} onCancelled={handleCancelled} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
