// utils/autoAssign.js
// Smart staff auto-assignment algorithm.
// Called when a customer picks "Any Available" so barberId is null.
//
// Algorithm (in order):
//   1. Get all active non-owner staff for the salon (owners can be assigned too)
//   2. Filter: staff must work on the requested day of week
//   3. Filter: shift must cover the entire appointment window
//   4. Filter: if serviceId provided, staff must offer that service
//   5. Filter: staff must have NO overlapping active booking at that time
//   6. Among eligible staff → pick the one with fewest bookings today (load balance)
//   7. Return null if no eligible staff → booking stays UNASSIGNED

const Barber  = require('../models/Barber');
const Booking = require('../models/Booking');

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const parseMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * @param {Object} params
 * @param {string} params.salonId
 * @param {string} params.appointmentDate   — "YYYY-MM-DD"
 * @param {string} params.appointmentTime   — "HH:MM"
 * @param {number} params.totalDuration     — minutes
 * @param {string[]} params.serviceIds      — array of service ObjectId strings
 * @returns {Object|null} Barber document or null
 */
async function autoAssignStaff({ salonId, appointmentDate, appointmentTime, totalDuration, serviceIds = [] }) {
  try {
    // Step 1 — all active staff
    const staff = await Barber.find({ salonId, isActive: true })
      .select('_id name isOwner staffRole workingDays shiftStart shiftEnd servicesOffered')
      .lean();

    if (!staff.length) return null;

    // Step 2 — filter by working day
    const dayName = DAY_NAMES[new Date(appointmentDate + 'T12:00:00').getDay()];
    const worksToday = staff.filter(s => (s.workingDays || []).includes(dayName));
    if (!worksToday.length) return null;

    // Step 3 — shift covers the full appointment window
    const apptStart = parseMin(appointmentTime);
    const apptEnd   = apptStart + totalDuration;
    const shiftCovered = worksToday.filter(s => {
      const shiftStart = parseMin(s.shiftStart || '09:00');
      const shiftEnd   = parseMin(s.shiftEnd   || '18:00');
      return shiftStart <= apptStart && apptEnd <= shiftEnd;
    });
    if (!shiftCovered.length) return null;

    // Step 4 — staff must offer at least one of the requested services
    // (only applies if the staff record has servicesOffered populated; skip if empty = offers all)
    let serviceFiltered = shiftCovered;
    if (serviceIds.length > 0) {
      serviceFiltered = shiftCovered.filter(s => {
        if (!s.servicesOffered || s.servicesOffered.length === 0) return true; // no restriction = offers all
        return serviceIds.some(sid =>
          s.servicesOffered.some(so => so.toString() === sid.toString())
        );
      });
      if (!serviceFiltered.length) serviceFiltered = shiftCovered; // graceful fallback: ignore service filter
    }

    // Step 5 — no overlapping active booking at that time slot
    const dayStart = new Date(appointmentDate + 'T00:00:00.000Z');
    const dayEnd   = new Date(appointmentDate + 'T23:59:59.999Z');

    const existingBookings = await Booking.find({
      salonId,
      barberId: { $in: serviceFiltered.map(s => s._id) },
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
    }).select('barberId appointmentTime estimatedDuration').lean();

    // Map: staffId → list of [startMin, endMin] windows
    const busyWindows = {};
    for (const b of existingBookings) {
      const key = b.barberId.toString();
      if (!busyWindows[key]) busyWindows[key] = [];
      const s = parseMin(b.appointmentTime);
      busyWindows[key].push([s, s + (b.estimatedDuration || 30)]);
    }

    const available = serviceFiltered.filter(s => {
      const windows = busyWindows[s._id.toString()] || [];
      return !windows.some(([ws, we]) => apptStart < we && apptEnd > ws);
    });

    if (!available.length) return null;

    // Step 6 — pick the staff member with fewest bookings today (load balancing)
    const bookingCounts = {};
    for (const b of existingBookings) {
      const key = b.barberId.toString();
      bookingCounts[key] = (bookingCounts[key] || 0) + 1;
    }

    available.sort((a, b) => {
      const ca = bookingCounts[a._id.toString()] || 0;
      const cb = bookingCounts[b._id.toString()] || 0;
      return ca - cb; // ascending: least busy first
    });

    // Return the full Barber document for the winner
    return await Barber.findById(available[0]._id).lean();

  } catch (err) {
    // Auto-assign failure must never crash booking creation — fallback to unassigned
    console.error('[autoAssign] Error:', err.message);
    return null;
  }
}

module.exports = { autoAssignStaff };
