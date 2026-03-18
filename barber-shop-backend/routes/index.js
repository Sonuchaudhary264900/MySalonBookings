const express = require("express");
const router = express.Router();

/* =====================================================
   MIDDLEWARE
===================================================== */

const {
  authenticateOwner,
  authenticateCustomer,
  authenticateAdmin
} = require("../middleware/authMiddleware");

const {
  validatePaginationParams,
  validateObjectId,
  rateLimiter,
  asyncHandler
} = require("../middleware/validationMiddleware");

const multer = require("multer");
const multerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/* =====================================================
   SAFE CONTROLLER LOADER
===================================================== */

const safeRequire = (path) => {
  try {
    return require(path);
  } catch (error) {
    console.error(`❌ Failed to load controller: ${path}`);
    console.error(error);
    return {};
  }
};

/* =====================================================
   CONTROLLERS
===================================================== */

const ownerAuthController = safeRequire("../controllers/auth/ownerAuthController");
const customerAuthController = safeRequire("../controllers/auth/customerAuthController");

const salonController = safeRequire("../controllers/owner/salonController");
const serviceController = safeRequire("../controllers/owner/serviceController");

const bookingController = safeRequire("../controllers/customer/bookingController");

const barberController = safeRequire("../controllers/owner/barberReviewProfileAnalytics");

const salonApprovalController = safeRequire("../controllers/admin/salonApprovalController");
const adminAuthController = safeRequire("../controllers/admin/adminAuthController");
const adminManagementController = safeRequire("../controllers/admin/adminManagementController");

/* =====================================================
   MODELS (for inline public handlers)
===================================================== */
const Salon    = require("../models/Salon");
const Service  = require("../models/Service");
const Review   = require("../models/Review");
const Customer = require("../models/Customer");

/* =====================================================
   EXTRA ROUTES (MERGED OWNER ROUTES)
===================================================== */

/* =====================================================
   PUBLIC SALON ROUTES (no auth required)
===================================================== */

// GET /public/salons?sort=booked|rated&city=&q=&page=&limit=
// Escape special regex characters to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get("/public/salons", asyncHandler(async (req, res) => {
  const { q, city, page = 1, limit = 20, sort } = req.query;
  const query = { isApproved: true, isActive: true };
  if (city) query.city = { $regex: escapeRegex(String(city).slice(0, 100)), $options: "i" };
  if (q) {
    const safeQ = escapeRegex(String(q).slice(0, 100));
    query.$or = [
      { name:    { $regex: safeQ, $options: "i" } },
      { city:    { $regex: safeQ, $options: "i" } },
      { address: { $regex: safeQ, $options: "i" } },
    ];
  }
  const sortOrder = sort === "rated"
    ? { averageRating: -1, totalReviews: -1 }
    : { totalBookings: -1, averageRating: -1 }; // default: booked
  const skip = (Number(page) - 1) * Number(limit);
  const salons = await Salon.find(query)
    .select("name address city phone photos logo coverPhoto averageRating totalReviews totalBookings workingHours category isApproved location")
    .sort(sortOrder)
    .skip(skip)
    .limit(Number(limit))
    .lean();
  const total = await Salon.countDocuments(query);
  res.json({ success: true, data: { salons, total } });
}));

// GET /public/salons/nearby?latitude=&longitude=&sort=booked|rated|nearby
// Always within 5 km radius only
router.get("/public/salons/nearby", asyncHandler(async (req, res) => {
  const { latitude, longitude, sort } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, message: "latitude and longitude are required" });
  }
  const lat = Number(latitude);
  const lng = Number(longitude);

  const sortMap = {
    rated:  { averageRating: -1, totalReviews: -1, distance: 1 },
    nearby: { distance: 1 },
    booked: { totalBookings: -1, averageRating: -1, distance: 1 },
  };
  const sortOrder = sortMap[sort] || sortMap.booked;

  const salons = await Salon.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: 5000, // strict 5 km
        spherical: true,
        query: { isApproved: true, isActive: true },
      },
    },
    { $sort: sortOrder },
    { $limit: 30 },
    {
      $project: {
        name: 1, address: 1, city: 1, phone: 1, photos: 1, logo: 1, coverPhoto: 1,
        averageRating: 1, totalReviews: 1, totalBookings: 1,
        workingHours: 1, category: 1, location: 1, isApproved: 1, distance: 1,
      },
    },
  ]);

  res.json({ success: true, data: { salons, count: salons.length } });
}));

