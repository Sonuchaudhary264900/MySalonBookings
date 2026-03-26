import React, { useState, useEffect } from 'react';
import { X, User, Phone, Scissors, Calendar, Clock, ChevronDown, Loader2, IndianRupee } from 'lucide-react';
import * as salonService from '../../services/salonService';
import toast from 'react-hot-toast';

// 9:00 AM – 9:00 PM in 30-min increments
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 9; h <= 21; h++) {
    for (const m of ['00', '30']) {
      if (h === 21 && m === '30') break;
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm   = h >= 12 ? 'PM' : 'AM';
      slots.push({ value: `${String(h).padStart(2, '0')}:${m}`, display: `${hour12}:${m} ${ampm}` });
    }
  }
  return slots;
})();

const INP = `w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
  bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400
  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all`;

const LABEL = `block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1`;

const BookingModal = ({ isOpen, onClose, booking, services, salon, onSave, defaultDate }) => {
  const isEdit = !!booking?._id;

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const [form, setForm] = useState({
    customerName:  '',
    customerPhone: '',
    serviceId:     '',
    date:          defaultDate || todayStr,
    time:          '09:00',
    duration:      30,
    status:        'pending',
  });

  const [bookedSlots,  setBookedSlots]  = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving,       setSaving]       = useState(false);

  // Populate form on open
  useEffect(() => {
    if (!isOpen) return;
    if (booking?._id) {
      const apptDate = booking.appointmentDate
        ? (() => {
            const d = new Date(booking.appointmentDate);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })()
        : todayStr;
      setForm({
        customerName:  booking.customerName  || '',
        customerPhone: booking.customerPhone || '',
        serviceId:     booking.serviceId || booking.service?._id || '',
        date:          apptDate,
        time:          booking.appointmentTime || '09:00',
        duration:      booking.duration || 30,
        status:        booking.status   || 'pending',
      });
    } else {
      const firstSvc = services.find(s => s.isActive !== false);
      setForm({
        customerName:  '',
        customerPhone: '',
        serviceId:     firstSvc?._id || firstSvc?.id || '',
        date:          defaultDate || todayStr,
        time:          '09:00',
        duration:      firstSvc?.duration || 30,
        status:        'pending',
      });
    }
  }, [isOpen, booking, services, defaultDate]);

  // Fetch booked slots when date / duration changes
  useEffect(() => {
    if (!isOpen || !salon?._id || !form.date || !form.duration) return;
    let active = true;
    const run = async () => {
      setSlotsLoading(true);
      try {
        const data = await salonService.getBookedSlots(salon._id, form.date, form.duration);
        if (active) setBookedSlots(data?.bookedSlots || []);
      } catch {
        if (active) setBookedSlots([]);
      } finally {
        if (active) setSlotsLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, [isOpen, salon?._id, form.date, form.duration]);

  const handleServiceChange = (id) => {
    const svc = services.find(s => (s._id || s.id) === id);
    setForm(p => ({ ...p, serviceId: id, duration: svc?.duration || p.duration }));
  };

  const isSlotBooked = (val) => {
    // Allow current booking's own time slot
    if (isEdit && booking.appointmentTime === val) return false;
    return bookedSlots.includes(val);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.customerName.trim()) { toast.error('Customer name is required'); return; }
    if (!form.serviceId)           { toast.error('Please select a service');   return; }
    setSaving(true);
    try {
      const svc = services.find(s => (s._id || s.id) === form.serviceId);
      await onSave({ ...form, serviceName: svc?.name, salonId: salon?._id });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedSvc = services.find(s => (s._id || s.id) === form.serviceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Booking' : 'New Booking'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {isEdit ? 'Update booking details' : 'Schedule a walk-in appointment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable form body ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Customer Name */}
          <div>
            <label className={LABEL}>Customer Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.customerName}
                onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                placeholder="Enter customer name"
                className={INP}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className={LABEL}>Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={form.customerPhone}
                onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))}
                placeholder="10-digit phone number"
                className={INP}
              />
            </div>
          </div>

          {/* Service */}
          <div>
            <label className={LABEL}>Service *</label>
            <div className="relative">
              <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={form.serviceId}
                onChange={e => handleServiceChange(e.target.value)}
                className={`${INP} appearance-none`}
              >
                <option value="">Select a service</option>
                {services.filter(s => s.isActive !== false).map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name} — ₹{s.basePrice || s.price}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {selectedSvc && (
              <div className="flex items-center gap-3 mt-1.5 px-1">
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <IndianRupee className="w-3 h-3" />{selectedSvc.basePrice || selectedSvc.price}
                </span>
                {selectedSvc.duration && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />{selectedSvc.duration} min
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Date + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className={INP}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Duration (min)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={form.duration}
                  onChange={e => setForm(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))}
                  className={INP}
                />
              </div>
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={LABEL} style={{ marginBottom: 0 }}>Time *</label>
              {slotsLoading && (
                <span className="flex items-center gap-1 text-xs text-indigo-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking slots…
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-1.5 max-h-44 overflow-y-auto pr-0.5">
              {TIME_SLOTS.map(slot => {
                const booked   = isSlotBooked(slot.value);
                const selected = form.time === slot.value;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    disabled={booked}
                    onClick={() => !booked && setForm(p => ({ ...p, time: slot.value }))}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all duration-100 ${
                      booked
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 line-through cursor-not-allowed'
                        : selected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-[1.04]'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    {slot.display}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status (add only or when editing) */}
          <div>
            <label className={LABEL}>Status</label>
            <div className="flex gap-2">
              {(isEdit
                ? ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
                : ['pending', 'confirmed']
              ).map(s => {
                const clr = {
                  pending:     'amber',
                  confirmed:   'indigo',
                  in_progress: 'violet',
                  completed:   'emerald',
                  cancelled:   'gray',
                }[s];
                const active = form.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, status: s }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                      active
                        ? `bg-${clr}-500 ${clr === 'gray' ? 'bg-gray-400' : ''} text-white shadow-sm`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                    style={active ? {
                      backgroundColor: {
                        amber: '#f59e0b', indigo: '#6366f1', violet: '#8b5cf6',
                        emerald: '#10b981', gray: '#9ca3af',
                      }[clr]
                    } : {}}
                  >
                    {s.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
              text-sm font-medium text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white
              text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all
              shadow-md shadow-indigo-500/20 disabled:opacity-60
              flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
