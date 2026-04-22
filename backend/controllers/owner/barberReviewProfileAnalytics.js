const Business = require('../../models/Business');
const Booking = require('../../models/Booking');

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

module.exports = {
  getDashboardAnalytics,
  getBookingStats,
};
