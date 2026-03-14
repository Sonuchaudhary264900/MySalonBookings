import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { formatDate, formatTime } from "../utils/formatters";

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

function BookingCard({ booking, userCoords }) {
  const status = booking.status || "pending";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  // appointmentDate may come as full ISO ("2026-03-14T12:00:00.000Z") or "YYYY-MM-DD"
  const dateOnly = booking.appointmentDate ? String(booking.appointmentDate).slice(0, 10) : null;
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
          <p className="text-slate-700 font-medium">{formatTime(booking.appointmentTime)}</p>
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
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("Upcoming");
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const token = localStorage.getItem("customerToken");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadBookings();
    // Silently get location for distance calculation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await API.get("/customer/bookings");
      setBookings(res.data.data?.bookings || res.data.data || []);
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
              <BookingCard key={b._id} booking={b} userCoords={userCoords} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
