import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import CelebrationOverlay from "../../components/onboarding/CelebrationOverlay";
import WelcomeBackOverlay from "../../components/onboarding/WelcomeBackOverlay";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import api from "../../services/api";
import * as salonService from "../../services/salonService";
import { useSalon } from "../../hooks/useSalon";
import { useAuth } from "../../hooks/useAuth";
import ROUTES from "../../routes";
import {
  ChevronLeft, ChevronRight, Plus, X, MoreVertical, ShieldOff, ShieldCheck,
  RefreshCw, Users, CalendarCheck, IndianRupee, Clock, TrendingUp, TrendingDown,
  Scissors, CheckCircle2, XCircle, Loader2, Activity, Zap, ArrowRight,
} from "lucide-react";
import { formatDate, formatTime } from "../../utils/exportHelpers";

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const today   = localDate(0);
const maxDate = localDate(30);

const STATUS_STYLES = {
  confirmed:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  pending:     "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  completed:   "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  cancelled:   "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  in_progress: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
};

const QUEUE_LABEL = (i) => {
  if (i === 0) return { label: "Next Up", cls: "bg-indigo-600 text-white" };
  if (i === 1) return { label: "2nd",     cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" };
  if (i === 2) return { label: "3rd",     cls: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" };
  return { label: `${i + 1}th`,           cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─── SVG Sparkline ─────────────────────────────────────────────────────── */
const Sparkline = ({ data = [], color = "#6366f1" }) => {
  if (!data || data.length < 2) return <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />;
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const W = 160, H = 40;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * (H - 6) - 3;
    return [x, y];
  });
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const gradId = `sg-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts[pts.length - 1] && (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
      )}
    </svg>
  );
};

/* ─── Skeleton loader ────────────────────────────────────────────────────── */
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />
);

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, iconColor, iconBg, trend, trendLabel, sparkData, sparkColor, loading }) => {
  const isUp = trend >= 0;
  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
          {loading
            ? <Skeleton className="h-8 w-20 mt-1.5" />
            : <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          }
        </div>
        <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>

      {/* Sparkline */}
      {sparkData && <Sparkline data={sparkData} color={sparkColor} />}

      {/* Trend */}
      {trendLabel && (
        <div className="flex items-center gap-1.5">
          {isUp
            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          }
          <span className={`text-xs font-semibold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {isUp ? "+" : ""}{trend}%
          </span>
          <span className="text-xs text-gray-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

/* ─── Walk-in Modal ─────────────────────────────────────────────────────── */
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

  const inputCls = "w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md my-auto border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Walk-in Customer</h2>
            <p className="text-xs text-gray-400 mt-0.5">Create a booking for a walk-in customer</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm">
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Customer Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter customer name" className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Mobile Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Service</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls} required>
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s._id} value={s._id}>{s.name} — {s.duration} min — ₹{s.basePrice}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Date</label>
            <input type="date" min={today} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
          </div>
          {serviceId && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Time Slot {selectedService && <span className="normal-case font-normal text-gray-400">({selectedService.duration} min)</span>}
              </label>
              {slotsLoading ? (
                <div className="flex items-center gap-2 py-3 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Loading slots…
                </div>
              ) : closedDay ? (
                <p className="text-sm text-amber-600 py-2 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Salon is closed on this day.
                </p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No slots available for this date.</p>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2 text-[11px] text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-gray-300 dark:bg-gray-600" /> Past</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-red-400" /> Booked</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-indigo-600" /> Selected</span>
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
                          className={`py-2 px-1 text-xs rounded-xl border transition-all font-medium text-center leading-tight ${
                            past    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                            : blocked ? "bg-red-50 dark:bg-red-950/30 text-red-400 border-red-200 dark:border-red-800 cursor-not-allowed"
                            : selected ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900"
                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600"
                          }`}>
                          <span className="block">{s}</span>
                          <span className="block opacity-60 text-[10px]">– {endTime}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          {slot && selectedService && (
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 text-sm">
              <p className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Booking Summary
              </p>
              <div className="space-y-1.5 text-indigo-700 dark:text-indigo-400">
                <div className="flex justify-between text-xs"><span>Customer</span><span className="font-medium">{name || "—"}</span></div>
                <div className="flex justify-between text-xs"><span>Service</span><span className="font-medium">{selectedService.name}</span></div>
                <div className="flex justify-between text-xs"><span>Time</span><span className="font-medium">{slot}</span></div>
                <div className="flex justify-between border-t border-indigo-200 dark:border-indigo-700 pt-1.5 mt-1.5">
                  <span className="font-semibold text-xs">Total</span>
                  <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">₹{selectedService.basePrice}</span>
                </div>
              </div>
            </div>
          )}
          <button type="submit" disabled={submitting || !slot}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Confirm Walk-in Booking"}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Queue Card ────────────────────────────────────────────────────────── */
const QueueCard = ({ booking, index, onStatusChange, onBlock, onUnblock }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actioning, setActioning] = useState(false);
  const menuRef = useRef(null);
  const pos = QUEUE_LABEL(index);
  const isBlocked = booking.customerBlocked;

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  const act = async (fn) => { setActioning(true); try { await fn(); } finally { setActioning(false); } };

  /* Estimated wait (minutes per position) */
  const waitMin = index * 20;
  const waitLabel = waitMin === 0 ? "Next in queue" : `~${waitMin} min wait`;

  const actionBtn = (label, cls, fn) => (
    <button disabled={actioning} onClick={() => act(fn)}
      className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors disabled:opacity-40 ${cls}`}>
      {label}
    </button>
  );

  return (
    <div className={`relative flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all duration-150 ${
      index === 0
        ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30"
        : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700"
    }`}>
      {/* Left accent bar for "Next Up" */}
      {index === 0 && <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-full" />}

      {/* Position badge */}
      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${pos.cls}`}>{pos.label}</span>

      {/* Customer info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white truncate">{booking.customerName || "—"}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <Scissors className="w-3 h-3 inline mr-1 opacity-60" />
          {booking.serviceName} · {formatTime(booking.appointmentTime)}
        </p>
        {booking.totalAmount ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">₹{booking.totalAmount}</p>
        ) : null}
      </div>

      {/* Wait time */}
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />{waitLabel}
        </p>
      </div>

      {/* Status badge */}
      <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-600"}`}>
        {booking.status?.replace("_", " ")}
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        {booking.status === "pending" && actionBtn("Confirm", "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", () => onStatusChange(booking._id, "confirmed"))}
        {(booking.status === "confirmed" || booking.status === "pending") && actionBtn("Start", "bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400", () => onStatusChange(booking._id, "in_progress"))}
        {booking.status === "in_progress" && actionBtn("Done", "bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", () => onStatusChange(booking._id, "completed"))}
        {booking.status !== "cancelled" && booking.status !== "completed" && actionBtn("Cancel", "bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400", () => onStatusChange(booking._id, "cancelled"))}

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-20 overflow-hidden">
              {isBlocked ? (
                <button onClick={() => { setMenuOpen(false); act(() => onUnblock(booking.customerId)); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                  <ShieldCheck className="w-4 h-4" /> Unblock Customer
                </button>
              ) : (
                <button onClick={() => { setMenuOpen(false); act(() => onBlock(booking.customerId)); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
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

/* ─── Mini bar chart (weekly) ───────────────────────────────────────────── */
const WeeklyBars = ({ data = [], color = "#6366f1" }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-12" aria-hidden="true">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{ height: `${Math.max((d.value / max) * 40, 2)}px`, background: color, opacity: i === data.length - 1 ? 1 : 0.45 }}
            title={`${DAY_LABELS[new Date(d.date + "T12:00:00").getDay()]}: ${d.value}`}
          />
          <span className="text-[9px] text-gray-400 dark:text-gray-600">
            {DAY_LABELS[new Date(d.date + "T12:00:00").getDay()]}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Section card wrapper ──────────────────────────────────────────────── */
const SectionCard = ({ title, subtitle, action, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

/* ─── Empty state ────────────────────────────────────────────────────────── */
const EmptyState = ({ icon: Icon = CalendarCheck, message = "Nothing here yet" }) => (
  <div className="py-12 flex flex-col items-center gap-3 text-center">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <Icon className="w-7 h-7 text-gray-400 dark:text-gray-600" />
    </div>
    <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
  </div>
);

/* ─── Dashboard ─────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const { salon, services, createWalkInBooking, fetchServices } = useSalon();
  const { user } = useAuth();
  const navigate = useNavigate();

  /* Queue: today's active bookings */
  const [queue, setQueue]             = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  /* Bookings by selected date */
  const [selectedDate, setSelectedDate] = useState(today);
  const [bookings, setBookings]         = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  /* Weekly analytics data */
  const [weeklyBookings, setWeeklyBookings] = useState([]);
  const [weeklyRevenue,  setWeeklyRevenue]  = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  /* Walk-in modal */
  const [walkInOpen, setWalkInOpen] = useState(false);

  /* Team stats */
  const [teamStats, setTeamStats] = useState([]);

  /* First-time celebration vs. welcome-back overlay */
  const celebrationKey   = user?._id ? `glx_cel_${user._id}`  : null;
  const welcomeBackKey   = user?._id ? `glx_wb_${user._id}`   : null;

  const [showCelebration, setShowCelebration] = useState(() => {
    if (!celebrationKey) return false;
    return !localStorage.getItem(celebrationKey);
  });

  const [showWelcomeBack, setShowWelcomeBack] = useState(() => {
    if (!welcomeBackKey) return false;
    // Only show welcome-back after the celebration has been seen (i.e. key set)
    // and not on this session yet
    const celebSeen = !!localStorage.getItem(celebrationKey);
    const wbShown   = sessionStorage.getItem(welcomeBackKey);
    return celebSeen && !wbShown;
  });

  const handleCelebrationDone = () => {
    if (celebrationKey) localStorage.setItem(celebrationKey, '1');
    setShowCelebration(false);
  };

  const handleWelcomeBackDone = () => {
    if (welcomeBackKey) sessionStorage.setItem(welcomeBackKey, '1');
    setShowWelcomeBack(false);
  };

  /* ── Fetch team stats (only when staff exist) ── */
  useEffect(() => {
    api.get('/owner/team/stats')
      .then(res => {
        const team = res.data.data?.team || [];
        if (team.length > 1) setTeamStats(team);
      })
      .catch(() => {});
  }, []);

  /* ── Fetch queue ── */
  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await salonService.getBookings({ date: today });
      const active = (res.data || [])
        .filter((b) => ["pending", "confirmed", "in_progress"].includes(b.status))
        .sort((a, b) => (a.appointmentTime || "").localeCompare(b.appointmentTime || ""));
      setQueue(active);
    } catch { setQueue([]); }
    finally { setQueueLoading(false); }
  }, []);

  /* ── Fetch bookings for date ── */
  const fetchBookings = useCallback(async (date) => {
    setBookingsLoading(true);
    try {
      const res = await salonService.getBookings({ date });
      setBookings(res.data || []);
    } catch { setBookings([]); }
    finally { setBookingsLoading(false); }
  }, []);

  /* ── Fetch 7-day weekly analytics (single API call) ── */
  const fetchWeeklyAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const start = localDate(-6);
      const end   = localDate(0);
      const res   = await api.get(`/owner/analytics/dashboard?startDate=${start}&endDate=${end}`);
      const daily = res.data?.data?.dailyRevenue || [];
      const map   = {};
      daily.forEach(d => { map[d.date] = d; });
      const bookingsArr = [];
      const revenueArr  = [];
      for (let i = -6; i <= 0; i++) {
        const d     = localDate(i);
        const entry = map[d] || { bookings: 0, revenue: 0 };
        bookingsArr.push({ date: d, value: entry.bookings });
        revenueArr.push({ date: d, value: entry.revenue });
      }
      setWeeklyBookings(bookingsArr);
      setWeeklyRevenue(revenueArr);
    } catch {
      const zeros = [-6,-5,-4,-3,-2,-1,0].map(o => ({ date: localDate(o), value: 0 }));
      setWeeklyBookings(zeros);
      setWeeklyRevenue(zeros);
    } finally { setAnalyticsLoading(false); }
  }, []);

  useEffect(() => { fetchServices(); fetchQueue(); fetchWeeklyAnalytics(); }, []);
  useEffect(() => { fetchBookings(selectedDate); }, [selectedDate]);

  /* ── Date navigator ── */
  const shiftDate = (days) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  /* ── Status change / block ── */
  const handleStatusChange = async (bookingId, status) => {
    await api.put(`/owner/bookings/${bookingId}`, { status });
    fetchQueue();
    fetchBookings(selectedDate);
  };

  const handleBlock   = async (customerId) => { await api.post(`/owner/customers/${customerId}/block`);   fetchQueue(); fetchBookings(selectedDate); };
  const handleUnblock = async (customerId) => { await api.delete(`/owner/customers/${customerId}/block`); fetchQueue(); fetchBookings(selectedDate); };

  const handleWalkInSuccess = async (data) => {
    await createWalkInBooking(data);
    fetchQueue();
    if (selectedDate === today) fetchBookings(today);
  };

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const todayRevenue = bookings
      .filter(b => b.status === "completed")
      .reduce((s, b) => s + (b.totalAmount || 0), 0);
    const upcoming = bookings.filter(b => ["pending", "confirmed"].includes(b.status)).length;
    // Week-over-week trend (compare last day vs day before)
    const wb = weeklyBookings;
    const todayCount  = wb[wb.length - 1]?.value ?? 0;
    const yestCount   = wb[wb.length - 2]?.value ?? 0;
    const bkTrend     = yestCount ? Math.round(((todayCount - yestCount) / yestCount) * 100) : 0;
    const wr = weeklyRevenue;
    const todayRev    = wr[wr.length - 1]?.value ?? 0;
    const yestRev     = wr[wr.length - 2]?.value ?? 0;
    const revTrend    = yestRev ? Math.round(((todayRev - yestRev) / yestRev) * 100) : 0;
    return { todayBookings: bookings.length, todayRevenue, activeQueue: queue.length, upcoming, bkTrend, revTrend };
  }, [bookings, queue, weeklyBookings, weeklyRevenue]);

  const isToday      = selectedDate === today;
  const displayLabel = isToday ? "Today" : formatDate(selectedDate + "T12:00:00");
  const filteredBookings = statusFilter === "all" ? bookings : bookings.filter(b => b.status === statusFilter);

  /* ── Greeting helper ── */
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  /* ── Render ── */
  return (
    <DashboardLayout>
      {showCelebration && (
        <CelebrationOverlay
          name={user?.name}
          salonName={salon?.name}
          businessType={salon?.businessType}
          onDone={handleCelebrationDone}
        />
      )}
      {!showCelebration && showWelcomeBack && (
        <WelcomeBackOverlay
          name={user?.name}
          salonName={salon?.name}
          businessType={salon?.businessType}
          onDone={handleWelcomeBackDone}
        />
      )}
      <div className="space-y-5">

        {/* ══════════════════════════════════════════════════════════
            HERO BANNER
        ══════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 sm:p-6 shadow-xl shadow-indigo-500/25">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute top-0 right-0 w-full h-full"
            style={{ background: "radial-gradient(ellipse at 80% 0%,rgba(255,255,255,0.07) 0%,transparent 60%)" }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400 animate-pulse" />
                <span className="text-white/60 text-xs font-semibold tracking-wide uppercase">Live Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {getGreeting()}, {user?.name?.split(" ")[0] || "Owner"}!
              </h1>
              <p className="text-white/60 text-sm mt-1 font-medium">
                {salon?.name && <span className="text-white/80 font-semibold">{salon.name} · </span>}
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button onClick={fetchQueue} disabled={queueLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/15 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button onClick={() => setWalkInOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-white/90 transition-all shadow-lg shadow-black/20">
                <Plus className="w-4 h-4" />
                Add Walk-in
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            STAT CARDS  (4-up grid)
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Bookings Today"
            value={analyticsLoading ? "—" : stats.todayBookings}
            icon={CalendarCheck}
            iconBg="bg-gradient-to-br from-indigo-500 to-violet-600"
            iconColor="text-white"
            trend={stats.bkTrend}
            trendLabel="vs yesterday"
            sparkData={weeklyBookings}
            sparkColor="#6366f1"
            loading={analyticsLoading}
          />
          <StatCard
            label="Revenue Today"
            value={analyticsLoading ? "—" : `₹${stats.todayRevenue.toLocaleString()}`}
            icon={IndianRupee}
            iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
            iconColor="text-white"
            trend={stats.revTrend}
            trendLabel="vs yesterday"
            sparkData={weeklyRevenue}
            sparkColor="#10b981"
            loading={analyticsLoading}
          />
          <StatCard
            label="Active Queue"
            value={queueLoading ? "—" : stats.activeQueue}
            icon={Users}
            iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
            iconColor="text-white"
            trendLabel="in queue now"
            trend={0}
            loading={queueLoading}
          />
          <StatCard
            label="Upcoming"
            value={bookingsLoading ? "—" : stats.upcoming}
            icon={Clock}
            iconBg="bg-gradient-to-br from-violet-500 to-purple-700"
            iconColor="text-white"
            trendLabel="pending/confirmed"
            trend={0}
            loading={bookingsLoading}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════
            TEAM TODAY  (only shown when salon has staff)
        ══════════════════════════════════════════════════════════ */}
        {teamStats.length > 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Team — This Month</h2>
              <a href="/dashboard/team" className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors">Manage →</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-2.5 text-left">Staff</th>
                    <th className="px-4 py-2.5 text-right">Bookings</th>
                    <th className="px-4 py-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map(s => (
                    <tr key={s._id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            {s.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
                          {s.isOwner && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 font-semibold">You</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300 font-medium">{s.bookings}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">₹{s.revenue?.toLocaleString() || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            QUEUE + CHARTS  (side-by-side on desktop)
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Live Queue ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Live Queue</h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {queue.length} active booking{queue.length !== 1 ? "s" : ""} · Today
                  </p>
                </div>
              </div>
              {queue.length > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  {queue.length} in queue
                </span>
              )}
            </div>
            <div className="p-5">
              {queueLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : queue.length === 0 ? (
                <EmptyState icon={CalendarCheck} message="Queue is clear! No active bookings." />
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
          </div>

          {/* ── Weekly Analytics (stacked charts) ── */}
          <div className="flex flex-col gap-5">
            {/* Bookings chart */}
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Booking Trend</h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Last 7 days</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {weeklyBookings.reduce((s, d) => s + d.value, 0)}
                  </p>
                  <p className="text-[10px] text-gray-400">total bookings</p>
                </div>
              </div>
              {analyticsLoading
                ? <Skeleton className="h-16" />
                : <WeeklyBars data={weeklyBookings} color="#6366f1" />
              }
            </div>

            {/* Revenue chart */}
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Revenue Trend</h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Last 7 days</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{weeklyRevenue.reduce((s, d) => s + d.value, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400">total revenue</p>
                </div>
              </div>
              {analyticsLoading
                ? <Skeleton className="h-16" />
                : <WeeklyBars data={weeklyRevenue} color="#10b981" />
              }
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            BOOKINGS BY DATE
        ══════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/25">
                <CalendarCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Bookings · <span className={isToday ? "text-indigo-600 dark:text-indigo-400" : ""}>{displayLabel}</span>
                </h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
                  {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Date navigator */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-1.5 py-1">
                <button onClick={() => shiftDate(-1)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  aria-label="Previous day">
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs text-gray-700 dark:text-gray-300 bg-transparent focus:outline-none cursor-pointer"
                  aria-label="Select date"
                />
                <button onClick={() => shiftDate(1)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  aria-label="Next day">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {!isToday && (
                <button onClick={() => setSelectedDate(today)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Booking rows */}
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {bookingsLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : filteredBookings.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                message={`No ${statusFilter === "all" ? "" : statusFilter + " "}bookings on ${displayLabel}.`}
              />
            ) : (
              filteredBookings.map((booking) => (
                <div key={booking._id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {(booking.customerName || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {booking.customerName || "—"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5">
                        <Scissors className="w-3 h-3 shrink-0" />
                        {booking.serviceName}
                        <span className="opacity-40">·</span>
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatTime(booking.appointmentTime)}
                      </p>
                    </div>
                  </div>

                  {/* Amount + Status */}
                  <div className="flex items-center gap-3 shrink-0">
                    {booking.totalAmount ? (
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 hidden sm:block">
                        ₹{booking.totalAmount}
                      </span>
                    ) : null}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-600"}`}>
                      {booking.status?.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            QUICK ACTIONS + RECENT ACTIVITY
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: "Add Walk-in",    icon: Plus,          action: () => setWalkInOpen(true),        color: "from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 text-indigo-700 dark:text-indigo-300 hover:from-indigo-100 hover:to-violet-100 dark:hover:from-indigo-900/50 dark:hover:to-violet-900/50 border border-indigo-200/60 dark:border-indigo-800/60" },
                { label: "All Bookings",   icon: CalendarCheck, action: () => navigate(ROUTES.BOOKINGS),  color: "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700" },
                { label: "Services",       icon: Scissors,      action: () => navigate(ROUTES.SERVICES),  color: "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700" },
                { label: "Customers",      icon: Users,         action: () => navigate(ROUTES.CUSTOMERS), color: "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700" },
              ].map(({ label, icon: Icon, action, color }) => (
                <button key={label} onClick={action}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 bg-gradient-to-r ${color}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <Activity className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Activity</h3>
              </div>
              <span className="text-[11px] text-gray-400 dark:text-gray-600 font-medium">{isToday ? "Today" : displayLabel}</span>
            </div>

            <div className="p-5">
              {bookingsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : bookings.length === 0 ? (
                <EmptyState icon={Activity} message="No activity recorded yet." />
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {[...bookings]
                    .sort((a, b) => (b.appointmentTime || "").localeCompare(a.appointmentTime || ""))
                    .slice(0, 8)
                    .map((b) => {
                      const si = {
                        completed:   { cls: "bg-emerald-500", label: "Completed" },
                        confirmed:   { cls: "bg-indigo-500",  label: "Confirmed" },
                        in_progress: { cls: "bg-purple-500",  label: "In Progress" },
                        pending:     { cls: "bg-amber-500",   label: "Pending" },
                        cancelled:   { cls: "bg-red-500",     label: "Cancelled" },
                      }[b.status] || { cls: "bg-gray-400", label: b.status };

                      return (
                        <div key={b._id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {(b.customerName || "?")[0].toUpperCase()}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${si.cls}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {b.customerName || "—"}
                              <span className="font-normal text-gray-400 dark:text-gray-500"> · {b.serviceName}</span>
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-600">{formatTime(b.appointmentTime)}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[b.status] || "bg-gray-100 text-gray-600"}`}>
                            {si.label}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>{/* end space-y-5 */}

      {/* ── Walk-in Modal ── */}
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
