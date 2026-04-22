const Business = require('../../models/Business');
const Booking = require('../../models/Booking');
const Service = require('../../models/Service');

const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const messages = require('../../utils/messages');

// Helper: fetch the owner's salon
const getOwnerSalon = async (ownerId) => {
  return Business.findOne({ $or: [{ ownerId }, { owner: ownerId }] });
};

// ===================================================
// DASHBOARD ANALYTICS
// ===================================================
const getDashboardAnalytics = async (req, res) => {
  try {
    if (!req.owner || !req.owner._id) {
      return res.status(401).json(formatErrorResponse("Unauthorized owner access", 401));
    }

    const salon = await getOwnerSalon(req.owner._id);
    if (!salon) {
      return res.status(404).json(formatErrorResponse("Salon not found for this owner", 404));
    }

    const { startDate, endDate, compare } = req.query;
    const withComparison = compare === 'true' && startDate && endDate;

    const buildFilter = (sd, ed) => {
      const f = {};
      if (sd || ed) {
        f.createdAt = {};
        if (sd) f.createdAt.$gte = new Date(sd + 'T00:00:00.000Z');
        if (ed) f.createdAt.$lte = new Date(ed + 'T23:59:59.999Z');
      }
      return f;
    };

    const summarise = (bookings) => {
      const completed = bookings.filter(b => b.status === 'completed');
      const pending   = bookings.filter(b => b.status === 'pending');
      const cancelled = bookings.filter(b => b.status === 'cancelled');
      const confirmed = bookings.filter(b => b.status === 'confirmed');
      const totalRevenue = completed.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const customerSet = new Set();
      for (const b of bookings) {
        const key = b.customerPhone || (b.customerId ? String(b.customerId) : null) || b.customerName;
        if (key) customerSet.add(key);
      }
      const serviceMap = {};
      for (const b of bookings) {
        const key = b.services?.[0]?.serviceName || 'Unknown';
        if (!serviceMap[key]) serviceMap[key] = { name: key, bookings: 0, revenue: 0 };
        serviceMap[key].bookings++;
        if (b.status === 'completed') serviceMap[key].revenue += (b.totalAmount || 0);
      }
      const topServices = Object.values(serviceMap).sort((a, b) => b.bookings - a.bookings).slice(0, 5);
      const dailyMap = {};
      for (const b of bookings) {
        const dateStr = new Date(b.createdAt).toISOString().split('T')[0];
        if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, revenue: 0, bookings: 0 };
        dailyMap[dateStr].bookings++;
        if (b.status === 'completed') dailyMap[dateStr].revenue += (b.totalAmount || 0);
      }
      const dailyRevenue = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
      return {
        totalBookings: bookings.length, completedBookings: completed.length,
        pendingBookings: pending.length, confirmedBookings: confirmed.length,
        cancelledBookings: cancelled.length, totalRevenue,
        activeCustomers: customerSet.size, topServices, dailyRevenue,
      };
    };

    const dateFilter = buildFilter(startDate, endDate);
    const bookings = await Booking.find({ salonId: salon._id, ...dateFilter })
      .sort({ createdAt: -1 }).lean();

    const current = summarise(bookings);

    // Growth rate vs previous period
    let growthRate = 0;
    let previous = null;
    if (startDate && endDate) {
      const curStart = new Date(startDate + 'T00:00:00.000Z');
      const curEnd   = new Date(endDate   + 'T23:59:59.999Z');
      const spanMs   = curEnd - curStart;
      const prevEnd   = new Date(curStart.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - spanMs);
      const prevSD = prevStart.toISOString().split('T')[0];
      const prevED = prevEnd.toISOString().split('T')[0];

      if (withComparison) {
        const prevBookings = await Booking.find({
          salonId: salon._id, ...buildFilter(prevSD, prevED),
        }).sort({ createdAt: -1 }).lean();
        previous = summarise(prevBookings);
        const prevCount = prevBookings.length;
        if (prevCount > 0) growthRate = Math.round(((bookings.length - prevCount) / prevCount) * 100);
        else if (bookings.length > 0) growthRate = 100;
      } else {
        const prevCount = await Booking.countDocuments({
          salonId: salon._id,
          createdAt: { $gte: prevStart, $lte: prevEnd },
        });
        if (prevCount > 0) growthRate = Math.round(((bookings.length - prevCount) / prevCount) * 100);
        else if (bookings.length > 0) growthRate = 100;
      }
    }

    const recentBookings = bookings.slice(0, 20).map(b => ({
      _id: b._id, customerName: b.customerName, customerPhone: b.customerPhone,
      serviceName: b.services?.[0]?.serviceName || '',
      appointmentDate: b.appointmentDate, appointmentTime: b.appointmentTime,
      status: b.status, totalAmount: b.totalAmount,
    }));

    res.json(formatSuccessResponse({
      ...current,
      growthRate,
      recentBookings,
      ...(withComparison && previous ? { previous } : {}),
    }));
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// BOOKING STATS
// ===================================================
const getBookingStats = async (req, res) => {
  try {
    if (!req.owner || !req.owner._id) {
      return res.status(401).json(formatErrorResponse("Unauthorized owner access", 401));
    }

    const salon = await getOwnerSalon(req.owner._id);
    if (!salon) {
      return res.status(404).json(formatErrorResponse("Salon not found", 404));
    }

    const bookings = await Booking.find({ salonId: salon._id });

    res.json(formatSuccessResponse({ total: bookings.length }));
  } catch (error) {
    console.error(error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR));
  }
};

