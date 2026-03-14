const Barber = require('../../models/Barber');
const Salon = require('../../models/Salon');
const Review = require('../../models/Review');
const Booking = require('../../models/Booking');
const Customer = require('../../models/Customer');

const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const messages = require('../../utils/messages');


// ===================================================
// SAFE SALON FETCH HELPER (FUTURE PROOF)
// ===================================================

const getOwnerSalon = async (ownerId) => {

  const salon = await Salon.findOne({
    $or: [
      { ownerId: ownerId },
      { owner: ownerId }
    ]
  });

  return salon;

};

// ===================================================
// CREATE BARBER
// ===================================================

const createBarber = async (req, res) => {

  try {

    const { name, experience, specializations, workingDays, shiftStart, shiftEnd, gender, phone, email } = req.body;

    if (!name || !experience) {
      return res.status(400).json(
        formatErrorResponse("Name and experience are required", 400)
      );
    }

    const salon = await getOwnerSalon(req.owner._id);

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    const barber = await Barber.create({
      name,
      phone,
      email,
      gender,
      salonId: salon._id,
      experience,
      specializations: specializations || [],
      workingDays: workingDays || ['monday','tuesday','wednesday','thursday','friday','saturday'],
      shiftStart: shiftStart || "09:00",
      shiftEnd: shiftEnd || "18:00",
      isActive: true
    });

    salon.barbers.push(barber._id);
    salon.totalBarbers = salon.barbers.length;

    await salon.save();

    res.status(201).json(
      formatSuccessResponse(barber, messages.BARBER.BARBER_CREATED, 201)
    );

  } catch (error) {

    console.error("Create barber error:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }

};



// ===================================================
// GET SALON BARBERS
// ===================================================

const getSalonBarbers = async (req, res) => {

  try {

    const salon = await getOwnerSalon(req.owner._id);

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND)
      );
    }

    const barbers = await Barber.find({ salonId: salon._id });

    res.json(
      formatSuccessResponse({
        barbers,
        total: barbers.length
      })
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR)
    );
  }

};



// ===================================================
// UPDATE BARBER
// ===================================================

const updateBarber = async (req, res) => {

  try {

    const { barberId } = req.params;

    const barber = await Barber.findById(barberId);

    if (!barber) {
      return res.status(404).json(
        formatErrorResponse(messages.BARBER.BARBER_NOT_FOUND)
      );
    }

    const salon = await Salon.findById(barber.salonId);

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND)
      );
    }

    if (salon.ownerId?.toString() !== req.owner._id.toString() &&
        salon.owner?.toString() !== req.owner._id.toString()) {

      return res.status(403).json(
        formatErrorResponse(messages.GENERIC.FORBIDDEN)
      );

    }

    const { name, phone, email, gender, experience, specializations, workingDays, shiftStart, shiftEnd, isActive } = req.body;
    if (name !== undefined)            barber.name            = name;
    if (phone !== undefined)           barber.phone           = phone;
    if (email !== undefined)           barber.email           = email;
    if (gender !== undefined)          barber.gender          = gender;
    if (experience !== undefined)      barber.experience      = experience;
    if (specializations !== undefined) barber.specializations = specializations;
    if (workingDays !== undefined)     barber.workingDays     = workingDays;
    if (shiftStart !== undefined)      barber.shiftStart      = shiftStart;
    if (shiftEnd !== undefined)        barber.shiftEnd        = shiftEnd;
    if (isActive !== undefined)        barber.isActive        = isActive;

    await barber.save();

    res.json(
      formatSuccessResponse(barber, messages.BARBER.BARBER_UPDATED)
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR)
    );
  }

};



// ===================================================
// DELETE BARBER
// ===================================================

const deleteBarber = async (req, res) => {

  try {

    const { barberId } = req.params;

    const barber = await Barber.findById(barberId);

    if (!barber) {
      return res.status(404).json(
        formatErrorResponse(messages.BARBER.BARBER_NOT_FOUND)
      );
    }

    const salon = await Salon.findById(barber.salonId);

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND)
      );
    }

    if (salon.ownerId?.toString() !== req.owner._id.toString() &&
        salon.owner?.toString() !== req.owner._id.toString()) {

      return res.status(403).json(
        formatErrorResponse(messages.GENERIC.FORBIDDEN)
      );

    }

    await Barber.findByIdAndDelete(barberId);

    await Salon.findByIdAndUpdate(barber.salonId, {
      $pull: { barbers: barberId },
      $inc: { totalBarbers: -1 }
    });

    res.json(
      formatSuccessResponse(null, messages.BARBER.BARBER_DELETED)
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR)
    );
  }

};



