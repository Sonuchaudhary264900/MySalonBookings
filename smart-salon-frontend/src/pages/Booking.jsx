import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import API from "../services/api";

function Booking() {
  const { salonId, serviceId } = useParams();
  const navigate = useNavigate();

  const [salon, setSalon] = useState(null);
  const [service, setService] = useState(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const advanceDays = salon?.advanceBookingDays ?? 1;
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + advanceDays);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  useEffect(() => {
    loadData();
  }, [salonId, serviceId]);

  useEffect(() => {
    if (date && service) loadSlots();
    else { setSlots([]); setBlockedSlots([]); setClosedDay(false); }
  }, [date, service]);

  const loadData = async () => {
    try {
      const [salonRes, servicesRes] = await Promise.all([
        API.get(`/public/salons/${salonId}`),
        API.get(`/public/salons/${salonId}/services`),
      ]);
      setSalon(salonRes.data.data);
      const svc = (servicesRes.data.data?.services || []).find(
        (s) => s._id === serviceId
      );
      setService(svc);
    } catch {/* silent */}
  };

  const loadSlots = async () => {
    setSlotsLoading(true);
    setSlot("");
    try {
      const res = await API.get(
        `/public/salons/${salonId}/booked-slots?date=${date}&duration=${service?.duration || 30}`
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

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!date) { setError("Please select a date."); return; }
    if (!slot) { setError("Please select a time slot."); return; }
    setError("");
    setLoading(true);
    try {
      await API.post("/customer/bookings", {
        salonId,
        serviceId,
        appointmentDate: date,
        appointmentTime: slot,
        paymentMethod: "cash",
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
          <p className="text-slate-500 text-sm mb-1">
            <strong>{service?.name}</strong> at <strong>{salon?.name}</strong>
          </p>
          <p className="text-slate-500 text-sm mb-6">
            {date} at {slot}
          </p>
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
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Book Appointment</h1>
        <p className="text-muted mb-6">Fill in the details to confirm your booking.</p>

        {/* Summary card */}
        {(salon || service) && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5 flex items-center gap-4">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-xl shrink-0">
              ✂
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{salon?.name || "Salon"}</p>
              {service && (
                <p className="text-sm text-slate-500">
                  {service.name} · {service.duration} min · <span className="text-indigo-600 font-medium">₹{service.basePrice}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Booking form */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <form onSubmit={handleBooking} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            {/* Date picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                min={today}
                max={maxDateStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Time slot grid */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Time Slot
              </label>
              {!date ? (
                <p className="text-sm text-slate-400 italic">Please select a date first.</p>
              ) : slotsLoading ? (
                <p className="text-sm text-slate-400 italic">Loading available slots...</p>
              ) : closedDay ? (
                <p className="text-sm text-red-500">Salon is closed on this day.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No available slots for this date.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => {
                    const isBlocked = blockedSlots.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={isBlocked}
                        onClick={() => setSlot(s)}
                        className={`py-2 text-sm rounded-lg border transition-all font-medium ${
                          isBlocked
                            ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed"
                            : slot === s
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            {date && slot && (
              <div className="bg-indigo-50 rounded-xl p-4 text-sm fade-in">
                <p className="font-semibold text-indigo-800 mb-1">Booking Summary</p>
                <div className="space-y-1 text-indigo-700">
                  <div className="flex justify-between">
                    <span>Service</span>
                    <span className="font-medium">{service?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-medium">{new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time</span>
                    <span className="font-medium">{slot}</span>
                  </div>
                  {service?.basePrice && (
                    <div className="flex justify-between border-t border-indigo-200 pt-2 mt-2">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-indigo-900">₹{service.basePrice}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !date || !slot}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed py-3"
            >
              {loading ? "Confirming..." : "Confirm Booking"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Booking;
