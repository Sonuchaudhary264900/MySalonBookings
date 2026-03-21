import React, { useEffect, useState, useRef, useCallback } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import api from "../../services/api";
import * as salonService from "../../services/salonService";
import { useSalon } from "../../hooks/useSalon";
import { TrendingUp, Users, Calendar, IndianRupee, ChevronLeft, ChevronRight, Plus, X, MoreVertical, ShieldOff, ShieldCheck } from "lucide-react";
import { formatDate, formatTime } from "../../utils/exportHelpers";

const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUS_STYLES = {
  confirmed:   "bg-green-100 text-green-700",
  pending:     "bg-yellow-100 text-yellow-700",
  completed:   "bg-blue-100 text-blue-700",
  cancelled:   "bg-red-100 text-red-700",
  in_progress: "bg-purple-100 text-purple-700",
};

const positionLabel = (i) => {
  if (i === 0) return { label: "Next Up", cls: "bg-indigo-600 text-white" };
  if (i === 1) return { label: "2nd", cls: "bg-blue-100 text-blue-700" };
  if (i === 2) return { label: "3rd", cls: "bg-sky-100 text-sky-700" };
  return { label: `${i + 1}th`, cls: "bg-gray-100 text-gray-600" };
};

const today   = localDate(0);
const maxDate = localDate(30);