// ===================================================
// SUBMIT REVIEW
// ===================================================

const submitReview = async (req, res) => {

  try {

    const { bookingId, salonRating, reviewText } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json(
        formatErrorResponse(messages.BOOKING.BOOKING_NOT_FOUND)
      );
    }

    const review = await Review.create({
      bookingId,
      salonId: booking.salonId,
      barberId: booking.barberId,
      customerId: req.customer._id,
      salonRating,
      reviewText
    });

    res.status(201).json(
      formatSuccessResponse(review, messages.REVIEW.REVIEW_SUBMITTED)
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR)
    );
  }

};



// ===================================================
// GET SALON REVIEWS
// ===================================================

const getSalonReviews = async (req, res) => {

  try {

    const { salonId } = req.params;

    const reviews = await Review.find({ salonId });

    res.json(
      formatSuccessResponse(reviews)
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR)
    );
  }

};



// ===================================================
// UPDATE CUSTOMER PROFILE
// ===================================================

const updateProfile = async (req, res) => {

  try {

    const customer = await Customer.findByIdAndUpdate(
      req.customer._id,
      req.body,
      { new: true }
    );

    res.json(
      formatSuccessResponse(customer, messages.PROFILE.PROFILE_UPDATED)
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR)
    );
  }

};



// ===================================================
// ADD SAVED LOCATION
// ===================================================

const addSavedLocation = async (req, res) => {

  try {

    const customer = await Customer.findById(req.customer._id);

    customer.savedLocations.push(req.body);

    await customer.save();

    res.status(201).json(
      formatSuccessResponse(customer.savedLocations)
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR)
    );
  }

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

    // Optional date range filter
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

    const completed  = bookings.filter(b => b.status === 'completed');
    const pending    = bookings.filter(b => b.status === 'pending');
    const cancelled  = bookings.filter(b => b.status === 'cancelled');
    const confirmed  = bookings.filter(b => b.status === 'confirmed');

    const totalRevenue = completed.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // Recent 5 bookings
    const recentBookings = bookings.slice(0, 5).map(b => ({
      _id: b._id,
      customerName: b.customerName,
      serviceName: b.serviceName,
      appointmentDate: b.appointmentDate,
      appointmentTime: b.appointmentTime,
      status: b.status,
      totalAmount: b.totalAmount,
    }));

    // Top services by booking count
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

    // Daily breakdown
    const dailyMap = {};
    for (const b of bookings) {
      const dateStr = new Date(b.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, revenue: 0, bookings: 0 };
      dailyMap[dateStr].bookings++;
      if (b.status === 'completed') dailyMap[dateStr].revenue += (b.totalAmount || 0);
    }
    const dailyRevenue = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json(
      formatSuccessResponse({
        totalBookings:     bookings.length,
        completedBookings: completed.length,
        pendingBookings:   pending.length,
        confirmedBookings: confirmed.length,
        cancelledBookings: cancelled.length,
        totalRevenue,
        recentBookings,
        topServices,
        dailyRevenue,
      })
    );

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
      return res.status(401).json(
        formatErrorResponse("Unauthorized owner access",401)
      );
    }

    const salon = await getOwnerSalon(req.owner._id);

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse("Salon not found",404)
      );
    }

    const bookings = await Booking.find({ salonId: salon._id });

    res.json(
      formatSuccessResponse({
        total: bookings.length
      })
    );

  } catch (error) {

    console.error(error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR)
    );
  }

};



// ===================================================
// EXPORTS
// ===================================================

module.exports = {
  createBarber,
  getSalonBarbers,
  updateBarber,
  deleteBarber,
  submitReview,
  getSalonReviews,
  updateProfile,
  addSavedLocation,
  getDashboardAnalytics,
  getBookingStats
};