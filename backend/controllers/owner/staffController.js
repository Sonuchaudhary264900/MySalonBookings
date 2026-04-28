// controllers/owner/staffController.js

const Barber   = require('../../models/Barber');
const Booking  = require('../../models/Booking');
const Business = require('../../models/Business');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');

// ── helpers ──────────────────────────────────────────────────────────────────

const VALID_ROLES = ['owner', 'manager', 'receptionist', 'stylist'];
const VALID_DAYS  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const TIME_RE     = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24-hour

function parseMin(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

function audit(action, ownerId, details) {
  console.log(JSON.stringify({
    type: 'AUDIT',
    action,
    ownerId: String(ownerId),
    ts: new Date().toISOString(),
    ...details,
  }));
}

// ── GET /owner/team ───────────────────────────────────────────────────────────
// Returns all staff for the owner's business, plus per-staff booking stats.
// SECURITY: sensitive auth fields (refreshTokens, firebaseUid, inviteToken) are excluded.
exports.getTeam = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const staff = await Barber.find({ salonId: business._id })
      .select('-refreshTokens -firebaseUid') // never expose auth internals
      .populate('servicesOffered', 'name category')
      .sort({ isOwner: -1, createdAt: 1 })
      .lean();

    // Month-start in UTC (safe approximation; full timezone support is Phase 2)
    const now        = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const stats = await Booking.aggregate([
      { $match: {
        salonId:         business._id,
        barberId:        { $in: staff.map(s => s._id) },
        appointmentDate: { $gte: monthStart },
        status:          { $ne: 'cancelled' },
      }},
      { $group: {
        _id:      '$barberId',
        bookings: { $sum: 1 },
        revenue:  { $sum: '$totalAmount' },
      }},
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[String(s._id)] = { bookings: s.bookings, revenue: s.revenue }; });

    const enriched = staff.map(s => ({
      ...s,
      hasJoined:     s.status === 'active' || s.status === 'blocked',
      monthBookings: statsMap[String(s._id)]?.bookings || 0,
      monthRevenue:  statsMap[String(s._id)]?.revenue  || 0,
    }));

    res.json(formatSuccessResponse({ staff: enriched, total: enriched.length }, 'Team fetched'));
  } catch (err) {
    console.error('[getTeam]', err);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// ── POST /owner/team ──────────────────────────────────────────────────────────
exports.addStaff = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const {
      name, phone, email, gender, profilePhoto, bio,
      staffRole = 'stylist',
      experience = 0,
      specializations = [],
      servicesOffered = [],
      workingDays = ['monday','tuesday','wednesday','thursday','friday','saturday'],
      shiftStart = '09:00',
      shiftEnd   = '18:00',
      showEarningsToStaff = false,
    } = req.body;

    // Input validation
    if (!name?.trim()) return res.status(400).json(formatErrorResponse('Name is required', 400));
    if (!VALID_ROLES.includes(staffRole)) return res.status(400).json(formatErrorResponse(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, 400));
    if (staffRole === 'owner') return res.status(400).json(formatErrorResponse('Cannot add another owner via this endpoint', 400));
    if (phone?.trim() && !/^\+?[\d\s\-()]{7,15}$/.test(phone.trim())) return res.status(400).json(formatErrorResponse('Invalid phone number format', 400));
    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json(formatErrorResponse('Invalid email format', 400));
    if (!TIME_RE.test(shiftStart) || !TIME_RE.test(shiftEnd)) return res.status(400).json(formatErrorResponse('Shift times must be in HH:MM format', 400));
    if (parseMin(shiftStart) >= parseMin(shiftEnd)) return res.status(400).json(formatErrorResponse('Shift start must be before shift end', 400));
    const invalidDays = (workingDays || []).filter(d => !VALID_DAYS.includes(d));
    if (invalidDays.length) return res.status(400).json(formatErrorResponse(`Invalid working days: ${invalidDays.join(', ')}`, 400));

    // Duplicate phone/email check within the same salon
    if (phone?.trim()) {
      const phoneExists = await Barber.exists({ salonId: business._id, phone: phone.trim() });
      if (phoneExists) return res.status(409).json(formatErrorResponse('A staff member with this phone number already exists', 409));
    }
    if (email?.trim()) {
      const emailExists = await Barber.exists({ salonId: business._id, email: email.trim().toLowerCase() });
      if (emailExists) return res.status(409).json(formatErrorResponse('A staff member with this email already exists', 409));
    }

    const member = await Barber.create({
      name:       name.trim(),
      phone:      phone?.trim() || undefined,
      email:      email?.trim().toLowerCase() || undefined,
      gender:     gender && ['male', 'female'].includes(gender) ? gender : undefined,
      profilePhoto: profilePhoto || undefined,
      bio:        bio?.trim() || undefined,
      salonId:    business._id,
      ownerId:    req.owner._id,
      staffRole,
      experience: Math.max(0, parseInt(experience) || 0),
      specializations: specializations || [],
      servicesOffered: servicesOffered || [],
      workingDays: workingDays && workingDays.length > 0 ? workingDays : ['monday','tuesday','wednesday','thursday','friday','saturday'],
      shiftStart,
      shiftEnd,
      showEarningsToStaff,
      isOwner:  false,
      status:   'invited',
      isActive: true,
    });

    audit('STAFF_ADDED', req.owner._id, { staffId: member._id, staffName: member.name, role: staffRole });
    res.status(201).json(formatSuccessResponse({ staff: member }, 'Staff added', 201));
  } catch (err) {
    console.error('[addStaff]', err);
    const msg = err.message || 'Failed to add staff member';
    res.status(500).json(formatErrorResponse(msg, 500));
  }
};

