import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import API from "../services/api";
import { isCustomer, clearCustomerAuth } from "../utils/auth";
import { formatDate } from "../utils/formatters";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";

function Booking() {
  const { salonId, serviceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast, addNotification } = useNotifications();
  const { isDark } = useTheme();

  // Support multi-service: serviceIds from state, fallback to single serviceId in URL
  const serviceIdsFromState = location.state?.serviceIds;
  const serviceIdList = serviceIdsFromState?.length
    ? serviceIdsFromState
    : serviceId ? [serviceId] : [];

  const [salon, setSalon]         = useState(null);
  const [services, setServices]   = useState([]);   // all selected services
  const [barbers, setBarbers]     = useState([]);
  const [barberId, setBarberId]   = useState("");
  const [date, setDate]           = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [slot, setSlot]           = useState("");
  const [slots, setSlots]         = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [bookingMode, setBookingMode] = useState("flexible");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [bookingStatus, setBookingStatus] = useState("confirmed");
  const [error, setError]         = useState("");
  const [slotPopup, setSlotPopup] = useState(null);
  const [couponInput, setCouponInput]     = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError]     = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const localDate = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const today      = localDate(0);
  const advanceDays = salon?.advanceBookingDays ?? 1;
  const maxDateStr  = localDate(advanceDays);

  // Combined totals across all selected services
  const totalDuration = services.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalPrice    = services.reduce((sum, s) => sum + (s.basePrice || s.price || 0), 0);
  const finalPrice    = Math.max(0, totalPrice - couponDiscount);

  const timeToMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const isPastSlot = (s) => {
    if (date !== today) return false;
    const now = new Date();
    return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
  };

  // ── Load salon + all selected services + barbers ───────────
  useEffect(() => {
    if (!serviceIdList.length) return;
    const loadData = async () => {
      try {
        const [salonRes, servicesRes, barbersRes] = await Promise.all([
          API.get(`/public/salons/${salonId}`),
          API.get(`/public/salons/${salonId}/services`),
          API.get(`/public/salons/${salonId}/barbers`),
        ]);
        const salonData = salonRes.data.data || salonRes.data.salon;
        setSalon(salonData);

        const allServices = servicesRes.data.data?.services || servicesRes.data.data || [];
        const selected = allServices.filter(s => serviceIdList.includes(s._id));
        setServices(selected);

        setBarbers(barbersRes.data.data?.barbers || []);

        const days = salonData?.advanceBookingDays ?? 1;
        const max  = localDate(days);
        setDate(prev => (prev > max ? today : prev));
      } catch { /* silent */ }
    };
    loadData();
  }, [salonId, serviceId]);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError("");
    setCouponLoading(true);
    try {
      const res = await API.post("/customer/coupons/validate", {
        code: couponInput.trim(),
        salonId,
        totalAmount: totalPrice,
      });
      const { coupon, discount } = res.data.data;
      setAppliedCoupon(coupon);
      setCouponDiscount(discount);
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon");
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput("");
    setCouponError("");
  };

  // ── Re-fetch slots whenever date or services change ────────
  useEffect(() => {
    if (!date || !salonId || !totalDuration) return;
    setSlot("");
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);

    let stale = false;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await API.get(
          `/public/salons/${salonId}/booked-slots?date=${date}&duration=${totalDuration}`
        );
        if (stale) return;
        const data = res.data.data || {};
        const mode = data.bookingMode || "flexible";
        setBookingMode(mode);
        setSlots(data.slots || []);
        setBlockedSlots(data.blockedSlots || []);
        setClosedDay(data.closedDay || false);
        // Sequential: auto-select the single returned slot
        if (mode === "sequential" && data.slots?.length === 1) {
          setSlot(data.slots[0]);
        }
      } catch {
        if (stale) return;
        setSlots([]);
        setBlockedSlots([]);
      } finally {
        if (!stale) setSlotsLoading(false);
      }
    };
    fetchSlots();
    return () => { stale = true; };
  }, [date, salonId, totalDuration]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!date) { setError("Please select a date."); return; }
    if (!slot)  { setError("Please select a time slot."); return; }
    if (isPastSlot(slot)) { setSlot(""); setError("This time slot has just passed. Please select another."); return; }

    if (!isCustomer()) {
      clearCustomerAuth();
      navigate("/login", {
        state: {
          from: location.pathname,
          bookingState: { serviceIds: serviceIdList },
        },
      });
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await API.post("/customer/bookings", {
        salonId,
        serviceIds: serviceIdList,
        barberId: barberId || undefined,
        appointmentDate: date,
        appointmentTime: slot,
        paymentMethod: "cash",
        couponCode: appliedCoupon?.code || undefined,
      });
      const status = res.data.data?.booking?.status || res.data.data?.status || "confirmed";
      setBookingStatus(status);
      if (status === "confirmed") {
        addToast("success", "Booking confirmed!");
        addNotification({ type: "booking", title: "Booking Confirmed", message: `${services.map(s => s.name).join(" + ")} at ${salon?.name} on ${date} at ${slot}` });
      } else {
        addToast("info", "Booking received! Awaiting salon confirmation.");
        addNotification({ type: "booking", title: "Booking Pending", message: `Your booking at ${salon?.name} is awaiting confirmation.` });
      }
      setSuccess(true);
    } catch (err) {
      const status  = err.response?.status;
      const message = err.response?.data?.message || "Booking failed. Please try again.";

      if (status === 409) {
        // Slot was taken between the UI check and the server write — show conflict popup,
        // clear the selected slot, and re-fetch so the blocked slot is reflected in the UI.
        setSlot("");
        setSlotPopup("booked");
        try {
          const res = await API.get(
            `/public/salons/${salonId}/booked-slots?date=${date}&duration=${totalDuration}`
          );
          const data = res.data.data || {};
          setSlots(data.slots || []);
          setBlockedSlots(data.blockedSlots || []);
        } catch { /* silent */ }
      } else {
        addToast("error", message);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────
  if (success) {
    const isPending = bookingStatus === "pending";
    return (
      <div className="t-page flex items-center justify-center px-4">
        <div className="t-card rounded-2xl p-8 max-w-sm w-full text-center fade-in" style={{ boxShadow: 'var(--t-shadow)' }}>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5"
            style={{
              background: isPending ? 'var(--t-warn-bg)' : 'var(--t-success-bg)',
              border: isPending ? '1px solid var(--t-warn-border)' : '1px solid var(--t-success-border)',
            }}
          >
            {isPending ? "⏳" : "✅"}
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--t-text)' }}>
            {isPending ? "Booking Received!" : "Booking Confirmed!"}
          </h2>
          {isPending && (
            <div className="t-warn mb-3 px-4 py-2.5 rounded-xl text-sm">
              Your booking is <strong>pending confirmation</strong> from the salon. You'll be notified once confirmed.
            </div>
          )}
          <p className="text-sm mb-1" style={{ color: 'var(--t-text-2)' }}>
            <strong style={{ color: 'var(--t-text)' }}>{services.map(s => s.name).join(" + ")}</strong> at <strong style={{ color: 'var(--t-text)' }}>{salon?.name}</strong>
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--t-text-2)' }}>{date} at {slot}</p>
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
    <div className="t-page py-8 px-4">
      <div className="max-w-lg mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm mb-5 transition-colors"
          style={{ color: 'var(--t-text-2)' }}
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--t-text)' }}>Book Appointment</h1>
        <p className="text-muted mb-6" style={{ color: 'var(--t-text-2)' }}>Fill in the details to confirm your booking.</p>

        {/* Summary card */}
        {(salon || services.length > 0) && (
          <div className="t-card rounded-xl p-4 mb-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-xl shrink-0">✂</div>
              <p className="font-semibold truncate" style={{ color: 'var(--t-text)' }}>{salon?.name || "Salon"}</p>
            </div>
            {services.length > 0 && (
              <div className="space-y-1.5">
                {services.map(s => (
                  <div key={s._id} className="flex justify-between text-sm" style={{ color: 'var(--t-text-2)' }}>
                    <span>{s.name} <span style={{ color: 'var(--t-text-3)' }}>· {s.duration} min</span></span>
                    <span className="font-medium" style={{ color: 'var(--t-accent)' }}>₹{s.basePrice || s.price}</span>
                  </div>
                ))}
                {services.length > 1 && (
                  <div className="flex justify-between text-sm font-semibold pt-1.5 mt-1.5 t-divider" style={{ color: 'var(--t-text)' }}>
                    <span>Total · {totalDuration} min</span>
                    <span style={{ color: 'var(--t-accent)' }}>₹{totalPrice}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="t-card rounded-2xl p-6">
          <form onSubmit={handleBooking} className="space-y-5">
            {error && <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--t-error-bg)', color: 'var(--t-error-text)', border: '1px solid var(--t-error-border)' }}>{error}</div>}

            {/* Date picker */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t-text-2)' }}>Select Date</label>
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

            {/* Stylist selection (optional) */}
            {barbers.length > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t-text-2)' }}>
                  Select Stylist <span className="font-normal" style={{ color: 'var(--t-text-3)' }}>(optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBarberId("")}
                    className="px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left"
                    style={barberId === "" ? { background: 'var(--t-accent)', color: '#fff', borderColor: 'var(--t-accent)' } : { background: 'var(--t-input-bg)', color: 'var(--t-text-2)', borderColor: 'var(--t-border)' }}
                  >
                    <span className="block text-xs opacity-75 mb-0.5">Any</span>
                    <span>No preference</span>
                  </button>
                  {barbers.map(b => (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => setBarberId(b._id)}
                      className="px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left"
                      style={barberId === b._id ? { background: 'var(--t-accent)', color: '#fff', borderColor: 'var(--t-accent)' } : { background: 'var(--t-input-bg)', color: 'var(--t-text-2)', borderColor: 'var(--t-border)' }}
                    >
                      <span className="block font-semibold">{b.name}</span>
                      {b.experience > 0 && <span className="text-xs" style={{ color: barberId === b._id ? 'rgba(255,255,255,0.7)' : 'var(--t-text-3)' }}>{b.experience} yr exp</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time slots */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t-text-2)' }}>
                {bookingMode === "sequential" ? "Your Time Slot" : "Select Time Slot"}
                {totalDuration > 0 && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--t-text-3)' }}>
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
                <div className="p-4 rounded-xl text-sm text-center" style={{ background: 'var(--t-warn-bg)', color: 'var(--t-warn-text)', border: '1px solid var(--t-warn-border)' }}>
                  🔒 Bookings are not available on this date. Please choose another date.
                </div>
              ) : slots.length === 0 ? (
                <div className="p-4 rounded-xl text-sm text-center" style={{ background: 'var(--t-bg-2)', color: 'var(--t-text-2)' }}>
                  No available slots for this date.
                </div>
              ) : bookingMode === "sequential" ? (
                /* Sequential mode — best available slot card */
                <div className="space-y-2">
                  {(() => {
                    const s = slots[0];
                    const [h, m] = s.split(":").map(Number);
                    const endMin = h * 60 + m + totalDuration;
                    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
                    return (
                      <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.3)' }}>
                        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t-text-3)', marginBottom: 6 }}>✨ Best available slot for you</p>
                        <p className="font-extrabold text-xl" style={{ color: 'var(--t-accent)', marginBottom: 4 }}>{s} – {endTime}</p>
                        <p style={{ fontSize: 11, color: 'var(--t-text-2)', fontWeight: 500 }}>Perfectly fits your selected services</p>
                        <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginTop: 2 }}>No overlap • No waiting</p>
                      </div>
                    );
                  })()}
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#fbbf24', textAlign: 'center' }}>High demand — slots fill quickly today</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-3 text-xs flex-wrap" style={{ color: 'var(--t-text-3)' }}>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: 'var(--t-border)' }} /> Past</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400" /> Booked</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-indigo-600" /> Selected</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ border: '1px solid var(--t-border)', background: 'var(--t-input-bg)' }} /> Available</span>
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
                          className="py-2 px-1 text-xs rounded-lg border transition-all font-medium text-center leading-tight"
                          style={
                            past    ? { background: 'var(--t-bg-2)', color: 'var(--t-text-3)', borderColor: 'var(--t-border)', cursor: 'not-allowed' } :
                            blocked ? { background: 'var(--t-error-bg)', color: 'var(--t-error-text)', borderColor: 'var(--t-error-border)', cursor: 'not-allowed' } :
                            selected? { background: 'var(--t-accent)', color: '#fff', borderColor: 'var(--t-accent)' } :
                                      { background: 'var(--t-input-bg)', color: 'var(--t-text-2)', borderColor: 'var(--t-border)' }
                          }
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
                <div className="t-card rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
                  {slotPopup === "past" ? (
                    <>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mx-auto mb-3" style={{ background: 'var(--t-bg-2)' }}>⏰</div>
                      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--t-text)' }}>Time Has Passed</h3>
                      <p className="text-sm mb-5" style={{ color: 'var(--t-text-2)' }}>This time slot has already passed. Please choose an upcoming slot.</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mx-auto mb-3" style={{ background: 'var(--t-error-bg)' }}>🚫</div>
                      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--t-text)' }}>Slot Already Booked</h3>
                      <p className="text-sm mb-5" style={{ color: 'var(--t-text-2)' }}>This slot is taken. Please choose another available slot.</p>
                    </>
                  )}
                  <button onClick={() => setSlotPopup(null)} className="btn-primary w-full">
                    Choose Another Slot
                  </button>
                </div>
              </div>
            )}

            {/* Trust layer */}
            <div className="flex gap-4 flex-wrap">
              {['Slot confirmed instantly', 'No waiting at salon', 'Pay after service'].map(t => (
                <span key={t} style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>✔ {t}</span>
              ))}
            </div>

            {/* Coupon code — only shown if salon has active coupons */}
            {date && slot && salon?.hasCoupons && (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t-text-2)' }}>Have a coupon?</label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm" style={{ background: 'var(--t-success-bg)', border: '1px solid var(--t-success-border)' }}>
                    <span className="font-medium" style={{ color: 'var(--t-success-text)' }}>✓ {appliedCoupon.code} — ₹{couponDiscount} off</span>
                    <button type="button" onClick={removeCoupon} className="text-xs ml-2 hover:underline" style={{ color: 'var(--t-error-text)' }}>Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      placeholder="Enter coupon code"
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition text-white"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}
                    >
                      {couponLoading ? "…" : "Apply"}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
              </div>
            )}

            {/* Booking summary */}
            {date && slot && (
              <div className="t-card-2 rounded-xl p-4 text-sm fade-in">
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--t-accent)' }}>Booking Summary</p>
                <div className="space-y-2">
                  {services.map(s => (
                    <div key={s._id} className="flex justify-between">
                      <span style={{ color: 'var(--t-text-2)' }}>{s.name}</span>
                      <span className="font-semibold" style={{ color: 'var(--t-text)' }}>₹{s.basePrice || s.price}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--t-text-3)' }}>Duration</span>
                    <span className="font-medium" style={{ color: 'var(--t-text-2)' }}>{totalDuration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--t-text-3)' }}>Date</span>
                    <span className="font-medium" style={{ color: 'var(--t-text-2)' }}>{formatDate(date + "T12:00:00")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--t-text-3)' }}>Time</span>
                    <span className="font-medium" style={{ color: 'var(--t-text-2)' }}>{slot} – {(() => {
                      const [h, m] = slot.split(":").map(Number);
                      const end = h * 60 + m + totalDuration;
                      return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
                    })()}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between" style={{ color: 'var(--t-success-text)' }}>
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span className="font-medium">−₹{couponDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-3 py-2.5 rounded-xl mt-2"
                    style={{ background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)' }}>
                    <span className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>Total · Pay at salon</span>
                    <span className="font-extrabold text-lg" style={{ color: 'var(--t-accent)' }}>₹{finalPrice}</span>
                  </div>
                </div>
              </div>
            )}

            {slot && !loading && (
              <p className="text-center text-xs font-semibold" style={{ color: 'var(--t-text-2)' }}>You're all set! Just one tap to confirm ✨</p>
            )}
            <button
              type="submit"
              disabled={loading || !date || !slot}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed py-3"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full animate-spin border-2 border-white/30 border-t-white" />Securing your slot…</span>
                : "Lock My Slot 🔒"}
            </button>
            <p className="text-center" style={{ fontSize: 10, color: 'var(--t-text-3)' }}>Instant confirmation • No payment now</p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Booking;
