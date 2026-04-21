// controllers/owner/staffController.js
// Owner manages their team members (Phase 1 — no staff login yet)

const Barber  = require('../../models/Barber');
const Booking = require('../../models/Booking');
const Business = require('../../models/Business');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');

// ── helpers ──────────────────────────────────────────────────────────────────

function dayOfWeek(date) {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date(date).getDay()];
}

// ── GET /owner/team ───────────────────────────────────────────────────────────
// Returns all staff for the owner's business, plus per-staff booking stats
exports.getTeam = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const staff = await Barber.find({ salonId: business._id })
      .populate('servicesOffered', 'name category')
      .sort({ isOwner: -1, createdAt: 1 })
      .lean();

    // Attach this-month booking counts + revenue per staff
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await Booking.aggregate([
      { $match: {
        salonId: business._id,
        barberId: { $in: staff.map(s => s._id) },
        appointmentDate: { $gte: monthStart },
        status: { $ne: 'cancelled' },
      }},
      { $group: {
        _id: '$barberId',
        bookings: { $sum: 1 },
        revenue:  { $sum: '$totalAmount' },
      }},
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[String(s._id)] = { bookings: s.bookings, revenue: s.revenue }; });

    const enriched = staff.map(s => ({
      ...s,
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

    if (!name?.trim()) return res.status(400).json(formatErrorResponse('Name is required', 400));

    const member = await Barber.create({
      name:       name.trim(),
      phone:      phone?.trim() || undefined,
      email:      email?.trim() || undefined,
      gender,
      profilePhoto,
      bio,
      salonId:    business._id,
      ownerId:    req.owner._id,
      staffRole,
      experience,
      specializations,
      servicesOffered,
      workingDays,
      shiftStart,
      shiftEnd,
      showEarningsToStaff,
      isOwner:      false,
      loginEnabled: false,
      isActive:     true,
    });

    res.status(201).json(formatSuccessResponse({ staff: member }, 'Staff added', 201));
  } catch (err) {
    console.error('[addStaff]', err);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// ── PUT /owner/team/:staffId ──────────────────────────────────────────────────
exports.updateStaff = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const member = await Barber.findOne({ _id: req.params.staffId, salonId: business._id });
    if (!member) return res.status(404).json(formatErrorResponse('Staff member not found', 404));

    const allowed = ['name','phone','email','gender','profilePhoto','bio','staffRole',
                     'experience','specializations','servicesOffered','workingDays',
                     'shiftStart','shiftEnd','showEarningsToStaff','isActive'];

    allowed.forEach(k => { if (req.body[k] !== undefined) member[k] = req.body[k]; });
    await member.save();

    res.json(formatSuccessResponse({ staff: member }, 'Staff updated'));
  } catch (err) {
    console.error('[updateStaff]', err);
    res.status(500).json(formatErrorResponse('Server error', 500));
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

    member.isActive = false;
    await member.save();

    res.json(formatSuccessResponse({}, 'Staff member deactivated'));
  } catch (err) {
    console.error('[removeStaff]', err);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// ── GET /owner/team/stats ─────────────────────────────────────────────────────
// Per-staff performance for Analytics page
exports.getTeamStats = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.owner._id }).select('_id');
    if (!business) return res.status(404).json(formatErrorResponse('Business not found', 404));

    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(new Date().setDate(1)); // month start default
    const end   = to   ? new Date(to)   : new Date();

    const staff = await Barber.find({ salonId: business._id, isActive: true })
      .select('name profilePhoto staffRole isOwner averageRating totalReviews')
      .lean();

    const stats = await Booking.aggregate([
      { $match: {
        salonId: business._id,
        barberId: { $in: staff.map(s => s._id) },
        appointmentDate: { $gte: start, $lte: end },
        status: { $ne: 'cancelled' },
      }},
      { $group: {
        _id:      '$barberId',
        bookings: { $sum: 1 },
        revenue:  { $sum: '$totalAmount' },
        completed:{ $sum: { $cond: [{ $eq: ['$status','completed'] }, 1, 0] } },
      }},
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[String(s._id)] = s; });

    const result = staff.map(s => {
      const st = statsMap[String(s._id)] || { bookings: 0, revenue: 0, completed: 0 };
      return {
        _id:          s._id,
        name:         s.name,
        profilePhoto: s.profilePhoto,
        staffRole:    s.staffRole,
        isOwner:      s.isOwner,
        rating:       s.averageRating,
        totalReviews: s.totalReviews,
        bookings:     st.bookings,
        revenue:      st.revenue,
        completed:    st.completed,
      };
    });

    res.json(formatSuccessResponse({ team: result }, 'Team stats fetched'));
  } catch (err) {
    console.error('[getTeamStats]', err);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// ── PUT /owner/team/:staffId/assign-booking ───────────────────────────────────
// Owner manually assigns an unassigned booking to a staff member
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

    booking.barberId   = member._id;
    booking.barberName = member.name;
    await booking.save();

    res.json(formatSuccessResponse({ booking }, 'Booking assigned'));
  } catch (err) {
    console.error('[assignBooking]', err);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};