// ── PUT /owner/team/:staffId ──────────────────────────────────────────────────
exports.updateStaff = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const member = await Barber.findOne({ _id: req.params.staffId, salonId: business._id });
    if (!member) return res.status(404).json(formatErrorResponse('Staff member not found', 404));

    const { staffRole, phone, email, shiftStart, shiftEnd, workingDays } = req.body;

    // Prevent promoting to 'owner' role via update
    if (staffRole !== undefined) {
      if (!VALID_ROLES.includes(staffRole)) return res.status(400).json(formatErrorResponse(`Invalid role`, 400));
      if (staffRole === 'owner' && !member.isOwner) return res.status(400).json(formatErrorResponse('Cannot set role to owner', 400));
    }
    if (phone?.trim() && !/^\+?[\d\s\-()]{7,15}$/.test(phone.trim())) return res.status(400).json(formatErrorResponse('Invalid phone number format', 400));
    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json(formatErrorResponse('Invalid email format', 400));

    const resolvedStart = shiftStart || member.shiftStart;
    const resolvedEnd   = shiftEnd   || member.shiftEnd;
    if ((shiftStart || shiftEnd) && (!TIME_RE.test(resolvedStart) || !TIME_RE.test(resolvedEnd))) {
      return res.status(400).json(formatErrorResponse('Shift times must be in HH:MM format', 400));
    }
    if ((shiftStart || shiftEnd) && parseMin(resolvedStart) >= parseMin(resolvedEnd)) {
      return res.status(400).json(formatErrorResponse('Shift start must be before shift end', 400));
    }
    if (workingDays) {
      const invalidDays = workingDays.filter(d => !VALID_DAYS.includes(d));
      if (invalidDays.length) return res.status(400).json(formatErrorResponse(`Invalid working days: ${invalidDays.join(', ')}`, 400));
    }

    // Duplicate check on phone/email if they're being changed
    if (phone?.trim() && phone.trim() !== member.phone) {
      const phoneExists = await Barber.exists({ salonId: business._id, phone: phone.trim(), _id: { $ne: member._id } });
      if (phoneExists) return res.status(409).json(formatErrorResponse('Another staff member already has this phone number', 409));
    }
    if (email?.trim() && email.trim().toLowerCase() !== member.email) {
      const emailExists = await Barber.exists({ salonId: business._id, email: email.trim().toLowerCase(), _id: { $ne: member._id } });
      if (emailExists) return res.status(409).json(formatErrorResponse('Another staff member already has this email', 409));
    }

    const allowed = ['name','phone','email','gender','profilePhoto','bio','staffRole',
                     'experience','specializations','servicesOffered','workingDays',
                     'shiftStart','shiftEnd','showEarningsToStaff','isActive','status'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        if (k === 'gender' && req.body[k]) {
          member[k] = ['male', 'female'].includes(req.body[k]) ? req.body[k] : undefined;
        } else if (k === 'bio' || k === 'profilePhoto') {
          member[k] = req.body[k]?.trim() || undefined;
        } else {
          member[k] = req.body[k];
        }
      }
    });
    if (email?.trim()) member.email = email.trim().toLowerCase();
    await member.save();

    audit('STAFF_UPDATED', req.owner._id, { staffId: member._id, staffName: member.name, fields: allowed.filter(k => req.body[k] !== undefined) });
    res.json(formatSuccessResponse({ staff: member }, 'Staff updated'));
  } catch (err) {
    console.error('[updateStaff]', err);
    const msg = err.message || 'Failed to update staff member';
    res.status(500).json(formatErrorResponse(msg, 500));
  }
};