// GET /public/salons/:salonId
router.get("/public/salons/:salonId", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const salon = await Salon.findById(req.params.salonId).lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  if (!salon.isApproved) return res.status(403).json({ success: false, message: "Salon not approved" });
  res.json({ success: true, data: salon });
}));

// GET /public/salons/:salonId/services
router.get("/public/salons/:salonId/services", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const services = await Service.find({ salonId: req.params.salonId, isActive: true })
    .select("name description category basePrice duration applicableFor photos averageRating")
    .sort({ basePrice: 1 })
    .lean();
  res.json({ success: true, data: { services } });
}));

// GET /public/salons/:salonId/barbers
router.get("/public/salons/:salonId/barbers", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const Barber = require("../models/Barber");
  const barbers = await Barber.find({ salonId: req.params.salonId, isActive: true })
    .select("name profilePhoto gender specializations experience averageRating")
    .sort({ name: 1 })
    .lean();
  res.json({ success: true, data: { barbers } });
}));

// GET /public/salons/:salonId/reviews
router.get("/public/salons/:salonId/reviews", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const reviews = await Review.find({ salonId: req.params.salonId, isPublished: true, isHidden: false })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: { reviews } });
}));

// GET /public/salons/:salonId/booked-slots?date=YYYY-MM-DD&duration=N
router.get("/public/salons/:salonId/booked-slots", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const { date, duration } = req.query;
  if (!date) return res.status(400).json({ success: false, message: "date is required" });

  const serviceDuration = Math.max(5, parseInt(duration) || 30);

  const Booking = require("../models/Booking");

  const timeToMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const minutesToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  // Get salon working hours for the selected day
  const salon = await Salon.findById(req.params.salonId).select("workingHours bookingMode").lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  // Parse date at local noon to avoid UTC midnight flipping the day
  const dayName  = DAY_NAMES[new Date(date + "T12:00:00").getDay()];
  const dayHours = salon.workingHours?.[dayName];

  // Check if this date is a holiday / closed date
  const isHoliday = (salon.workingHours?.holidays || []).some(h => {
    const hDate = new Date(h.date);
    return hDate.toISOString().slice(0, 10) === date;
  });
  if (isHoliday) {
    return res.json({ success: true, data: { slots: [], blockedSlots: [], closedDay: true, reason: "holiday" } });
  }

  // Salon is closed on this day
  if (!dayHours || dayHours.isClosed) {
    return res.json({ success: true, data: { slots: [], blockedSlots: [], closedDay: true } });
  }

  const parseMinutes = (t, fallback) => {
    if (!t || typeof t !== "string") return fallback;
    const [hStr, mStr] = t.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return fallback;
    return h * 60 + m;
  };

  const openMin  = parseMinutes(dayHours.open,  9 * 60);
  const closeMin = parseMinutes(dayHours.close, 18 * 60);

  // Misconfigured hours — treat as closed
  if (openMin >= closeMin) {
    return res.json({ success: true, data: { slots: [], blockedSlots: [], closedDay: true } });
  }

  // Fetch existing bookings for this day
  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd   = new Date(date + "T23:59:59.999Z");

  const bookings = await Booking.find({
    salonId: req.params.salonId,
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ["pending", "confirmed", "in_progress"] },
  }).select("appointmentTime estimatedDuration").lean();

  const bookingMode = salon.bookingMode || "flexible";

  // ── SEQUENTIAL mode: return only the next available slot ──
  if (bookingMode === "sequential") {
    // Find the minute at which the last booking ends
    let nextSlotMin = openMin;
    for (const b of bookings) {
      const bookEnd = timeToMinutes(b.appointmentTime) + (b.estimatedDuration || 30);
      if (bookEnd > nextSlotMin) nextSlotMin = bookEnd;
    }
    // Check if next slot fits before closing
    if (nextSlotMin + serviceDuration > closeMin) {
      return res.json({ success: true, data: { slots: [], blockedSlots: [], closedDay: false, bookingMode: "sequential" } });
    }
    return res.json({ success: true, data: { slots: [minutesToTime(nextSlotMin)], blockedSlots: [], closedDay: false, bookingMode: "sequential" } });
  }

  // ── FLEXIBLE mode (default): generate all slots, mark blocked ──
  const slots = [];
  for (let t = openMin; t + serviceDuration <= closeMin; t += serviceDuration) {
    slots.push(minutesToTime(t));
  }

  // A generated slot is blocked if it overlaps with any existing booking
  const blockedSlots = new Set();
  for (const slot of slots) {
    const slotStart = timeToMinutes(slot);
    const slotEnd   = slotStart + serviceDuration;
    for (const b of bookings) {
      const bookStart = timeToMinutes(b.appointmentTime);
      const bookEnd   = bookStart + (b.estimatedDuration || 30);
      if (slotStart < bookEnd && bookStart < slotEnd) {
        blockedSlots.add(slot);
        break;
      }
    }
  }

  res.json({ success: true, data: { slots, blockedSlots: Array.from(blockedSlots), closedDay: false, bookingMode: "flexible" } });
}));

