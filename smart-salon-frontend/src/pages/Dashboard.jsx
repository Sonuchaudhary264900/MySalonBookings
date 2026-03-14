import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "bg-amber-50 text-amber-600 border border-amber-200" },
  confirmed: { label: "Confirmed", color: "bg-blue-50 text-blue-600 border border-blue-200" },
  completed: { label: "Completed", color: "bg-green-50 text-green-600 border border-green-200" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-500 border border-red-200" },
};

const FILTERS = ["All", "Upcoming", "Completed", "Cancelled"];

function BookingCard({ booking }) {
  const status = booking.status || "pending";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const dateStr = booking.appointmentDate
    ? new Date(booking.appointmentDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-sm transition-shadow fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center text-white text-xl shrink-0">
            ✂
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">
              {booking.serviceName || "Service"}
            </h3>
            <p className="text-sm text-slate-500">
              {booking.salonName || "Salon"}
            </p>
          </div>
        </div>
        <span className={`badge text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-slate-400 text-xs mb-0.5">Date</p>
          <p className="text-slate-700 font-medium">{dateStr}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-slate-400 text-xs mb-0.5">Time</p>
          <p className="text-slate-700 font-medium">{booking.appointmentTime || "—"}</p>
        </div>
        {booking.totalAmount > 0 && (
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-slate-400 text-xs mb-0.5">Amount</p>
            <p className="text-indigo-600 font-bold">₹{booking.totalAmount}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const ALL_SECTIONS = [
  {
    key: "Upcoming",
    label: "Upcoming",
    icon: "🕐",
    color: "text-blue-600",
    activeBg: "bg-blue-600",
    filter: (b) => ["pending", "confirmed"].includes(b.status),
  },
  {
    key: "Cancelled",
    label: "Cancelled",
    icon: "✕",
    color: "text-red-500",
    activeBg: "bg-red-500",
    filter: (b) => b.status === "cancelled",
  },
  {
    key: "Completed",
    label: "Completed",
    icon: "✓",
    color: "text-green-600",
    activeBg: "bg-green-600",
    filter: (b) => b.status === "completed",
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("Upcoming");
  const [openSection, setOpenSection] = useState("Upcoming");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await API.get("/customer/bookings");
      setBookings(res.data.data?.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (filter === "Upcoming") return ["pending", "confirmed"].includes(b.status);
    if (filter === "Completed") return b.status === "completed";
    if (filter === "Cancelled") return b.status === "cancelled";
    return true;
  });

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b) => ["pending", "confirmed"].includes(b.status)).length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  const SkeletonList = () => (
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
  );

  const EmptyState = ({ label }) => (
    <div className="text-center py-14">
      <div className="text-5xl mb-4">📅</div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        {label === "All" ? "No bookings yet" : `No ${label.toLowerCase()} bookings`}
      </h3>
      <p className="text-slate-400 text-sm mb-6">
        {label === "All" ? "Book your first appointment to get started." : "Nothing here yet."}
      </p>
      {label === "All" && (
        <button onClick={() => navigate("/")} className="btn-primary">Browse Salons</button>
      )}
    </div>
  );

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
            { label: "Total", value: stats.total, color: "text-slate-700" },
            { label: "Upcoming", value: stats.upcoming, color: "text-blue-600" },
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
          <SkeletonList />
        ) : filter === "All" ? (
          /* ── All tab: 3 accordion sections ── */
          bookings.length === 0 ? (
            <EmptyState label="All" />
          ) : (
            <div className="space-y-3">
              {ALL_SECTIONS.map((section) => {
                const sectionBookings = section.filter(bookings);
                const isOpen = openSection === section.key;
                return (
                  <div key={section.key} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    {/* Section button */}
                    <button
                      onClick={() => setOpenSection(isOpen ? null : section.key)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${section.color}`}>{section.icon}</span>
                        <span className="font-semibold text-slate-800">{section.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isOpen ? `${section.activeBg} text-white` : "bg-slate-100 text-slate-500"
                        }`}>
                          {sectionBookings.length}
                        </span>
                      </div>
                      <span className={`text-slate-400 text-lg transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </button>

                    {/* Section body */}
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                        {sectionBookings.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-6">
                            No {section.label.toLowerCase()} bookings.
                          </p>
                        ) : (
                          sectionBookings.map((b) => <BookingCard key={b._id} booking={b} />)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : filtered.length === 0 ? (
          <EmptyState label={filter} />
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <BookingCard key={b._id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