// ── DELETE /owner/team/:staffId ───────────────────────────────────────────────
// Soft-delete: marks inactive, never deletes records (preserves booking history)
exports.removeStaff = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const member = await Barber.findOne({ _id: req.params.staffId, salonId: business._id });
    if (!member) return res.status(404).json(formatErrorResponse('Staff member not found', 404));
    if (member.isOwner) return res.status(400).json(formatErrorResponse('Cannot remove owner record', 400));

    // Block deactivation if staff has active or upcoming bookings.
    // Use start of today in salon timezone so evening bookings aren't incorrectly treated as past.
    const salonForTz = await Business.findById(business._id).select('timezoneOffsetMinutes').lean();
    const tzOffsetMs = ((salonForTz?.timezoneOffsetMinutes) ?? 330) * 60 * 1000;
    const nowLocal   = new Date(Date.now() + tzOffsetMs);
    const todayStart = new Date(nowLocal.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const activeBookings = await Booking.countDocuments({
      barberId:        member._id,
      status:          { $in: ['pending', 'confirmed', 'in_progress'] },
      appointmentDate: { $gte: todayStart },
    });
    if (activeBookings > 0) {
      return res.status(409).json(formatErrorResponse(
        `${member.name} has ${activeBookings} upcoming booking(s). Reassign or cancel them before deactivating.`, 409
      ));
    }

    member.isActive = false;
    member.status   = 'blocked';
    await member.save();

    audit('STAFF_DEACTIVATED', req.owner._id, { staffId: member._id, staffName: member.name });
    res.json(formatSuccessResponse({}, 'Staff member deactivated'));
  } catch (err) {
    console.error('[removeStaff]', err);
    const msg = err.message || 'Failed to deactivate staff member';
    res.status(500).json(formatErrorResponse(msg, 500));
  }
};