/* =====================================================
   COUPON VALIDATION ROUTE
===================================================== */

// POST /customer/coupons/validate
router.post("/customer/coupons/validate", authenticateCustomer, asyncHandler(async (req, res) => {
  const Coupon = require("../models/Coupon");
  const { code, salonId, totalAmount } = req.body;
  if (!code) return res.status(400).json({ success: false, message: "Coupon code is required" });

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });
  if (!coupon) return res.status(404).json({ success: false, message: "Invalid coupon code" });

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) return res.status(400).json({ success: false, message: "Coupon is not yet valid" });
  if (coupon.validUntil && now > coupon.validUntil) return res.status(400).json({ success: false, message: "Coupon has expired" });
  if (coupon.salonId && salonId && coupon.salonId.toString() !== salonId) return res.status(400).json({ success: false, message: "Coupon not valid for this salon" });
  if (coupon.maxUsageCount && coupon.usageCount >= coupon.maxUsageCount) return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
  if (coupon.minAmount && totalAmount < coupon.minAmount) return res.status(400).json({ success: false, message: `Minimum order amount ₹${coupon.minAmount} required` });

  const alreadyUsed = coupon.usedBy.some(id => id.toString() === req.customer._id.toString());
  if (coupon.maxUsagePerCustomer && alreadyUsed) return res.status(400).json({ success: false, message: "You have already used this coupon" });

  let discount = coupon.discountType === "percentage"
    ? Math.round((totalAmount * coupon.discountValue) / 100)
    : coupon.discountValue;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, totalAmount);

  res.json({ success: true, data: { coupon: { _id: coupon._id, code: coupon.code, description: coupon.description, discountType: coupon.discountType, discountValue: coupon.discountValue }, discount } });
}));

/* =====================================================
   CUSTOMER AUTH ROUTES
===================================================== */

router.post("/customer/auth/send-otp",
  rateLimiter(5, 900000),
  asyncHandler(customerAuthController.sendOTPToPhone)
);

router.post("/customer/auth/verify-otp",
  rateLimiter(10, 900000),
  asyncHandler(customerAuthController.verifyOTPOnly)
);

router.post("/customer/auth/register",
  rateLimiter(5, 900000),
  asyncHandler(customerAuthController.verifyOTPAndRegister)
);

router.post("/customer/auth/firebase-register",
  rateLimiter(5, 900000),
  asyncHandler(customerAuthController.firebaseRegister)
);

router.post("/customer/auth/login",
  rateLimiter(10, 900000),
  asyncHandler(customerAuthController.loginWithPhone)
);

router.get("/customer/auth/me",
  authenticateCustomer,
  asyncHandler(customerAuthController.getCurrentCustomer)
);

router.put("/customer/auth/me",
  authenticateCustomer,
  asyncHandler(customerAuthController.updateProfile)
);

router.post("/customer/auth/change-password",
  authenticateCustomer,
  asyncHandler(customerAuthController.changePassword)
);