// ── Walk-in Modal ────────────────────────────────────────────────────────
const WalkInModal = ({ salon, services, onClose, onSuccess }) => {
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate]           = useState(today);
  const [slot, setSlot]           = useState("");
  const [slots, setSlots]         = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  const selectedService = services.find((s) => s._id === serviceId);

  const timeToMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const isPastSlot = (s) => {
    if (date !== today) return false;
    const now = new Date();
    return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
  };

  useEffect(() => {
    if (!selectedService || !date || !salon?._id) return;
    setSlot(""); setSlots([]); setBlockedSlots([]); setClosedDay(false); setSlotsLoading(true);
    salonService.getBookedSlots(String(salon._id), date, selectedService.duration)
      .then((data) => { setSlots(data.slots || []); setBlockedSlots(data.blockedSlots || []); setClosedDay(data.closedDay || false); })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [serviceId, date, salon?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())  { setError("Customer name is required"); return; }
    if (!phone.trim()) { setError("Customer phone is required"); return; }
    if (!serviceId)    { setError("Please select a service"); return; }
    if (!slot)         { setError("Please select a time slot"); return; }
    setError(""); setSubmitting(true);
    try {
      await onSuccess({ customerName: name.trim(), customerPhone: phone.trim(), serviceId, appointmentDate: date, appointmentTime: slot });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Walk-in Customer</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter customer name"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" required>
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s._id} value={s._id}>{s.name} — {s.duration} min — ₹{s.basePrice}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
            <input type="date" min={today} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          {serviceId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Time Slot {selectedService && <span className="ml-1 text-xs font-normal text-gray-400">({selectedService.duration} min)</span>}
              </label>
              {slotsLoading ? (
                <div className="flex items-center gap-2 py-3 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Loading slots…
                </div>
              ) : closedDay ? (
                <p className="text-sm text-amber-600 py-2">Salon is closed on this day.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No slots available for this date.</p>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-slate-300" /> Past</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400" /> Booked</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-indigo-600" /> Selected</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slots.map((s) => {
                      const past    = isPastSlot(s);
                      const blocked = !past && blockedSlots.includes(s);
                      const selected = slot === s;
                      const [h, m] = s.split(":").map(Number);
                      const endMin = h * 60 + m + (selectedService?.duration || 30);
                      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
                      return (
                        <button key={s} type="button" onClick={() => { if (!past && !blocked) setSlot(s); }}
                          className={`py-2 px-1 text-xs rounded-lg border transition-all font-medium text-center leading-tight ${
                            past ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : blocked ? "bg-red-100 text-red-500 border-red-300 cursor-not-allowed"
                              : selected ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                          }`}>
                          <span className="block">{s}</span>
                          <span className="block opacity-75">– {endTime}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          {slot && selectedService && (
            <div className="bg-indigo-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-indigo-800 mb-1">Booking Summary</p>
              <div className="space-y-1 text-indigo-700">
                <div className="flex justify-between"><span>Customer</span><span className="font-medium">{name || "—"}</span></div>
                <div className="flex justify-between"><span>Service</span><span className="font-medium">{selectedService.name}</span></div>
                <div className="flex justify-between"><span>Slot</span><span className="font-medium">{slot}</span></div>
                <div className="flex justify-between border-t border-indigo-200 pt-1 mt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-indigo-900">₹{selectedService.basePrice}</span>
                </div>
              </div>
            </div>
          )}
          <button type="submit" disabled={submitting || !slot}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Creating Booking…" : "Confirm Walk-in Booking"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Queue Card ───────────────────────────────────────────────────────────
const QueueCard = ({ booking, index, onStatusChange, onBlock, onUnblock }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actioning, setActioning] = useState(false);
  const menuRef = useRef(null);
  const pos = positionLabel(index);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  const act = async (fn) => {
    setActioning(true);
    try { await fn(); } finally { setActioning(false); }
  };

  const isBlocked = booking.customerBlocked;

  return (
    <div className={`relative flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition ${index === 0 ? "border-indigo-300 bg-indigo-50/60" : "border-gray-200 bg-white"}`}>
      {/* Position badge */}
      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${pos.cls}`}>{pos.label}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{booking.customerName || "—"}</p>
        <p className="text-sm text-gray-500">{booking.serviceName} · {formatTime(booking.appointmentTime)}</p>
        {booking.totalAmount ? <p className="text-xs text-gray-400 mt-0.5">₹{booking.totalAmount}</p> : null}
      </div>

      {/* Status badge */}
      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-600"}`}>
        {booking.status?.replace("_", " ")}
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {booking.status === "pending" && (
          <button disabled={actioning}
            onClick={() => act(() => onStatusChange(booking._id, "confirmed"))}
            className="px-2.5 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50">
            Confirm
          </button>
        )}
        {(booking.status === "confirmed" || booking.status === "pending") && (
          <button disabled={actioning}
            onClick={() => act(() => onStatusChange(booking._id, "in_progress"))}
            className="px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50">
            Start
          </button>
        )}
        {booking.status === "in_progress" && (
          <button disabled={actioning}
            onClick={() => act(() => onStatusChange(booking._id, "completed"))}
            className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50">
            Done
          </button>
        )}
        {booking.status !== "cancelled" && booking.status !== "completed" && (
          <button disabled={actioning}
            onClick={() => act(() => onStatusChange(booking._id, "cancelled"))}
            className="px-2.5 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-medium transition disabled:opacity-50">
            Cancel
          </button>
        )}

        {/* "..." menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition text-gray-400 hover:text-gray-700">
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {isBlocked ? (
                <button onClick={() => { setMenuOpen(false); act(() => onUnblock(booking.customerId)); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-green-700 hover:bg-green-50 transition">
                  <ShieldCheck className="w-4 h-4" /> Unblock Customer
                </button>
              ) : (
                <button onClick={() => { setMenuOpen(false); act(() => onBlock(booking.customerId)); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                  <ShieldOff className="w-4 h-4" /> Block Customer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Dashboard ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { salon, services, createWalkInBooking, fetchServices } = useSalon();

  // Stats
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Queue (today's pending + confirmed, sorted by time)
  const [queue, setQueue]           = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  // All bookings (date navigator)
  const [selectedDate, setSelectedDate]         = useState(today);
  const [bookings, setBookings]                 = useState([]);
  const [bookingsLoading, setBookingsLoading]   = useState(false);

  // Walk-in modal
  const [walkInOpen, setWalkInOpen] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get("/owner/analytics/dashboard");
      setStats(res.data.data);
    } catch (err) {
      console.error("Dashboard stats failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await salonService.getBookings({ date: today });
      const active = (res.data || [])
        .filter((b) => b.status === "pending" || b.status === "confirmed" || b.status === "in_progress")
        .sort((a, b) => (a.appointmentTime || "").localeCompare(b.appointmentTime || ""));
      setQueue(active);
    } catch {
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async (date) => {
    setBookingsLoading(true);
    try {
      const res = await salonService.getBookings({ date });
      setBookings(res.data || []);
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardStats(); fetchServices(); fetchQueue(); }, []);
  useEffect(() => { fetchBookings(selectedDate); }, [selectedDate]);

  const shiftDate = (days) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setSelectedDate(next);
  };

  const handleStatusChange = async (bookingId, status) => {
    await api.put(`/owner/bookings/${bookingId}`, { status });
    fetchQueue();
    if (selectedDate === today) fetchBookings(today);
  };

  const handleBlock = async (customerId) => {
    await api.post(`/owner/customers/${customerId}/block`);
    fetchQueue();
  };

  const handleUnblock = async (customerId) => {
    await api.delete(`/owner/customers/${customerId}/block`);
    fetchQueue();
  };

  const handleWalkInSuccess = async (data) => {
    await createWalkInBooking(data);
    fetchQueue();
    if (selectedDate === today) fetchBookings(today);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader fullscreen />
      </DashboardLayout>
    );
  }

  const dashboardStats = [
    { title: "Total Revenue",    value: `₹${stats?.totalRevenue || 0}`,   icon: IndianRupee },
    { title: "Total Bookings",   value: stats?.totalBookings || 0,         icon: Calendar },
    { title: "Active Customers", value: stats?.activeCustomers || 0,       icon: Users },
    { title: "Growth Rate",      value: `${stats?.growthRate || 0}%`,      icon: TrendingUp },
  ];

  const isToday = selectedDate === today;
  const displayLabel = isToday ? "Today" : formatDate(selectedDate + "T12:00:00");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's your salon's performance</p>
          </div>
          <button
            onClick={() => setWalkInOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Walk-in
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <Icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Live Queue */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Today's Queue</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {queue.length} active booking{queue.length !== 1 ? "s" : ""} right now
              </p>
            </div>
            <button onClick={fetchQueue} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">Refresh</button>
          </div>

          {queueLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Loading queue…
            </div>
          ) : queue.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">✓</p>
              <p className="text-gray-400 text-sm">No active bookings right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((booking, i) => (
                <QueueCard
                  key={booking._id}
                  booking={booking}
                  index={i}
                  onStatusChange={handleStatusChange}
                  onBlock={handleBlock}
                  onUnblock={handleUnblock}
                />
              ))}
            </div>
          )}
        </div>

        {/* All Bookings (date navigator) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bookings</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {bookings.length} booking{bookings.length !== 1 ? "s" : ""} · {displayLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => shiftDate(-1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <input type="date" value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
              <button onClick={() => shiftDate(1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {bookingsLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Loading bookings…
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No bookings on {displayLabel}.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map((booking) => (
                <div key={booking._id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{booking.customerName || "—"}</p>
                    <p className="text-sm text-gray-500">{booking.serviceName} · {formatTime(booking.appointmentTime)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-600"}`}>
                      {booking.status?.replace("_", " ")}
                    </span>
                    {booking.totalAmount ? <p className="text-xs text-gray-500 mt-0.5">₹{booking.totalAmount}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Walk-in Modal */}
      {walkInOpen && (
        <WalkInModal
          salon={salon}
          services={services || []}
          onClose={() => setWalkInOpen(false)}
          onSuccess={handleWalkInSuccess}
        />
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
