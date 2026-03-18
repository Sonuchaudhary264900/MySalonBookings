import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import API from "../services/api";
import { isCustomer, clearCustomerAuth } from "../utils/auth";
import { formatDate } from "../utils/formatters";
import { useNotifications } from "../context/NotificationContext";

function Booking() {
  const { salonId, serviceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast, addNotification } = useNotifications();

  // Support multi-service: serviceIds from state, fallback to single serviceId in URL
  const serviceIdsFromState = location.state?.serviceIds;
  const serviceIdList = serviceIdsFromState?.length
    ? serviceIdsFromState
    : serviceId ? [serviceId] : [];

  const [salon, setSalon]         = useState(null);
  const [services, setServices]   = useState([]);   // all selected services
  const [date, setDate]           = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [slot, setSlot]           = useState("");
  const [slots, setSlots]         = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");
  const [slotPopup, setSlotPopup] = useState(null);

  const localDate = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const today      = localDate(0);
  const advanceDays = salon?.advanceBookingDays ?? 1;
  const maxDateStr  = localDate(advanceDays);

  // Combined totals across all selected services
  const totalDuration = services.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalPrice    = services.reduce((sum, s) => sum + (s.basePrice || s.price || 0), 0);

  const timeToMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const isPastSlot = (s) => {
    if (date !== today) return false;
    const now = new Date();
    return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
  };

  // ── Load salon + all selected services ────────────────────
  useEffect(() => {
    if (!serviceIdList.length) return;
    const loadData = async () => {
      try {
        const [salonRes, servicesRes] = await Promise.all([
          API.get(`/public/salons/${salonId}`),
          API.get(`/public/salons/${salonId}/services`),
        ]);
        const salonData = salonRes.data.data || salonRes.data.salon;
        setSalon(salonData);

        const allServices = servicesRes.data.data?.services || servicesRes.data.data || [];
        const selected = allServices.filter(s => serviceIdList.includes(s._id));
        setServices(selected);

        const days = salonData?.advanceBookingDays ?? 1;
        const max  = localDate(days);
        setDate(prev => (prev > max ? today : prev));
      } catch { /* silent */ }
    };
    loadData();
  }, [salonId, serviceId]);

  // ── Re-fetch slots whenever date or services change ────────
  useEffect(() => {
    if (!date || !salonId || !totalDuration) return;
    setSlot("");
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);

    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await API.get(
          `/public/salons/${salonId}/booked-slots?date=${date}&duration=${totalDuration}`
        );
        const data = res.data.data || {};
        setSlots(data.slots || []);
        setBlockedSlots(data.blockedSlots || []);
        setClosedDay(data.closedDay || false);
      } catch {
        setSlots([]);
        setBlockedSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [date, salonId, totalDuration]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!date) { setError("Please select a date."); return; }
    if (!slot)  { setError("Please select a time slot."); return; }

    if (!isCustomer()) {
      clearCustomerAuth();
      navigate("/login");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await API.post("/customer/bookings", {
        salonId,
        serviceIds: serviceIdList,
        appointmentDate: date,
        appointmentTime: slot,
        paymentMethod: "cash",
      });
      addToast("success", "Booking confirmed!");
      addNotification({
        type: "booking",
        title: "Booking Confirmed",
        message: `${services.map(s => s.name).join(" + ")} at ${salon?.name} on ${date} at ${slot}`,
      });
      setSuccess(true);
    } catch (err) {
      addToast("error", err.message || "Booking failed. Please try again.");
      setError(err.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
          <p className="text-slate-500 text-sm mb-1">
            <strong>{services.map(s => s.name).join(" + ")}</strong> at <strong>{salon?.name}</strong>
          </p>
          <p className="text-slate-500 text-sm mb-6">{date} at {slot}</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate("/dashboard")} className="btn-primary w-full">
              View My Bookings
            </button>
            <button onClick={() => navigate("/")} className="btn-outline w-full">
              Browse More Salons
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Book Appointment</h1>
        <p className="text-muted mb-6">Fill in the details to confirm your booking.</p>

        {/* Summary card */}
        {(salon || services.length > 0) && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-xl shrink-0">✂</div>
              <p className="font-semibold text-slate-800 truncate">{salon?.name || "Salon"}</p>
            </div>
            {services.length > 0 && (
              <div className="space-y-1.5">
                {services.map(s => (
                  <div key={s._id} className="flex justify-between text-sm text-slate-600">
                    <span>{s.name} <span className="text-slate-400">· {s.duration} min</span></span>
                    <span className="font-medium text-indigo-600">₹{s.basePrice || s.price}</span>
                  </div>
                ))}
                {services.length > 1 && (
                  <div className="flex justify-between text-sm font-semibold text-slate-800 border-t border-slate-100 pt-1.5 mt-1.5">
                    <span>Total · {totalDuration} min</span>
                    <span className="text-indigo-700">₹{totalPrice}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <form onSubmit={handleBooking} className="space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

            {/* Date picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date</label>
              <input
                type="date"
                min={today}
                max={maxDateStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
              {salon && (
                <p className="text-xs text-slate-400 mt-1">
                  {advanceDays === 0
                    ? "This salon accepts same-day bookings only."
                    : `Bookings accepted up to ${advanceDays} day${advanceDays > 1 ? "s" : ""} in advance.`}
                </p>
              )}
            </div>

            {/* Time slots */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Time Slot
                {totalDuration > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    ({totalDuration} min total)
                  </span>
                )}
              </label>

              {!services.length ? (
                <p className="text-sm text-slate-400 italic">Loading service info…</p>
              ) : slotsLoading ? (
                <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Loading available slots…
                </div>
              ) : closedDay ? (
                <div className="p-4 bg-amber-50 rounded-xl text-amber-700 text-sm text-center">
                  🔒 Bookings are not available on this date. Please choose another date.
                </div>
              ) : slots.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-slate-500 text-sm text-center">
                  No available slots for this date.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-slate-300" /> Past</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400" /> Booked</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-indigo-600" /> Selected</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded border border-slate-200 bg-white" /> Available</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((s) => {
                      const past    = isPastSlot(s);
                      const blocked = !past && blockedSlots.includes(s);
                      const selected = slot === s;

                      const [h, m] = s.split(":").map(Number);
                      const endMin = h * 60 + m + totalDuration;
                      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (past)    { setSlotPopup("past");   return; }
                            if (blocked) { setSlotPopup("booked"); return; }
                            setSlot(s);
                          }}
                          className={`py-2 px-1 text-xs rounded-lg border transition-all font-medium text-center leading-tight ${
                            past
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : blocked
                              ? "bg-red-100 text-red-500 border-red-300 cursor-not-allowed"
                              : selected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                        >
                          <span className="block">{s}</span>
                          <span className="block opacity-75">– {endTime}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Slot unavailable popup */}
            {slotPopup && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
                  {slotPopup === "past" ? (
                    <>
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">⏰</div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Time Has Passed</h3>
                      <p className="text-sm text-slate-500 mb-5">This time slot has already passed. Please choose an upcoming slot.</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🚫</div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Slot Already Booked</h3>
                      <p className="text-sm text-slate-500 mb-5">This slot is taken. Please choose another available slot.</p>
                    </>
                  )}
                  <button onClick={() => setSlotPopup(null)} className="btn-primary w-full">
                    Choose Another Slot
                  </button>
                </div>
              </div>
            )}

            {/* Booking summary */}
            {date && slot && (
              <div className="bg-indigo-50 rounded-xl p-4 text-sm fade-in">
                <p className="font-semibold text-indigo-800 mb-2">Booking Summary</p>
                <div className="space-y-1 text-indigo-700">
                  {services.map(s => (
                    <div key={s._id} className="flex justify-between">
                      <span>{s.name}</span>
                      <span className="font-medium">₹{s.basePrice || s.price}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span className="font-medium">{totalDuration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-medium">{formatDate(date + "T12:00:00")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time</span>
                    <span className="font-medium">{slot} – {(() => {
                      const [h, m] = slot.split(":").map(Number);
                      const end = h * 60 + m + totalDuration;
                      return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
                    })()}</span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-200 pt-2 mt-2">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-indigo-900">₹{totalPrice}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !date || !slot}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed py-3"
            >
              {loading ? "Confirming…" : "Confirm Booking"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Booking;
