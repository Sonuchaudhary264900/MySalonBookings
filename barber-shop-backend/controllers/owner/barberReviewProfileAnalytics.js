const Salon = require('../../models/Salon');
const Booking = require('../../models/Booking');

const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const messages = require('../../utils/messages');

// Helper: fetch the owner's salon
const getOwnerSalon = async (ownerId) => {
  return Salon.findOne({ $or: [{ ownerId }, { owner: ownerId }] });
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

    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate)   dateFilter.createdAt.$lte = new Date(endDate   + 'T23:59:59.999Z');
    }

    const bookings = await Booking.find({ salonId: salon._id, ...dateFilter })
      .sort({ createdAt: -1 })
      .lean();

    const completed = bookings.filter(b => b.status === 'completed');
    const pending   = bookings.filter(b => b.status === 'pending');
    const cancelled = bookings.filter(b => b.status === 'cancelled');
    const confirmed = bookings.filter(b => b.status === 'confirmed');

    const totalRevenue = completed.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const recentBookings = bookings.slice(0, 5).map(b => ({
      _id:             b._id,
      customerName:    b.customerName,
      serviceName:     b.serviceName,
      appointmentDate: b.appointmentDate,
      appointmentTime: b.appointmentTime,
      status:          b.status,
      totalAmount:     b.totalAmount,
    }));

    const serviceMap = {};
    for (const b of bookings) {
      const key = b.serviceName || 'Unknown';
      if (!serviceMap[key]) serviceMap[key] = { name: key, bookings: 0, revenue: 0 };
      serviceMap[key].bookings++;
      if (b.status === 'completed') serviceMap[key].revenue += (b.totalAmount || 0);
    }
    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    const dailyMap = {};
    for (const b of bookings) {
      const dateStr = new Date(b.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, revenue: 0, bookings: 0 };
      dailyMap[dateStr].bookings++;
      if (b.status === 'completed') dailyMap[dateStr].revenue += (b.totalAmount || 0);
    }
    const dailyRevenue = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json(formatSuccessResponse({
      totalBookings:     bookings.length,
      completedBookings: completed.length,
      pendingBookings:   pending.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: cancelled.length,
      totalRevenue,
      recentBookings,
      topServices,
      dailyRevenue,
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