router.post("/customer/auth/upload-photo",
  authenticateCustomer,
  multerUpload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No photo uploaded" });
    const { cloudinary: cloudinaryClient } = require("../config/cloudinary");
    const Customer = require("../models/Customer");
    const url = await new Promise((resolve, reject) => {
      const stream = cloudinaryClient.uploader.upload_stream(
        { folder: "smart-salon/customer-photos", resource_type: "image" },
        (error, result) => { if (error) reject(error); else resolve(result.secure_url); }
      );
      stream.end(req.file.buffer);
    });
    const customer = await Customer.findByIdAndUpdate(
      req.customer._id,
      { profilePhoto: url },
      { new: true }
    );
    res.json({ success: true, data: { profilePhoto: customer.profilePhoto } });
  })
);

router.post("/customer/auth/refresh-token",
  asyncHandler(customerAuthController.refreshToken)
);

router.post("/customer/auth/logout",
  authenticateCustomer,
  asyncHandler(customerAuthController.logout)
);

/* =====================================================
   CUSTOMER BOOKING ROUTES
===================================================== */

router.post("/customer/bookings",
  authenticateCustomer,
  asyncHandler(bookingController.createBooking)
);

router.get("/customer/bookings",
  authenticateCustomer,
  validatePaginationParams,
  asyncHandler(bookingController.getMyBookings)
);

router.get("/customer/bookings/:bookingId",
  authenticateCustomer,
  validateObjectId("bookingId"),
  asyncHandler(bookingController.getBookingDetails)
);

router.post("/customer/bookings/:bookingId/cancel",
  authenticateCustomer,
  validateObjectId("bookingId"),
  asyncHandler(bookingController.cancelBooking)
);

// PUT /customer/bookings/:bookingId/reschedule
router.put("/customer/bookings/:bookingId/reschedule",
  authenticateCustomer,
  validateObjectId("bookingId"),
  asyncHandler(async (req, res) => {
    const Booking = require("../models/Booking");
    const { appointmentDate, appointmentTime } = req.body;
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ success: false, message: "New date and time are required" });
    }
    const booking = await Booking.findOne({ _id: req.params.bookingId, customerId: req.customer._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Only pending or confirmed bookings can be rescheduled" });
    }
    // Check for conflicts at the new slot
    const timeToMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const dayStart = new Date(appointmentDate + "T00:00:00.000Z");
    const dayEnd   = new Date(appointmentDate + "T23:59:59.999Z");
    const existing = await Booking.find({
      salonId: booking.salonId,
      _id: { $ne: booking._id },
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["pending", "confirmed", "in_progress"] },
    }).select("appointmentTime estimatedDuration").lean();
    const newStart = timeToMinutes(appointmentTime);
    const newEnd   = newStart + (booking.estimatedDuration || 30);
    const conflict = existing.some(b => {
      const s = timeToMinutes(b.appointmentTime);
      const e = s + (b.estimatedDuration || 30);
      return newStart < e && s < newEnd;
    });
    if (conflict) return res.status(409).json({ success: false, message: "This time slot is already booked. Please choose another." });
    booking.appointmentDate = new Date(appointmentDate + "T12:00:00.000Z");
    booking.appointmentTime = appointmentTime;
    booking.status = "pending"; // reset to pending after reschedule
    await booking.save();
    res.json({ success: true, data: booking, message: "Booking rescheduled successfully" });
  })
);

/* =====================================================
   CUSTOMER REVIEW ROUTES
===================================================== */

// POST /customer/reviews — submit a review after a completed booking
router.post("/customer/reviews", authenticateCustomer, asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const { bookingId, salonRating, reviewText, title } = req.body;
  if (!bookingId || !salonRating) return res.status(400).json({ success: false, message: "bookingId and salonRating are required" });
  if (salonRating < 1 || salonRating > 5) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });

  const booking = await Booking.findOne({ _id: bookingId, customerId: req.customer._id, status: "completed" });
  if (!booking) return res.status(404).json({ success: false, message: "Completed booking not found" });

  const existing = await Review.findOne({ bookingId, customerId: req.customer._id });
  if (existing) return res.status(409).json({ success: false, message: "You have already reviewed this booking" });

  const Customer = require("../models/Customer");
  const customer = await Customer.findById(req.customer._id).select("name");

  const review = await Review.create({
    bookingId,
    customerId: req.customer._id,
    salonId: booking.salonId,
    salonRating: Number(salonRating),
    reviewText: reviewText?.trim() || undefined,
    title: title?.trim() || undefined,
    customerName: customer?.name,
  });

  // Update salon's average rating
  const allReviews = await Review.find({ salonId: booking.salonId, isPublished: true });
  const avg = allReviews.reduce((s, r) => s + r.salonRating, 0) / allReviews.length;
  await Salon.findByIdAndUpdate(booking.salonId, { averageRating: Math.round(avg * 10) / 10, totalReviews: allReviews.length });

  res.status(201).json({ success: true, data: review });
}));