// ── GET /owner/team/stats ─────────────────────────────────────────────────────
// Per-staff performance for Analytics page
exports.getTeamStats = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const { from, to } = req.query;

    // Validate and parse date range
    const now        = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const start = from && !isNaN(Date.parse(from)) ? new Date(from) : monthStart;
    const end   = to   && !isNaN(Date.parse(to))   ? new Date(to)   : now;
    if (start > end) return res.status(400).json(formatErrorResponse('"from" date must be before "to" date', 400));

    const staff = await Barber.find({ salonId: business._id, isActive: true })
      .select('name profilePhoto staffRole isOwner averageRating totalReviews showEarningsToStaff')
      .lean();

    const stats = await Booking.aggregate([
      { $match: {
        salonId:         business._id,
        barberId:        { $in: staff.map(s => s._id) },
        appointmentDate: { $gte: start, $lte: end },
        status:          { $ne: 'cancelled' },
      }},
      { $group: {
        _id:       '$barberId',
        bookings:  { $sum: 1 },
        revenue:   { $sum: '$totalAmount' },
        completed: { $sum: { $cond: [{ $eq: ['$status','completed'] }, 1, 0] } },
      }},
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[String(s._id)] = s; });

    const result = staff.map(s => {
      const st = statsMap[String(s._id)] || { bookings: 0, revenue: 0, completed: 0 };
      return {
        _id:               s._id,
        name:              s.name,
        profilePhoto:      s.profilePhoto,
        staffRole:         s.staffRole,
        isOwner:           s.isOwner,
        rating:            s.averageRating,
        totalReviews:      s.totalReviews,
        showEarnings:      s.showEarningsToStaff, // Phase 2: staff-facing endpoint must filter revenue when false
        bookings:          st.bookings,
        revenue:           st.revenue,
        completed:         st.completed,
      };
    });

    // Append unassigned row so analytics total always matches salon total
    const unassigned = await Booking.aggregate([
      { $match: {
        salonId:         business._id,
        barberId:        null,
        appointmentDate: { $gte: start, $lte: end },
        status:          { $ne: 'cancelled' },
      }},
      { $group: {
        _id:       null,
        bookings:  { $sum: 1 },
        revenue:   { $sum: '$totalAmount' },
        completed: { $sum: { $cond: [{ $eq: ['$status','completed'] }, 1, 0] } },
      }},
    ]);

    if (unassigned.length && unassigned[0].bookings > 0) {
      result.push({
        _id:          null,
        name:         'Unassigned',
        profilePhoto: null,
        staffRole:    null,
        isOwner:      false,
        rating:       null,
        totalReviews: 0,
        showEarnings: true,
        bookings:     unassigned[0].bookings,
        revenue:      unassigned[0].revenue,
        completed:    unassigned[0].completed,
        isUnassigned: true, // flag for frontend to render differently
      });
    }

    res.json(formatSuccessResponse({ team: result }, 'Team stats fetched'));
  } catch (err) {
    console.error('[getTeamStats]', err);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// ── PUT /owner/team/:staffId/assign-booking ───────────────────────────────────
// Owner manually assigns an unassigned booking to a staff member.
// Guards: overlap check + race condition prevention via atomic findOneAndUpdate.
exports.assignBooking = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json(formatErrorResponse('bookingId required', 400));

    const member = await Barber.findOne({ _id: req.params.staffId, salonId: business._id, isActive: true });
    if (!member) return res.status(404).json(formatErrorResponse('Staff member not found', 404));

    const booking = await Booking.findOne({ _id: bookingId, salonId: business._id });
    if (!booking) return res.status(404).json(formatErrorResponse('Booking not found', 404));

    if (['cancelled', 'completed'].includes(booking.status)) {
      return res.status(400).json(formatErrorResponse('Cannot assign staff to a cancelled or completed booking', 400));
    }

    // Overlap check: does this staff member already have a booking that overlaps with this slot?
    const dayStart = new Date(booking.appointmentDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const parseMin = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + (m || 0); };
    const newStart = parseMin(booking.appointmentTime);
    const newEnd   = newStart + (booking.estimatedDuration || 30);

    const existingBookings = await Booking.find({
      barberId:        member._id,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status:          { $in: ['pending', 'confirmed', 'in_progress'] },
      _id:             { $ne: booking._id },
    }).select('appointmentTime estimatedDuration').lean();

    const hasConflict = existingBookings.some(b => {
      const s = parseMin(b.appointmentTime);
      const e = s + (b.estimatedDuration || 30);
      return newStart < e && newEnd > s;
    });

    if (hasConflict) {
      return res.status(409).json(formatErrorResponse(
        `${member.name} already has a booking that overlaps with this time slot.`, 409
      ));
    }

    // Atomic update — prevents race condition when two owners assign simultaneously.
    // If another request already assigned it, the $set will still succeed but we log it.
    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, salonId: business._id },
      { $set: { barberId: member._id, barberName: member.name, staffName: member.name } },
      { new: true }
    );

    if (!updated) return res.status(404).json(formatErrorResponse('Booking not found', 404));

    audit('BOOKING_ASSIGNED', req.owner._id, {
      bookingId:  String(bookingId),
      staffId:    String(member._id),
      staffName:  member.name,
    });

    res.json(formatSuccessResponse({ booking: updated }, 'Booking assigned'));
  } catch (err) {
    console.error('[assignBooking]', err);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};
