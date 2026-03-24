import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Phone, User, IndianRupee, Scissors, X, Plus, ShieldOff, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSalon } from '../../hooks/useSalon';
import Loader from '../../components/common/Loader';
import * as salonService from '../../services/salonService';
import { formatDate, formatTime } from '../../utils/exportHelpers';
import api from '../../services/api';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

const STATUS_STYLES = {
  confirmed:   'bg-green-600 text-white',
  pending:     'bg-yellow-500 text-white',
  completed:   'bg-blue-600 text-white',
  cancelled:   'bg-red-600 text-white',
  in_progress: 'bg-purple-600 text-white',
};

const localDate = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const today   = localDate(0);
const maxDate = localDate(30);

// ── Walk-in Modal ────────────────────────────────────────────────
const WalkInModal = ({ salon, services, onClose, onSuccess }) => {
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate]           = useState(today);
  const [slot, setSlot]           = useState('');
  const [slots, setSlots]         = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const selectedService = services.find((s) => s._id === serviceId);

  const timeToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  const isPastSlot = (s) => {
    if (date !== today) return false;
    const now = new Date();
    return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
  };

  // Load slots whenever service or date changes
  useEffect(() => {
    if (!selectedService || !date || !salon?._id) return;
    setSlot('');
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);
    setSlotsLoading(true);
    salonService.getBookedSlots(String(salon._id), date, selectedService.duration)
      .then((data) => {
        setSlots(data.slots || []);
        setBlockedSlots(data.blockedSlots || []);
        setClosedDay(data.closedDay || false);
      })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [serviceId, date, salon?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())  { setError('Customer name is required'); return; }
    if (!phone.trim()) { setError('Customer phone is required'); return; }
    if (!serviceId)    { setError('Please select a service'); return; }
    if (!slot)         { setError('Please select a time slot'); return; }

    setError('');
    setSubmitting(true);
    try {
      await onSuccess({ customerName: name.trim(), customerPhone: phone.trim(), serviceId, appointmentDate: date, appointmentTime: slot });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Walk-in Customer</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

          {/* Customer name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Customer phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              required
            >
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} — {s.duration} min — ₹{s.basePrice}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              min={today}
              max={maxDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Time slots */}
          {serviceId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Time Slot
                {selectedService && (
                  <span className="ml-2 text-xs font-normal text-gray-400">({selectedService.duration} min)</span>
                )}
              </label>

              {slotsLoading ? (
                <div className="flex items-center gap-2 py-3 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Loading slots…
                </div>
              ) : closedDay ? (
                <p className="text-sm text-amber-600 py-2">Salon is closed on this day.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No slots available for this date.</p>
              ) : (
                <>
                  {/* Legend */}
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

                      const [h, m] = s.split(':').map(Number);
                      const endMin = h * 60 + m + (selectedService?.duration || 30);
                      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { if (!past && !blocked) setSlot(s); }}
                          className={`py-2 px-1 text-xs rounded-lg border transition-all font-medium text-center leading-tight ${
                            past
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : blocked
                              ? 'bg-red-100 text-red-500 border-red-300 cursor-not-allowed'
                              : selected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
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
          )}

          {/* Summary */}
          {slot && selectedService && (
            <div className="bg-indigo-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-indigo-800 mb-1">Booking Summary</p>
              <div className="space-y-1 text-indigo-700">
                <div className="flex justify-between"><span>Customer</span><span className="font-medium">{name || '—'}</span></div>
                <div className="flex justify-between"><span>Service</span><span className="font-medium">{selectedService.name}</span></div>
                <div className="flex justify-between"><span>Slot</span><span className="font-medium">{slot}</span></div>
                <div className="flex justify-between border-t border-indigo-200 pt-1 mt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-indigo-900">₹{selectedService.basePrice}</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !slot}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating Booking…' : 'Confirm Walk-in Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Main Bookings Page ───────────────────────────────────────────
const Bookings = () => {
  const { salon, services, bookings, fetchBookings, fetchServices, updateBookingStatus, createWalkInBooking, loading } = useSalon();
  const [filter, setFilter]           = useState('all');
  const [updating, setUpdating]       = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [blockedIds, setBlockedIds]   = useState(new Set());
  const [blocking, setBlocking]       = useState(null);

  useEffect(() => {
    fetchBookings({ date: selectedDate });
    fetchServices();
  }, [selectedDate]);

  // Load blocked customer IDs once
  useEffect(() => {
    api.get('/owner/blocked-customers')
      .then(res => {
        const ids = new Set((res.data.data?.blockedCustomers || []).map(bc =>
          bc.customerId?._id || bc.customerId
        ).filter(Boolean).map(String));
        setBlockedIds(ids);
      })
      .catch(() => {});
  }, []);

  const filteredBookings = bookings.filter((b) =>
    filter === 'all' ? true : b.status === filter
  );

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus);
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleBlock = async (customerId, currentlyBlocked) => {
    setBlocking(customerId);
    try {
      if (currentlyBlocked) {
        await api.delete(`/owner/customers/${customerId}/block`);
        setBlockedIds(prev => { const n = new Set(prev); n.delete(String(customerId)); return n; });
      } else {
        await api.post(`/owner/customers/${customerId}/block`, { reason: 'Fake booking' });
        setBlockedIds(prev => new Set([...prev, String(customerId)]));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update block status');
    } finally {
      setBlocking(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-500 text-sm mt-1">
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} on{' '}
              {selectedDate === today ? 'today' : formatDate(selectedDate + 'T12:00:00')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Add Walk-in
            </button>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition border ${
                    filter === s
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16">
            <Loader size="lg" />
            <p className="text-gray-500 mt-4">Loading bookings…</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                updating={updating === booking._id}
                onStatusChange={handleStatusChange}
                isBlocked={booking.customerId ? blockedIds.has(String(booking.customerId)) : false}
                blockLoading={blocking === String(booking.customerId)}
                onToggleBlock={handleToggleBlock}
              />
            ))}
          </div>
        )}
      </div>

      {/* Walk-in modal */}
      {showModal && (
        <WalkInModal
          salon={salon}
          services={services}
          onClose={() => setShowModal(false)}
          onSuccess={createWalkInBooking}
        />
      )}
    </DashboardLayout>
  );
};

// ── Booking Card ─────────────────────────────────────────────────
const BookingCard = ({ booking, updating, onStatusChange, isBlocked, blockLoading, onToggleBlock }) => {
  const date = booking.appointmentDate ? formatDate(booking.appointmentDate) : '—';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 leading-tight">
                {booking.customerName || 'Unknown Customer'}
              </p>
              {booking.customerGender && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  booking.customerGender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                }`}>
                  {booking.customerGender === 'male' ? '👨 Male' : '👩 Female'}
                </span>
              )}
              {booking.isWalkIn && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Walk-in</span>
              )}
            </div>
            {booking.customerPhone && (
              <a
                href={`tel:${booking.customerPhone}`}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                {booking.customerPhone}
              </a>
            )}
          </div>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize shrink-0 ${STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-600'}`}>
          {booking.status?.replace('_', ' ')}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Scissors className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate">{booking.serviceName || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{formatTime(booking.appointmentTime)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <IndianRupee className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{booking.totalAmount ?? '—'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
        {booking.status === 'pending' && (
          <>
            <ActionButton label="Confirm" color="green" loading={updating} onClick={() => onStatusChange(booking._id, 'confirmed')} />
            <ActionButton label="Cancel"  color="red"   loading={updating} onClick={() => onStatusChange(booking._id, 'cancelled')} />
          </>
        )}
        {booking.status === 'confirmed' && (
          <>
            <ActionButton label="Start"  color="purple" loading={updating} onClick={() => onStatusChange(booking._id, 'in_progress')} />
            <ActionButton label="Cancel" color="red"    loading={updating} onClick={() => onStatusChange(booking._id, 'cancelled')} />
          </>
        )}
        {booking.status === 'in_progress' && (
          <ActionButton label="Mark Complete" color="blue" loading={updating} onClick={() => onStatusChange(booking._id, 'completed')} />
        )}
        {/* Block/Unblock — only for real (non walk-in) bookings with a customerId */}
        {!booking.isWalkIn && booking.customerId && (
          <button
            onClick={() => onToggleBlock(booking.customerId, isBlocked)}
            disabled={blockLoading}
            title={isBlocked ? 'Unblock this customer' : 'Block this customer from booking'}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border disabled:opacity-50 ${
              isBlocked
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            {blockLoading ? '…' : isBlocked
              ? <><ShieldCheck className="w-3.5 h-3.5" /> Unblock</>
              : <><ShieldOff className="w-3.5 h-3.5" /> Block</>
            }
          </button>
        )}
      </div>
    </div>
  );
};

const COLOR_MAP = {
  green:  'bg-green-600 hover:bg-green-700 text-white',
  red:    'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
  purple: 'bg-purple-600 hover:bg-purple-700 text-white',
  blue:   'bg-blue-600 hover:bg-blue-700 text-white',
};

const ActionButton = ({ label, color, loading, onClick }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${COLOR_MAP[color]}`}
  >
    {loading ? '…' : label}
  </button>
);

const EmptyState = ({ filter }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-14 text-center">
    <Calendar className="w-14 h-14 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-1">No bookings found</h3>
    <p className="text-gray-500 text-sm">
      {filter === 'all'
        ? 'No bookings yet. Customers will appear here once they book.'
        : `No "${filter.replace('_', ' ')}" bookings at the moment.`}
    </p>
  </div>
);

export default Bookings;