/* =====================================================
   CUSTOMER FAVOURITES ROUTES
===================================================== */

// POST /customer/favorites/:salonId — toggle like (add if not saved, remove if already saved)
router.post("/customer/favorites/:salonId",
  authenticateCustomer,
  validateObjectId("salonId"),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    const salonId  = req.params.salonId;
    const already  = customer.preferredSalons.some(id => id.toString() === salonId);

    if (already) {
      await customer.removeFavoriteSalon(salonId);
      return res.json({ success: true, liked: false, message: "Removed from favourites" });
    }

    await customer.saveFavoriteSalon(salonId);
    res.json({ success: true, liked: true, message: "Added to favourites" });
  })
);

// GET /customer/favorites — return all liked salons
router.get("/customer/favorites",
  authenticateCustomer,
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.customer._id).populate(
      "preferredSalons",
      "name address city photos logo averageRating totalReviews category isApproved"
    );
    res.json({ success: true, data: { salons: customer.preferredSalons } });
  })
);

/* =====================================================
   OWNER AUTH ROUTES
===================================================== */

router.post(
  "/owner/auth/send-otp",
  rateLimiter(5, 900000),
  asyncHandler(ownerAuthController.sendOTP)
);

router.post(
  "/owner/auth/verify-otp",
  rateLimiter(10, 900000),
  asyncHandler(ownerAuthController.verifyOTP)
);

router.post(
  "/owner/auth/register",
  rateLimiter(5, 900000),
  asyncHandler(ownerAuthController.verifyOTPAndRegister)
);

router.post(
  "/owner/auth/firebase-register",
  rateLimiter(5, 900000),
  asyncHandler(ownerAuthController.firebaseRegister)
);

router.post(
  "/owner/auth/login",
  rateLimiter(5, 900000),
  asyncHandler(ownerAuthController.login)
);

router.post(
  "/owner/auth/refresh-token",
  rateLimiter(10, 900000),
  asyncHandler(ownerAuthController.refreshToken)
);

router.post(
  "/owner/auth/logout",
  authenticateOwner,
  asyncHandler(ownerAuthController.logout)
);

router.get(
  "/owner/auth/me",
  authenticateOwner,
  asyncHandler(ownerAuthController.getCurrentOwner)
);

router.put(
  "/owner/auth/me",
  authenticateOwner,
  asyncHandler(ownerAuthController.updateProfile)
);

router.post(
  "/owner/auth/change-password",
  authenticateOwner,
  asyncHandler(ownerAuthController.changePassword)
);

router.post(
  "/owner/auth/delete-account",
  asyncHandler(ownerAuthController.deleteAccount)
);

/* =====================================================
   OWNER SALON ROUTES (CONTROLLER)
===================================================== */

router.post(
  "/owner/salon",
  authenticateOwner,
  asyncHandler(salonController.createSalon)
);

router.get(
  "/owner/salon",
  authenticateOwner,
  asyncHandler(salonController.getMySalon)
);

router.put(
  "/owner/salon",
  authenticateOwner,
  asyncHandler(salonController.updateSalon)
);

router.post(
  "/owner/salon/upload-photos",
  authenticateOwner,
  multerUpload.array("photos", 10),
  asyncHandler(salonController.uploadSalonPhotos)
);

router.put(
  "/owner/salon/photos",
  authenticateOwner,
  asyncHandler(salonController.updateSalonPhotos)
);

router.get(
  "/owner/salon/approval-status",
  authenticateOwner,
  asyncHandler(salonController.getApprovalStatus)
);

/* =====================================================
   OWNER SERVICE ROUTES
===================================================== */

router.post(
  "/owner/services",
  authenticateOwner,
  asyncHandler(serviceController.createService)
);

router.get(
  "/owner/services",
  authenticateOwner,
  asyncHandler(serviceController.getSalonServices)
);