// ===================================================
// SMART INSIGHTS  (Phase 1 Intelligence Layer)
// ===================================================
const getSmartInsights = async (req, res) => {
  try {
    if (!req.owner || !req.owner._id) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }
    const salon = await getOwnerSalon(req.owner._id);
    if (!salon) return res.status(404).json(formatErrorResponse('Salon not found', 404));

    const salonId = salon._id;
    const now     = new Date();

    // Date helpers — UTC midnight boundaries matching how appointmentDate is stored
    const dayStart  = (d) => new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const dayEnd    = (d) => new Date(d.toISOString().split('T')[0] + 'T23:59:59.999Z');

    const todayStart  = dayStart(now);
    const todayEnd    = dayEnd(now);
    const yestDate    = new Date(now); yestDate.setDate(yestDate.getDate() - 1);
    const yestStart   = dayStart(yestDate);
    const yestEnd     = dayEnd(yestDate);
    const weekAgo     = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo    = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      todayBookings,
      yestBookings,
      last30Completed,
      missedThisWeek,
      recentPhones,
      allPhones,
      totalCompletedBookings,
      vipAgg,
      last30AllStatuses,
    ] = await Promise.all([
      Booking.find({ salonId, appointmentDate: { $gte: todayStart, $lte: todayEnd }, status: 'completed' }).select('totalAmount').lean(),
      Booking.find({ salonId, appointmentDate: { $gte: yestStart,  $lte: yestEnd  }, status: 'completed' }).select('totalAmount').lean(),
      Booking.find({ salonId, status: 'completed', createdAt: { $gte: monthAgo } }).select('appointmentTime').lean(),
      Booking.find({ salonId, status: { $in: ['no_show', 'cancelled'] }, appointmentDate: { $gte: weekAgo, $lte: todayEnd } }).select('totalAmount').lean(),
      Booking.distinct('customerPhone', { salonId, createdAt: { $gte: monthAgo }, customerPhone: { $ne: null } }),
      Booking.distinct('customerPhone', { salonId, customerPhone: { $ne: null } }),
      Booking.find({ salonId, status: 'completed' }).countDocuments(),
      Booking.aggregate([
        { $match: { salonId, customerPhone: { $ne: null } } },
        { $group: { _id: '$customerPhone', totalSpent: { $sum: '$totalAmount' }, totalBookings: { $sum: 1 } } },
        { $match: { $or: [{ totalSpent: { $gte: 2000 } }, { totalBookings: { $gte: 10 } }] } },
        { $project: { _id: 1 } },
      ]),
      Booking.find({ salonId, status: { $in: ['completed','pending','confirmed','in_progress'] }, createdAt: { $gte: monthAgo } }).select('appointmentDate').lean(),
    ]);

    // 1. Revenue snapshot
    const todayRevenue = todayBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const yestRevenue  = yestBookings.reduce((s, b)  => s + (b.totalAmount || 0), 0);
    const revDelta     = yestRevenue > 0
      ? Math.round(((todayRevenue - yestRevenue) / yestRevenue) * 100)
      : null;

    // 2. Peak hour from last 30 days
    const hourMap = {};
    for (const b of last30Completed) {
      if (!b.appointmentTime) continue;
      const hour = parseInt(b.appointmentTime.split(':')[0], 10);
      if (!isNaN(hour)) hourMap[hour] = (hourMap[hour] || 0) + 1;
    }
    let peakHour = null;
    let peakHourLabel = null;
    if (Object.keys(hourMap).length > 0) {
      peakHour = parseInt(Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0][0], 10);
      const fmtH = (h) => h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      peakHourLabel = `${fmtH(peakHour)}–${fmtH(peakHour + 2)}`;
    }

    // 3. Missed revenue (no-shows + cancellations this week)
    const missedRevenue = missedThisWeek.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const noShowCount   = missedThisWeek.length;

    // 4. Inactive customers (ever booked but not in last 30 days)
    const recentSet     = new Set(recentPhones);
    const inactiveCount = allPhones.filter(p => !recentSet.has(p)).length;

    // 5. Streak: consecutive days with >=1 booking ending today (or yesterday)
    const bookedDays = new Set(last30AllStatuses.map(b => {
      const d = new Date(b.appointmentDate);
      return d.toISOString().split('T')[0];
    }));
    let streak = 0;
    const checkDate = new Date(now);
    for (let i = 0; i < 30; i++) {
      const ds = checkDate.toISOString().split('T')[0];
      if (bookedDays.has(ds)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else if (i === 0) { checkDate.setDate(checkDate.getDate() - 1); } // skip today if no bookings yet
      else break;
    }

    // 6. VIP customers
    const vipCustomerPhones = new Set(vipAgg.map(v => v._id));

    res.json(formatSuccessResponse({
      todayRevenue,
      yestRevenue,
      revDelta,
      peakHour,
      peakHourLabel,
      missedRevenue,
      noShowCount,
      inactiveCustomers: inactiveCount,
      streak,
      totalBookings: totalCompletedBookings,
      vipCustomerPhones: Array.from(vipCustomerPhones),
    }));
  } catch (err) {
    console.error('Smart insights error:', err);
    res.status(500).json(formatErrorResponse('Failed to load insights', 500));
  }
};