router.put(
  "/owner/services/:serviceId",
  authenticateOwner,
  validateObjectId("serviceId"),
  asyncHandler(serviceController.updateService)
);

router.delete(
  "/owner/services/:serviceId",
  authenticateOwner,
  validateObjectId("serviceId"),
  asyncHandler(serviceController.deleteService)
);

/* =====================================================
   OWNER BOOKING ROUTES
===================================================== */

router.get("/owner/bookings", authenticateOwner, validatePaginationParams, asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const { status, date, page = 1, limit = 20 } = req.query;
  const query = { salonId: salon._id };
  if (status && status !== "all") query.status = status;
  if (date) {
    query.appointmentDate = {
      $gte: new Date(date + "T00:00:00.000Z"),
      $lte: new Date(date + "T23:59:59.999Z"),
    };
  }

  const p = Math.max(1, parseInt(page));
  const l = Math.min(50, Math.max(1, parseInt(limit)));
  const bookings = await Booking.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean();
  const total = await Booking.countDocuments(query);

  res.json({ success: true, data: { bookings, total, page: p, limit: l } });
}));

router.post("/owner/bookings", authenticateOwner, asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const { customerName, customerPhone, serviceId, appointmentDate, appointmentTime } = req.body;
  if (!customerName?.trim())   return res.status(400).json({ success: false, message: "Customer name is required" });
  if (!customerPhone?.trim())  return res.status(400).json({ success: false, message: "Customer phone is required" });
  if (!serviceId)              return res.status(400).json({ success: false, message: "Service is required" });
  if (!appointmentDate)        return res.status(400).json({ success: false, message: "Appointment date is required" });
  if (!appointmentTime)        return res.status(400).json({ success: false, message: "Appointment time is required" });

  const service = await Service.findOne({ _id: serviceId, salonId: salon._id, isActive: true });
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const timeToMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const dayStart = new Date(appointmentDate + "T00:00:00.000Z");
  const dayEnd   = new Date(appointmentDate + "T23:59:59.999Z");

  const existingBookings = await Booking.find({
    salonId: salon._id,
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ["pending", "confirmed", "in_progress"] },
  }).select("appointmentTime estimatedDuration").lean();

  const newStart = timeToMinutes(appointmentTime);
  const newEnd   = newStart + service.duration;

  for (const b of existingBookings) {
    const bStart = timeToMinutes(b.appointmentTime);
    const bEnd   = bStart + (b.estimatedDuration || 30);
    if (newStart < bEnd && bStart < newEnd) {
      return res.status(409).json({ success: false, message: "This time slot is already booked" });
    }
  }

  const booking = await Booking.create({
    isWalkIn:         true,
    salonId:          salon._id,
    salonName:        salon.name,
    serviceId:        service._id,
    serviceName:      service.name,
    customerName:     customerName.trim(),
    customerPhone:    customerPhone.trim(),
    appointmentDate:  new Date(appointmentDate + "T12:00:00.000Z"),
    appointmentTime,
    estimatedDuration: service.duration,
    servicePrice:     service.basePrice,
    totalAmount:      service.basePrice,
    status:           "confirmed",
    paymentMethod:    "cash",
    paymentStatus:    "completed",
    confirmedAt:      new Date(),
  });

  res.status(201).json({ success: true, data: booking });
}));

router.put("/owner/bookings/:bookingId", authenticateOwner, validateObjectId("bookingId"), asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: salon._id });
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  const { status } = req.body;
  if (!["confirmed", "completed", "cancelled", "in_progress"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  booking.status = status;
  if (status === "confirmed")   booking.confirmedAt  = new Date();
  if (status === "completed")   booking.completedAt  = new Date();
  if (status === "cancelled")   booking.cancelledAt  = new Date();
  if (status === "in_progress") booking.startedAt    = new Date();
  await booking.save();

  // Emit real-time update to the customer's socket room
  const io = req.app.get("io");
  if (io && booking.customerId) {
    io.to(`customer-${booking.customerId}`).emit("booking-status-changed", {
      bookingId: booking._id,
      status,
    });
  }

  res.json({ success: true, data: booking });
}));

/* =====================================================
   OWNER REVIEWS
===================================================== */

// GET /owner/reviews — get all published reviews for this owner's salon
router.get("/owner/reviews", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const reviews = await Review.find({ salonId: salon._id, isPublished: true, isHidden: false })
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: { reviews } });
}));

// PUT /owner/reviews/:reviewId/reply — add/update owner reply on a review
router.put("/owner/reviews/:reviewId/reply", authenticateOwner, validateObjectId("reviewId"), asyncHandler(async (req, res) => {
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const { reply } = req.body;
  if (!reply?.trim()) return res.status(400).json({ success: false, message: "Reply text is required" });
  const review = await Review.findOne({ _id: req.params.reviewId, salonId: salon._id });
  if (!review) return res.status(404).json({ success: false, message: "Review not found" });
  review.ownerResponse = reply.trim();
  review.ownerRespondedAt = new Date();
  await review.save();
  res.json({ success: true, data: review });
}));

/* =====================================================
   OWNER ANALYTICS
===================================================== */

router.get(
  "/owner/analytics/dashboard",
  authenticateOwner,
  asyncHandler(barberController.getDashboardAnalytics)
);

router.get(
  "/owner/analytics/booking-stats",
  authenticateOwner,
  asyncHandler(barberController.getBookingStats)
);

/* =====================================================
   CUSTOMER AUTH - ADDITIONAL LOGIN METHODS
===================================================== */

router.post(
  "/customer/auth/login-phone",
  rateLimiter(5, 900000),
  asyncHandler(customerAuthController.loginWithPhone)
);

router.post(
  "/customer/auth/login-email",
  rateLimiter(5, 900000),
  asyncHandler(customerAuthController.loginWithEmail)
);

/* =====================================================
   ADMIN AUTH
===================================================== */

router.post("/admin/auth/setup", asyncHandler(adminAuthController.setupAdmin));
router.post("/admin/auth/login", asyncHandler(adminAuthController.loginAdmin));
router.get("/admin/auth/me", authenticateAdmin, asyncHandler(adminAuthController.getMe));

/* =====================================================
   ADMIN MANAGEMENT
===================================================== */

router.get("/admin/dashboard", authenticateAdmin, asyncHandler(adminManagementController.getDashboardStats));
router.get("/admin/owners", authenticateAdmin, asyncHandler(adminManagementController.getAllOwners));
router.get("/admin/salons/all", authenticateAdmin, asyncHandler(adminManagementController.getAllSalons));
router.get("/admin/salons/filter-options", authenticateAdmin, asyncHandler(adminManagementController.getFilterOptions));
router.get("/admin/salons/:salonId/detail", authenticateAdmin, asyncHandler(adminManagementController.getSalonDetail));
router.put("/admin/salons/:salonId/toggle", authenticateAdmin, asyncHandler(adminManagementController.toggleSalonActive));

/* =====================================================
   ADMIN SALON APPROVAL
===================================================== */

router.get(
  "/admin/salons/pending",
  authenticateAdmin,
  validatePaginationParams,
  asyncHandler(salonApprovalController.getPendingSalons)
);

router.post(
  "/admin/salons/:salonId/approve",
  authenticateAdmin,
  validateObjectId("salonId"),
  asyncHandler(salonApprovalController.approveSalon)
);

router.post(
  "/admin/salons/:salonId/reject",
  authenticateAdmin,
  validateObjectId("salonId"),
  asyncHandler(salonApprovalController.rejectSalon)
);

/* =====================================================
   MERGED OWNER ROUTES
===================================================== */

/* =====================================================
   OWNER BLOCK / UNBLOCK CUSTOMER ROUTES
===================================================== */

// POST /owner/customers/:customerId/block — block a customer from booking at this salon
router.post("/owner/customers/:customerId/block", authenticateOwner, validateObjectId("customerId"), asyncHandler(async (req, res) => {
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const { reason = "" } = req.body;
  const customerId = req.params.customerId;

  const alreadyBlocked = salon.blockedCustomers.some(bc => bc.customerId?.toString() === customerId);
  if (alreadyBlocked) return res.status(409).json({ success: false, message: "Customer is already blocked" });

  salon.blockedCustomers.push({ customerId, reason: reason.trim(), blockedAt: new Date() });
  await salon.save();
  res.json({ success: true, message: "Customer blocked successfully" });
}));