// ===================================================
// SMART PRICING
// ===================================================
const getSmartPricing = async (req, res) => {
  try {
    if (!req.owner || !req.owner._id) return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    const salon = await getOwnerSalon(req.owner._id);
    if (!salon) return res.status(404).json(formatErrorResponse('Salon not found', 404));

    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);

    const [services, bookingCounts] = await Promise.all([
      Service.find({ salonId: salon._id, isActive: true, deletedAt: null }).select('_id name basePrice').lean(),
      Booking.aggregate([
        { $match: { salonId: salon._id, createdAt: { $gte: monthAgo }, status: { $in: ['completed', 'confirmed', 'pending'] } } },
        { $unwind: '$services' },
        { $group: { _id: '$services.serviceId', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = {};
    for (const b of bookingCounts) if (b._id) countMap[String(b._id)] = b.count;

    const suggestions = services
      .map(s => ({ ...s, bookingsLast30: countMap[String(s._id)] || 0 }))
      .filter(s => s.bookingsLast30 >= 8 && s.basePrice > 0)
      .sort((a, b) => b.bookingsLast30 - a.bookingsLast30)
      .slice(0, 5)
      .map(s => ({
        serviceId: s._id,
        serviceName: s.name,
        currentPrice: s.basePrice,
        suggestedPrice: Math.ceil(s.basePrice * 1.15 / 10) * 10,
        bookingsLast30: s.bookingsLast30,
      }));

    res.json(formatSuccessResponse({ suggestions }));
  } catch (err) {
    console.error('Smart pricing error:', err);
    res.status(500).json(formatErrorResponse('Failed to load pricing suggestions', 500));
  }
};

module.exports = {
  getDashboardAnalytics,
  getBookingStats,
  getSmartInsights,
  getSmartPricing,
};