// DELETE /owner/customers/:customerId/block — unblock a customer
router.delete("/owner/customers/:customerId/block", authenticateOwner, validateObjectId("customerId"), asyncHandler(async (req, res) => {
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const customerId = req.params.customerId;
  const before = salon.blockedCustomers.length;
  salon.blockedCustomers = salon.blockedCustomers.filter(bc => bc.customerId?.toString() !== customerId);
  if (salon.blockedCustomers.length === before) {
    return res.status(404).json({ success: false, message: "Customer was not blocked" });
  }
  await salon.save();
  res.json({ success: true, message: "Customer unblocked successfully" });
}));

// GET /owner/blocked-customers — list all blocked customers
router.get("/owner/blocked-customers", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] })
    .populate("blockedCustomers.customerId", "name phone profilePhoto")
    .lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  res.json({ success: true, data: { blockedCustomers: salon.blockedCustomers || [] } });
}));

/* =====================================================
   OWNER HOLIDAY / CLOSED DATES ROUTES
===================================================== */

// POST /owner/salon/holidays — add a closed date
router.post("/owner/salon/holidays", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const { date, reason = "" } = req.body;
  if (!date) return res.status(400).json({ success: false, message: "date is required (YYYY-MM-DD)" });

  const dateObj = new Date(date + "T12:00:00.000Z");
  if (isNaN(dateObj.getTime())) return res.status(400).json({ success: false, message: "Invalid date format" });

  const already = salon.workingHours.holidays.some(h => {
    const d = new Date(h.date);
    return d.toISOString().slice(0, 10) === date;
  });
  if (already) return res.status(409).json({ success: false, message: "This date is already marked as closed" });

  salon.workingHours.holidays.push({ date: dateObj, reason: reason.trim() });
  await salon.save();
  res.status(201).json({ success: true, data: { holidays: salon.workingHours.holidays } });
}));

// DELETE /owner/salon/holidays/:holidayId — remove a closed date
router.delete("/owner/salon/holidays/:holidayId", authenticateOwner, validateObjectId("holidayId"), asyncHandler(async (req, res) => {
  const salon = await Salon.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const before = salon.workingHours.holidays.length;
  salon.workingHours.holidays = salon.workingHours.holidays.filter(h => h._id?.toString() !== req.params.holidayId);
  if (salon.workingHours.holidays.length === before) {
    return res.status(404).json({ success: false, message: "Holiday not found" });
  }
  await salon.save();
  res.json({ success: true, data: { holidays: salon.workingHours.holidays } });
}));

/* =====================================================
   PUBLIC SERVICE SEARCH ROUTE
===================================================== */

// GET /public/services/search?q=QUERY — search salons by service name
router.get("/public/services/search", asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || String(q).trim().length < 2) {
    return res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
  }
  const safeQ = escapeRegex(String(q).slice(0, 100));

  // Find active services matching the query
  const matchedServices = await Service.find({
    name: { $regex: safeQ, $options: "i" },
    isActive: true,
  }).select("salonId name").lean();

  if (matchedServices.length === 0) {
    return res.json({ success: true, data: { salons: [], matchedService: q } });
  }

  // Get unique salonIds from matched services
  const salonIdMap = {};
  for (const svc of matchedServices) {
    const key = svc.salonId?.toString();
    if (key) {
      if (!salonIdMap[key]) salonIdMap[key] = [];
      salonIdMap[key].push(svc.name);
    }
  }

  const salonIds = Object.keys(salonIdMap);
  const salons = await Salon.find({
    _id: { $in: salonIds },
    isApproved: true,
    isActive: true,
  })
    .select("name address city phone photos logo coverPhoto averageRating totalReviews totalBookings workingHours category location")
    .lean();

  // Attach matched service names to each salon
  const salonsWithMatch = salons.map(s => ({
    ...s,
    matchedServices: salonIdMap[s._id.toString()] || [],
  }));

  res.json({ success: true, data: { salons: salonsWithMatch, matchedService: q } });
}));

/* =====================================================
   HEALTH CHECK
===================================================== */

router.get("/health", (req, res) => {

  res.json({
    status: "OK",
    message: "Server running",
    timestamp: new Date().toISOString()
  });

});

/* =====================================================
   ROUTE NOT FOUND
===================================================== */

router.use((req, res) => {

  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl
  });

});

module.exports = router;