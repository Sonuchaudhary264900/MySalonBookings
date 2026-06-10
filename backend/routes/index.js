const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const { clearAuthCookies } = require('../utils/cookies');

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

const { checkSubscription } = require("../middleware/subscriptionMiddleware");
const { idempotency }    = require("../middleware/idempotency");
const { requireRole }    = require("../middleware/requireRole");
const { auditLogger }    = require("../middleware/auditLogger");
const { resolveSalon }   = require("../middleware/resolveSalon");

const multer = require("multer");
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp, gif)'), false);
    }
  },
});

// Separate multer for video uploads (up to 300 MB)
const multerVideoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Accept any video/* MIME type, or octet-stream with a video extension
    const isVideoMime = file.mimetype.startsWith('video/');
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    const videoExts = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', '3gp'];
    const isVideoExt = videoExts.includes(ext);
    if (isVideoMime || (file.mimetype === 'application/octet-stream' && isVideoExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, mov, webm, avi)'), false);
    }
  },
});

/* Owner gallery / reel URL helpers (analytics route + gallery routes — defined early for clarity) */
const normalizeGalleryMediaUrl = (u) => {
  if (u == null) return '';
  let s = String(u).trim();
  if (!s) return '';
  if (s.startsWith('//')) s = `https:${s}`;
  return s;
};
const isPresentableGalleryUrl = (u) => {
  const s = normalizeGalleryMediaUrl(u);
  return /^https?:\/\//i.test(s);
};
const galleryUrlKey = (u) => {
  const s = normalizeGalleryMediaUrl(u);
  if (!s) return '';
  try {
    const x = new URL(s);
    const path = x.pathname.replace(/\/+/g, '/');
    return `${x.hostname.toLowerCase()}${path}`;
  } catch {
    return s;
  }
};
const reelEntryUrl = (rv) => {
  if (typeof rv === 'string') return rv.trim();
  if (!rv || typeof rv !== 'object') return '';
  return String(rv.url || rv.videoUrl || rv.secure_url || rv.secureUrl || '').trim();
};
const normPhoto = (v) => {
  if (typeof v === 'string') return { url: v, caption: '', tags: [], isCover: false };
  const obj = v?.toObject ? v.toObject() : v;
  const url =
    obj?.url ||
    obj?.imageUrl ||
    obj?.image ||
    obj?.secure_url ||
    obj?.secureUrl ||
    obj?.src ||
    obj?.link ||
    obj?.photoUrl ||
    obj?.path ||
    '';
  return { ...obj, url };
};
const normVideo = (v) => {
  if (typeof v === 'string') return { url: v, caption: '', tags: [] };
  const obj = v?.toObject ? v.toObject() : v;
  const url =
    obj?.url ||
    obj?.videoUrl ||
    obj?.secure_url ||
    obj?.secureUrl ||
    obj?.src ||
    obj?.link ||
    obj?.path ||
    '';
  return { ...obj, url };
};

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
const subscriptionController = safeRequire("../controllers/payment/subscriptionController");
const subscriptionAdminController = safeRequire("../controllers/admin/subscriptionAdminController");
const promotionController = safeRequire("../controllers/promotion/promotionController");
const promotionAdminController = safeRequire("../controllers/admin/promotionAdminController");

/* =====================================================
   MODELS (for inline public handlers)
===================================================== */
const Owner             = require("../models/Owner");
const Business          = require("../models/Business");
const BusinessMedia     = require("../models/BusinessMedia");
const Service           = require("../models/Service");
const Review            = require("../models/Review");
const Customer          = require("../models/Customer");
const Coupon            = require("../models/Coupon");
const Booking           = require("../models/Booking");
const Promotion         = require("../models/Promotion");
const Queue             = require("../models/Queue");

const { formatSuccessResponse, formatErrorResponse } = require("../utils/formatters");

/* =====================================================
   EXTRA ROUTES (MERGED OWNER ROUTES)
===================================================== */

/* =====================================================
   PUBLIC SALON ROUTES (no auth required)
===================================================== */

// Cache public GET responses in the browser for 60 s, CDN for 120 s
router.use("/public", (req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control", "public, max-age=60, s-maxage=120");
  }
  next();
});

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
  const rawSalons = await Business.find(query)
    .select("name address city locality phone photos logo coverPhoto averageRating totalReviews totalBookings workingHours category servedGender offeredCategories isApproved isOnline lastOnlineAt location ownerId")
    .sort(sortOrder)
    .skip(skip)
    .limit(Number(limit))
    .populate("ownerId", "profilePhoto")
    .lean();
  const salons = rawSalons.map(s => ({ ...s, ownerPhoto: s.ownerId?.profilePhoto || null, ownerId: undefined, offeredCategoryNames: (s.offeredCategories || []).map(c => c.name), offeredCategories: undefined }));

  // Attach best active coupon per salon (single batch query)
  if (salons.length > 0) {
    const now = new Date();
    const salonIds = salons.map(s => s._id);

    // Attach first photo from BusinessMedia for salons missing a coverPhoto
    const mediaPhotos = await BusinessMedia.find({ businessId: { $in: salonIds }, type: 'photo' })
      .select('businessId url isCover').sort({ isCover: -1, createdAt: 1 }).lean();
    const mediaPhotoMap = {};
    for (const m of mediaPhotos) {
      const k = String(m.businessId);
      if (!mediaPhotoMap[k]) mediaPhotoMap[k] = m.url;
    }
    for (const s of salons) {
      if (!s.coverPhoto) s.coverPhoto = mediaPhotoMap[String(s._id)] || null;
      s.photos = mediaPhotoMap[String(s._id)] ? [mediaPhotoMap[String(s._id)]] : [];
    }

    const coupons = await Coupon.find({
      salonId: { $in: salonIds }, isActive: true, deletedAt: null,
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    }).sort({ discountValue: -1 }).select("salonId code discountType discountValue minAmount maxDiscount description").lean();
    console.log(`[salons] salonIds=${salonIds.length}, coupons found=${coupons.length}`);
    const couponMap = {};
    for (const c of coupons) {
      const k = String(c.salonId);
      if (!couponMap[k]) couponMap[k] = c;
    }
    salons.forEach(s => {
      const c = couponMap[String(s._id)];
      s.topOffer = c ? { code: c.code, discountType: c.discountType, discountValue: c.discountValue, minAmount: c.minAmount || 0, maxDiscount: c.maxDiscount || null, description: c.description || null } : null;
    });
  }

  const total = await Business.countDocuments(query);
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

  const salons = await Business.aggregate([
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
      $lookup: {
        from: "owners",
        localField: "ownerId",
        foreignField: "_id",
        as: "_owner",
        pipeline: [{ $project: { profilePhoto: 1 } }],
      },
    },
    {
      $project: {
        name: 1, address: 1, city: 1, locality: 1, phone: 1, photos: 1, logo: 1, coverPhoto: 1,
        averageRating: 1, totalReviews: 1, totalBookings: 1,
        workingHours: 1, category: 1, businessType: 1, servedGender: 1, location: 1, isApproved: 1, isOnline: 1, lastOnlineAt: 1, distance: 1,
        ownerPhoto: { $ifNull: [{ $arrayElemAt: ["$_owner.profilePhoto", 0] }, null] },
        offeredCategoryNames: {
          $map: {
            input: { $ifNull: ["$offeredCategories", []] },
            as: "c",
            in: "$$c.name",
          },
        },
      },
    },
  ]);

  // Attach best active coupon per salon (single batch query)
  if (salons.length > 0) {
    const now = new Date();
    const salonIds = salons.map(s => s._id);

    // Attach first photo from BusinessMedia for salons missing a coverPhoto
    const nearbyMediaPhotos = await BusinessMedia.find({ businessId: { $in: salonIds }, type: 'photo' })
      .select('businessId url isCover').sort({ isCover: -1, createdAt: 1 }).lean();
    const nearbyMediaPhotoMap = {};
    for (const m of nearbyMediaPhotos) {
      const k = String(m.businessId);
      if (!nearbyMediaPhotoMap[k]) nearbyMediaPhotoMap[k] = m.url;
    }
    for (const s of salons) {
      if (!s.coverPhoto) s.coverPhoto = nearbyMediaPhotoMap[String(s._id)] || null;
      s.photos = nearbyMediaPhotoMap[String(s._id)] ? [nearbyMediaPhotoMap[String(s._id)]] : [];
    }

    const coupons = await Coupon.find({
      salonId: { $in: salonIds }, isActive: true, deletedAt: null,
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    }).sort({ discountValue: -1 }).select("salonId code discountType discountValue minAmount maxDiscount description").lean();
    console.log(`[nearby] salonIds=${salonIds.length}, coupons found=${coupons.length}`);
    const couponMap = {};
    for (const c of coupons) {
      const k = String(c.salonId);
      if (!couponMap[k]) couponMap[k] = c;
    }
    salons.forEach(s => {
      const c = couponMap[String(s._id)];
      s.topOffer = c ? { code: c.code, discountType: c.discountType, discountValue: c.discountValue, minAmount: c.minAmount || 0, maxDiscount: c.maxDiscount || null, description: c.description || null } : null;
    });

    // Attach promotion status — promoted salons float to top
    const activePromotions = await Promotion.find({
      salonId: { $in: salonIds },
      status: 'active',
      endDate: { $gte: now },
    }).select('salonId radiusKm endDate').lean();

    const promotionMap = {};
    for (const p of activePromotions) {
      promotionMap[String(p.salonId)] = p;
    }

    // Mark each salon as promoted if the user is within its promotion radius
    salons.forEach(s => {
      const promo = promotionMap[String(s._id)];
      s.isPromoted = !!(promo && s.distance <= promo.radiusKm * 1000);
      s.promotionEndsAt = s.isPromoted ? promo.endDate : null;
    });

    // Stable sort: promoted first, preserve original order within each group
    salons.sort((a, b) => {
      if (a.isPromoted && !b.isPromoted) return -1;
      if (!a.isPromoted && b.isPromoted) return 1;
      return 0;
    });
  }

  res.json({ success: true, data: { salons, count: salons.length } });
}));

// GET /public/salons/:salonId/queue — live queue for today (public, no auth)
router.get("/public/salons/:salonId/queue", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const queueDoc = await Queue.findOne({
    salonId: req.params.salonId,
    date: { $gte: today, $lt: tomorrow },
  }).lean();
  if (!queueDoc) {
    return res.json({ success: true, data: { queue: [], totalWaiting: 0, averageWaitTime: 0 } });
  }
  const visible = (queueDoc.queue || [])
    .filter(q => q.status === 'waiting' || q.status === 'in_progress')
    .sort((a, b) => a.position - b.position)
    .map(q => ({
      position: q.position,
      customerName: q.customerName,
      serviceName: q.serviceName,
      estimatedDuration: q.estimatedDuration,
      status: q.status,
    }));
  res.json({ success: true, data: {
    queue: visible,
    totalWaiting: queueDoc.totalWaiting,
    averageWaitTime: queueDoc.averageWaitTime,
  }});
}));

// GET /public/salons/:salonId
router.get("/public/salons/:salonId", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const Barber = require("../models/Barber");
  const salon = await Business.findById(req.params.salonId).populate("ownerId", "profilePhoto gender name").lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  if (!salon.isApproved) return res.status(403).json({ success: false, message: "Salon not approved" });
  const now = new Date();
  const [topCoupon, barberCount, mediaItems] = await Promise.all([
    Coupon.findOne({ salonId: salon._id, isActive: true, deletedAt: null, $or: [{ validUntil: null }, { validUntil: { $gte: now } }] })
      .sort({ discountValue: -1 })
      .select("code discountType discountValue minAmount maxDiscount description validUntil maxUsageCount usageCount")
      .lean(),
    Barber.countDocuments({ salonId: salon._id, isActive: true }),
    BusinessMedia.find({ businessId: salon._id, type: { $in: ['photo', 'video'] }, deletedAt: null })
      .select('type url isCover').sort({ isCover: -1, createdAt: 1 }).lean(),
  ]);
  const photos = mediaItems.filter(m => m.type === 'photo').map(m => m.url);
  const videos = mediaItems.filter(m => m.type === 'video').map(m => m.url);
  // Also include photos/videos stored in Business model arrays (fallback for data pre-dating BusinessMedia)
  const photoUrlSet = new Set(photos);
  for (const p of (salon.photos || [])) {
    const u = typeof p === 'string' ? p : p?.url;
    if (u && !photoUrlSet.has(u)) { photos.push(u); photoUrlSet.add(u); }
  }
  const videoUrlSet = new Set(videos);
  for (const v of (salon.videos || [])) {
    const u = typeof v === 'string' ? v : v?.url;
    if (u && !videoUrlSet.has(u)) { videos.push(u); videoUrlSet.add(u); }
  }
  if (!salon.coverPhoto && photos.length > 0) salon.coverPhoto = photos[0];

  const ownerPhoto = salon.ownerId?.profilePhoto || null;
  const ownerGender = salon.ownerId?.gender || null;
  const ownerName = salon.ownerId?.name || null;

  const buildOfferMeta = (c) => {
    if (!c) return null;
    const remaining = c.maxUsageCount ? Math.max(0, c.maxUsageCount - (c.usageCount || 0)) : null;
    const daysLeft  = c.validUntil ? Math.ceil((new Date(c.validUntil) - now) / 86400000) : null;
    const expiresLabel = daysLeft === 0 ? "Expires today!"
      : daysLeft === 1 ? "Expires tomorrow"
      : c.validUntil ? `Expires ${new Date(c.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      : null;
    return {
      code: c.code, discountType: c.discountType, discountValue: c.discountValue,
      minAmount: c.minAmount || 0, maxDiscount: c.maxDiscount || null, description: c.description || null,
      validUntil: c.validUntil || null, remaining,
      isExpiringSoon: daysLeft !== null && daysLeft <= 3 && daysLeft >= 0,
      isLimited: remaining !== null && remaining <= 10,
      daysLeft, expiresLabel,
    };
  };

  const topOffer = buildOfferMeta(topCoupon);
  res.json({ success: true, data: { ...salon, photos, videos, ownerPhoto, ownerGender, ownerName, ownerId: undefined, hasCoupons: !!topOffer, topOffer, hasBarbers: barberCount > 0, ctaPhoto: salon.ctaPhoto || null } });
}));

// GET /public/salons/:salonId/services
router.get("/public/salons/:salonId/services", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const services = await Service.find({ salonId: req.params.salonId, isActive: true, deletedAt: null })
    .select("name description category basePrice duration applicableFor photos averageRating")
    .sort({ basePrice: 1 })
    .lean();
  res.json({ success: true, data: { services } });
}));

// GET /public/salons/:salonId/offers — all active offers for a salon (customer-facing)
router.get("/public/salons/:salonId/offers", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    salonId: req.params.salonId,
    isActive: true,
    $and: [
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
    ],
  })
    .sort({ discountValue: -1 })
    .select("code discountType discountValue minAmount maxDiscount description validUntil maxUsageCount usageCount")
    .lean();

  const offers = coupons.map((c) => {
    const remaining    = c.maxUsageCount ? Math.max(0, c.maxUsageCount - (c.usageCount || 0)) : null;
    const daysLeft     = c.validUntil ? Math.ceil((new Date(c.validUntil) - now) / 86400000) : null;
    const expiresLabel = daysLeft === 0 ? "Expires today!"
      : daysLeft === 1 ? "Expires tomorrow"
      : c.validUntil ? `Expires ${new Date(c.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      : null;
    return {
      code: c.code, discountType: c.discountType, discountValue: c.discountValue,
      minAmount: c.minAmount || 0, maxDiscount: c.maxDiscount || null, description: c.description || null,
      validUntil: c.validUntil || null, remaining,
      isExpiringSoon: daysLeft !== null && daysLeft <= 3 && daysLeft >= 0,
      isLimited: remaining !== null && remaining <= 10,
      daysLeft, expiresLabel,
    };
  });
  res.json({ success: true, data: { offers } });
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

// Helper: try to extract customerId from JWT without rejecting unauthenticated requests
const getOptionalCustomerId = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'customer') return String(decoded.id || decoded._id);
  } catch {}
  return null;
};

// ── Reel scoring helper (Phase 1 formula + Phase 3 personalisation) ──────────
// Score = (normViews * 0.4) + (normLikes * 0.3) + (recentness * 0.2) + (ownerBoost * 0.1)
// All inputs normalised to [0, 1]; personalisation multipliers applied on top.
function computeReelScore(viewCount, likeCount, createdAt, isBoostEnabled, categoryBonus = 0, skipPenalty = 0) {
  const ageMs   = Date.now() - new Date(createdAt || Date.now()).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  // Soft normalisation — no global max needed; asymptotically approaches 1
  const nViews  = viewCount / (viewCount + 100);   // 100-view midpoint
  const nLikes  = likeCount / (likeCount + 10);    // 10-like midpoint
  // Recentness decays linearly to 0 at 30 days
  const recent  = Math.max(0, 1 - ageDays / 30);
  const boost   = isBoostEnabled ? 1 : 0;
  // Base score [0, 1]
  const base = (nViews * 0.4) + (nLikes * 0.3) + (recent * 0.2) + (boost * 0.1);
  // Phase 3 personalisation: category affinity boosts, skip history penalises
  return base * (1 + categoryBonus * 0.4) * (1 - skipPenalty * 0.3);
}

// GET /public/reels?latitude=&longitude=&page=1&limit=30&gender=all|male|female&mode=nearest|all
// Returns flattened salon reel videos sorted by engagement score, personalised when logged in.
router.get("/public/reels", asyncHandler(async (req, res) => {
  const { latitude, longitude, page = 1, limit = 30, gender, mode, fingerprint: fpQuery } = req.query;
  const customerId  = getOptionalCustomerId(req);
  const fingerprint = fpQuery || req.headers['x-fingerprint'] || null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoords = latitude && longitude && !isNaN(lat) && !isNaN(lng);
  const useNearest = (mode !== 'all') && hasCoords;

  // Gender filter
  const genderFilter = {};
  if (gender === 'male')   genderFilter.servedGender = { $in: ['male', 'unisex'] };
  else if (gender === 'female') genderFilter.servedGender = { $in: ['female', 'unisex'] };

  const baseQuery = { isApproved: true, "reelVideos.0": { $exists: true }, ...genderFilter };

  let salons;
  if (useNearest) {
    salons = await Business.find({
      ...baseQuery,
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: 20000,
        },
      },
    })
      .select("name city address locality location logo coverPhoto averageRating reelVideos isBoostEnabled businessType")
      .limit(100)
      .lean();
  } else {
    salons = await Business.find(baseQuery)
      .select("name city address locality location logo coverPhoto averageRating reelVideos isBoostEnabled businessType")
      .limit(100)
      .lean();
  }

  // Flatten to individual reel items — keep createdAt for scoring
  const allReels = [];
  for (const s of salons) {
    for (let i = 0; i < (s.reelVideos || []).length; i++) {
      const rv = s.reelVideos[i];
      const videoUrl   = typeof rv === 'string' ? rv : rv?.url;
      const categories = typeof rv === 'string' ? [] : (rv?.categories || []);
      const createdAt  = typeof rv === 'string' ? null : (rv?.createdAt || null);
      if (!videoUrl) continue;
      allReels.push({
        _id: `${s._id}_${i}`,
        videoUrl,
        categories,
        _createdAt:      createdAt,
        _isBoostEnabled: s.isBoostEnabled || false,
        salon: { _id: s._id, name: s.name, city: s.city, address: s.address || null, locality: s.locality || null, location: s.location || null, logo: s.logo || null, averageRating: s.averageRating || 0, businessType: s.businessType || 'salon' },
      });
    }
  }

  if (allReels.length === 0) {
    return res.json({ success: true, data: [], total: 0, page: Number(page) });
  }

  const ReelLike    = require("../models/ReelLike");
  const ReelView    = require("../models/ReelView");
  const ReelComment = require("../models/ReelComment");

  const allUrls = allReels.map(r => r.videoUrl);

  // ── Phase 1: batch-fetch global counts for scoring ALL reels ──────────────
  const [globalLikesAgg, globalViewsAgg] = await Promise.all([
    ReelLike.aggregate([
      { $match: { videoUrl: { $in: allUrls } } },
      { $group: { _id: '$videoUrl', count: { $sum: 1 } } },
    ]),
    ReelView.aggregate([
      { $match: { videoUrl: { $in: allUrls } } },
      { $group: { _id: '$videoUrl', count: { $sum: 1 } } },
    ]),
  ]);
  const globalLikeMap = Object.fromEntries(globalLikesAgg.map(d => [d._id, d.count]));
  const globalViewMap = Object.fromEntries(globalViewsAgg.map(d => [d._id, d.count]));

  // ── Phase 3: personalised category boosts/penalties ───────────────────────
  const categoryBoostMap   = {}; // videoUrl → 0–1 bonus
  const skipPenaltyMap     = {}; // videoUrl → 0–1 penalty
  const userId = customerId || fingerprint;
  if (userId) {
    const ReelInteraction = require("../models/ReelInteraction");
    const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days
    const recentInteractions = await ReelInteraction.find({
      $or: [
        ...(customerId  ? [{ customerId }]  : []),
        ...(fingerprint ? [{ fingerprint }] : []),
      ],
      createdAt: { $gte: sinceDate },
    }).select('categories action watchRatio').lean();

    // Accumulate per-category affinity signals
    const catWatchScore = {}; // category → sum of watchRatios
    const catSkipCount  = {}; // category → skip event count
    for (const inter of recentInteractions) {
      for (const cat of (inter.categories || [])) {
        if (inter.action === 'watch_full') {
          catWatchScore[cat] = (catWatchScore[cat] || 0) + (inter.watchRatio || 1);
        } else if (inter.action === 'skip') {
          catSkipCount[cat]  = (catSkipCount[cat]  || 0) + 1;
        }
      }
    }

    // Normalise to [0, 1] using dataset max
    const maxWatch = Math.max(...Object.values(catWatchScore), 1);
    const maxSkip  = Math.max(...Object.values(catSkipCount),  1);

    for (const reel of allReels) {
      let boost = 0; let penalty = 0;
      for (const cat of (reel.categories || [])) {
        boost   = Math.max(boost,   (catWatchScore[cat] || 0) / maxWatch);
        penalty = Math.max(penalty, (catSkipCount[cat]  || 0) / maxSkip);
      }
      if (boost   > 0) categoryBoostMap[reel.videoUrl] = boost;
      if (penalty > 0) skipPenaltyMap[reel.videoUrl]   = penalty;
    }
  }

  // ── Score + sort all reels ─────────────────────────────────────────────────
  for (const reel of allReels) {
    reel._score = computeReelScore(
      globalViewMap[reel.videoUrl]  || 0,
      globalLikeMap[reel.videoUrl]  || 0,
      reel._createdAt,
      reel._isBoostEnabled,
      categoryBoostMap[reel.videoUrl] || 0,
      skipPenaltyMap[reel.videoUrl]   || 0,
    );
  }
  allReels.sort((a, b) => b._score - a._score);

  // ── Paginate ───────────────────────────────────────────────────────────────
  const pageReels = allReels.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

  // ── Batch-fetch per-page metadata: liked state + comment count ────────────
  // (likeCount / viewCount reused from global aggregation above — no extra DB hits)
  if (pageReels.length > 0) {
    const videoUrls = pageReels.map(r => r.videoUrl);
    const [likedDocs, commentsAgg] = await Promise.all([
      customerId
        ? ReelLike.find({ videoUrl: { $in: videoUrls }, customerId }).select('videoUrl').lean()
        : Promise.resolve([]),
      ReelComment.aggregate([
        { $match: { videoUrl: { $in: videoUrls } } },
        { $group: { _id: '$videoUrl', count: { $sum: 1 } } },
      ]),
    ]);
    const commentMap = Object.fromEntries(commentsAgg.map(d => [d._id, d.count]));
    const likedSet   = new Set((likedDocs || []).map(d => d.videoUrl));

    pageReels.forEach(r => {
      r.likeCount    = globalLikeMap[r.videoUrl]  || 0;
      r.viewCount    = globalViewMap[r.videoUrl]  || 0;
      r.commentCount = commentMap[r.videoUrl]     || 0;
      r.liked        = likedSet.has(r.videoUrl);
      // Remove internal scoring fields before sending to client
      delete r._score;
      delete r._createdAt;
      delete r._isBoostEnabled;
    });
  }

  res.json({ success: true, data: pageReels, total: allReels.length, page: Number(page) });
}));

// POST /public/reels/view — record a view (called after 3s of watching)
// Deduplicates: same fingerprint + videoUrl within 24h counts as one view.
// Phase 2: also accepts watchTime + videoDuration to measure engagement depth.
// Phase 3: logs a watch_full ReelInteraction when watchRatio >= 0.7.
router.post("/public/reels/view", asyncHandler(async (req, res) => {
  const { videoUrl, salonId, fingerprint, categories, watchTime, videoDuration } = req.body;
  if (!videoUrl || !salonId) return res.status(400).json({ success: false, message: "videoUrl and salonId required" });
  const ReelView = require("../models/ReelView");

  const wt  = Number(watchTime)     || 0;
  const vd  = Number(videoDuration) || 0;
  const watchRatio = vd > 0 ? Math.min(wt / vd, 1) : 0;

  if (fingerprint) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const exists = await ReelView.findOne({ videoUrl, fingerprint, createdAt: { $gte: since } }).lean();
    if (exists) {
      const viewCount = await ReelView.countDocuments({ videoUrl });
      return res.json({ success: true, viewCount, duplicate: true });
    }
  }

  await ReelView.create({
    videoUrl,
    salonId,
    fingerprint:   fingerprint || null,
    watchTime:     wt,
    videoDuration: vd,
  });
  const viewCount = await ReelView.countDocuments({ videoUrl });

  // Phase 3: record a positive engagement signal when user watched ≥ 70 %
  if (watchRatio >= 0.7 && salonId) {
    const ReelInteraction = require("../models/ReelInteraction");
    const customerId = getOptionalCustomerId(req);
    ReelInteraction.create({
      videoUrl,
      salonId,
      customerId:    customerId || null,
      fingerprint:   fingerprint || null,
      categories:    Array.isArray(categories) ? categories : [],
      action:        watchRatio >= 0.95 ? 'replay' : 'watch_full',
      watchTime:     wt,
      videoDuration: vd,
      watchRatio,
    }).catch(() => {}); // fire-and-forget; never block the view response
  }

  res.json({ success: true, viewCount });
}));

// POST /public/reels/interaction — track skip / watch signals for Phase 2/3 personalisation
// Called by the frontend when a user scrolls past a video after watching < 3 s (skip).
router.post("/public/reels/interaction", asyncHandler(async (req, res) => {
  const { videoUrl, salonId, categories, action, watchTime, videoDuration, fingerprint } = req.body;
  if (!videoUrl || !salonId || !action) {
    return res.status(400).json({ success: false, message: "videoUrl, salonId, and action are required" });
  }
  if (!['skip', 'watch_full', 'replay'].includes(action)) {
    return res.status(400).json({ success: false, message: "action must be skip | watch_full | replay" });
  }
  const customerId = getOptionalCustomerId(req);
  const wt  = Number(watchTime)     || 0;
  const vd  = Number(videoDuration) || 0;
  const watchRatio = vd > 0 ? Math.min(wt / vd, 1) : 0;
  const ReelInteraction = require("../models/ReelInteraction");
  await ReelInteraction.create({
    videoUrl,
    salonId,
    customerId:    customerId || null,
    fingerprint:   fingerprint || null,
    categories:    Array.isArray(categories) ? categories : [],
    action,
    watchTime:     wt,
    videoDuration: vd,
    watchRatio,
  });
  res.json({ success: true });
}));

// GET /public/reels/comments?videoUrl=...  — fetch comments for a reel
router.get("/public/reels/comments", asyncHandler(async (req, res) => {
  const { videoUrl } = req.query;
  if (!videoUrl) return res.status(400).json({ success: false, message: "videoUrl is required" });
  const ReelComment = require("../models/ReelComment");
  const comments = await ReelComment.find({ videoUrl })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: comments });
}));

// POST /public/reels/comments — post a comment on a reel (requires customer auth)
router.post("/public/reels/comments", authenticateCustomer, asyncHandler(async (req, res) => {
  const { videoUrl, salonId, text } = req.body;
  if (!videoUrl || !salonId || !text?.trim()) {
    return res.status(400).json({ success: false, message: "videoUrl, salonId, and text are required" });
  }
  const Customer = require("../models/Customer");
  const customer = await Customer.findById(req.customer._id).select('name').lean();
  const name = customer?.name || 'User';
  const ReelComment = require("../models/ReelComment");
  const comment = await ReelComment.create({
    videoUrl,
    salonId,
    name,
    text: text.trim().slice(0, 500),
  });
  res.status(201).json({ success: true, data: comment });
}));

// POST /public/reels/like — toggle like on a reel (requires customer auth)
router.post("/public/reels/like", authenticateCustomer, asyncHandler(async (req, res) => {
  const { videoUrl, salonId } = req.body;
  const customerId = String(req.customer._id);
  if (!videoUrl || !salonId)
    return res.status(400).json({ success: false, message: "videoUrl and salonId required" });
  const ReelLike = require("../models/ReelLike");
  const existing = await ReelLike.findOne({ videoUrl, customerId });
  if (existing) {
    await existing.deleteOne();
    const count = await ReelLike.countDocuments({ videoUrl });
    return res.json({ success: true, liked: false, count });
  }
  await ReelLike.create({ videoUrl, salonId, customerId });
  const count = await ReelLike.countDocuments({ videoUrl });
  res.json({ success: true, liked: true, count });
}));

// GET /public/reels/likes?videoUrl=... — get like count + whether fingerprint liked it
router.get("/public/reels/likes", asyncHandler(async (req, res) => {
  const { videoUrl, fingerprint } = req.query;
  if (!videoUrl) return res.status(400).json({ success: false, message: "videoUrl required" });
  const ReelLike = require("../models/ReelLike");
  const [count, liked] = await Promise.all([
    ReelLike.countDocuments({ videoUrl }),
    fingerprint ? ReelLike.exists({ videoUrl, fingerprint }) : Promise.resolve(false),
  ]);
  res.json({ success: true, count, liked: !!liked });
}));

// GET /owner/reels/analytics — owner sees likes + comments per reel video
router.get("/owner/reels/analytics", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] })
    .select('reelVideos name').lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const ReelLike    = require("../models/ReelLike");
  const ReelComment = require("../models/ReelComment");

  const reelEntries = (salon.reelVideos || []).map((rv) => {
    const u = reelEntryUrl(rv);
    const cats = typeof rv === 'string' ? [] : (rv?.categories || []);
    return { url: u, categories: cats };
  }).filter((e) => e.url);

  const ReelView = require("../models/ReelView");
  const videoUrls = reelEntries.map((rv) => rv.url);

  // Batch fetch all counts
  const [likesAgg, viewsAgg, commentsAgg] = await Promise.all([
    ReelLike.aggregate([
      { $match: { videoUrl: { $in: videoUrls } } },
      { $group: { _id: '$videoUrl', count: { $sum: 1 } } },
    ]),
    ReelView.aggregate([
      { $match: { videoUrl: { $in: videoUrls } } },
      { $group: { _id: '$videoUrl', count: { $sum: 1 } } },
    ]),
    ReelComment.aggregate([
      { $match: { videoUrl: { $in: videoUrls } } },
      { $group: { _id: '$videoUrl', count: { $sum: 1 } } },
    ]),
  ]);

  const likeMap    = Object.fromEntries(likesAgg.map(d => [d._id, d.count]));
  const viewMap    = Object.fromEntries(viewsAgg.map(d => [d._id, d.count]));
  const commentMap = Object.fromEntries(commentsAgg.map(d => [d._id, d.count]));

  // Recent comments per video (fetch once, group by videoUrl)
  const allRecentComments = await ReelComment.find({ videoUrl: { $in: videoUrls } })
    .sort({ createdAt: -1 }).limit(50).lean();
  const recentByUrl = {};
  allRecentComments.forEach(c => {
    if (!recentByUrl[c.videoUrl]) recentByUrl[c.videoUrl] = [];
    if (recentByUrl[c.videoUrl].length < 5) recentByUrl[c.videoUrl].push(c);
  });

  const results = reelEntries.map(rv => ({
    videoUrl:       rv.url,
    categories:     rv.categories || [],
    likeCount:      likeMap[rv.url]    || 0,
    viewCount:      viewMap[rv.url]    || 0,
    commentCount:   commentMap[rv.url] || 0,
    recentComments: recentByUrl[rv.url] || [],
  }));

  res.json({ success: true, data: results });
}));

// POST /owner/reels/comments/:commentId/reply — owner replies to a customer comment
router.post("/owner/reels/comments/:commentId/reply", authenticateOwner, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, message: "text is required" });

  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] })
    .select('name').lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const ReelComment = require("../models/ReelComment");
  const comment = await ReelComment.findById(commentId);
  if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

  const reply = { ownerName: salon.name, text: text.trim().slice(0, 500), createdAt: new Date() };
  comment.replies.push(reply);
  await comment.save();

  const savedReply = comment.replies[comment.replies.length - 1];
  res.status(201).json({ success: true, data: savedReply });
}));

// GET /public/salons/:salonId/booked-slots?date=YYYY-MM-DD&duration=N[&barberId=ID]
// If barberId is supplied, blocked slots are calculated per that barber only (not salon-wide).
router.get("/public/salons/:salonId/booked-slots", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const mongoose = require("mongoose");
  const { date, duration, barberId } = req.query;
  if (!date) return res.status(400).json({ success: false, message: "date is required" });
  if (barberId && !mongoose.isValidObjectId(barberId)) {
    return res.status(400).json({ success: false, message: "Invalid barberId" });
  }

  const serviceDuration = Math.max(5, parseInt(duration) || 30);

  const Booking = require("../models/Booking");

  const timeToMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const minutesToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  // Get salon working hours for the selected day
  const salon = await Business.findById(req.params.salonId).select("workingHours bookingMode").lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  // Parse date at local noon to avoid UTC midnight flipping the day
  const dayName  = DAY_NAMES[new Date(date + "T12:00:00").getDay()];
  let dayHours = salon.workingHours?.[dayName];

  // Check if this date is a holiday / closed date
  const isHoliday = (salon.workingHours?.holidays || []).some(h => {
    const hDate = new Date(h.date);
    return hDate.toISOString().slice(0, 10) === date;
  });
  if (isHoliday) {
    return res.json({ success: true, data: { slots: [], blockedSlots: [], closedDay: true, reason: "holiday" } });
  }

  // Salon is closed on this day — but if no working hours configured at all, use defaults (9am-8pm)
  if (dayHours?.isClosed) {
    return res.json({ success: true, data: { slots: [], blockedSlots: [], closedDay: true } });
  }
  if (!dayHours) {
    dayHours = { open: '09:00', close: '20:00', isClosed: false };
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

  // Fetch existing bookings for this day — scoped to a specific barber if barberId provided
  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd   = new Date(date + "T23:59:59.999Z");

  const bookingQuery = {
    salonId: req.params.salonId,
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ["pending", "confirmed", "in_progress"] },
  };
  // When a specific barber is chosen, only block slots where THAT barber is busy
  if (barberId && mongoose.isValidObjectId(barberId)) {
    bookingQuery.barberId = new mongoose.Types.ObjectId(barberId);
  }

  const bookings = await Booking.find(bookingQuery)
    .select("appointmentTime estimatedDuration").lean();

  const bookingMode = salon.bookingMode || "flexible";

  // ── SEQUENTIAL mode: return only the next available slot ──
  if (bookingMode === "sequential") {
    // Current IST time in minutes (to skip past bookings that haven't auto-completed yet)
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().slice(0, 10);
    const nowMinutes = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
    const isToday = date === todayIST;

    // Find the minute at which the last ACTIVE (not yet finished) booking ends
    let nextSlotMin = openMin;
    for (const b of bookings) {
      if (!b.appointmentTime) continue;
      const bookEnd = timeToMinutes(b.appointmentTime) + (b.estimatedDuration || 30);
      // Skip bookings whose slot has already passed today — they should have been
      // auto-completed but haven't yet; don't let them block the sequential chain
      if (isToday && bookEnd <= nowMinutes) continue;
      if (bookEnd > nextSlotMin) nextSlotMin = bookEnd;
    }
    // For today, the next slot must be at least 5 min in the future
    if (isToday) nextSlotMin = Math.max(nextSlotMin, nowMinutes + 5);

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

// GET /public/salons/:salonId/next-available — first available slot today + next 2 days
router.get("/public/salons/:salonId/next-available", validateObjectId("salonId"), asyncHandler(async (req, res) => {
  const salon = await Business.findById(req.params.salonId).select("workingHours").lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const timeToMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const minToTime = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const slotDuration = 30;

  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const nowMin = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000 + dayOffset * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = DAY_NAMES[d.getUTCDay()];
    const dayHours = salon.workingHours?.[dayName];
    if (!dayHours || dayHours.isClosed) continue;

    const isHoliday = (salon.workingHours?.holidays || []).some(h =>
      new Date(h.date).toISOString().slice(0, 10) === dateStr
    );
    if (isHoliday) continue;

    const openMin  = timeToMin(dayHours.open  || "09:00");
    const closeMin = timeToMin(dayHours.close || "18:00");

    const dayStart = new Date(dateStr + "T00:00:00.000Z");
    const dayEnd   = new Date(dateStr + "T23:59:59.999Z");
    const bookings = await Booking.find({
      salonId: req.params.salonId,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["pending", "confirmed", "in_progress"] },
    }).select("appointmentTime estimatedDuration").lean();

    const blocked = new Set();
    const allSlots = [];
    for (let t = openMin; t + slotDuration <= closeMin; t += slotDuration) allSlots.push(t);
    for (const slot of allSlots) {
      const slotEnd = slot + slotDuration;
      for (const b of bookings) {
        const bStart = timeToMin(b.appointmentTime);
        const bEnd   = bStart + (b.estimatedDuration || 30);
        if (slot < bEnd && bStart < slotEnd) { blocked.add(slot); break; }
      }
    }

    const minStart = dayOffset === 0 ? Math.max(openMin, nowMin + 5) : openMin;
    const available = allSlots.filter(t => t >= minStart && !blocked.has(t));
    if (available.length > 0) {
      const label = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : dateStr;
      return res.json({ success: true, data: { date: dateStr, time: minToTime(available[0]), label, available: true } });
    }
  }

  res.json({ success: true, data: { available: false } });
}));

/* =====================================================
   COUPON VALIDATION ROUTE
===================================================== */

// POST /customer/coupons/validate
router.post("/customer/coupons/validate", authenticateCustomer, asyncHandler(async (req, res) => {
  const Coupon = require("../models/Coupon");
  const { code, salonId, totalAmount } = req.body;
  if (!code) return res.status(400).json({ success: false, message: "Coupon code is required" });

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true, deletedAt: null });
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

router.post("/customer/auth/firebase-login",
  rateLimiter(10, 900000),
  asyncHandler(customerAuthController.firebaseLogin)
);

router.post("/customer/auth/firebase-auth",
  rateLimiter(10, 900000),
  asyncHandler(customerAuthController.firebaseAuth)
);

router.post("/customer/auth/firebase-reset-password",
  rateLimiter(5, 900000),
  asyncHandler(customerAuthController.firebaseResetPassword)
);

router.post("/customer/auth/login",
  rateLimiter(10, 900000),
  asyncHandler(customerAuthController.loginWithPhone)
);

router.post("/customer/auth/forgot-password/send-otp",
  rateLimiter(5, 900000),
  asyncHandler(customerAuthController.forgotPasswordSendOTP)
);

router.post("/customer/auth/forgot-password/reset",
  rateLimiter(5, 900000),
  asyncHandler(customerAuthController.forgotPasswordReset)
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

router.delete("/customer/auth/delete-account",
  authenticateCustomer,
  asyncHandler(customerAuthController.deleteAccount)
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
   CUSTOMER PUSH TOKEN
===================================================== */

// POST /customer/push-token — save expo push token
router.post("/customer/push-token", authenticateCustomer, asyncHandler(async (req, res) => {
  const { pushToken, latitude, longitude } = req.body;
  if (!pushToken) return res.status(400).json({ success: false, message: "pushToken is required" });
  const Customer = require("../models/Customer");
  const update = { pushToken };
  if (latitude != null && longitude != null) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      update.lastLocation = { type: 'Point', coordinates: [lng, lat] };
      update.lastLocationAt = new Date();
    }
  }
  await Customer.findByIdAndUpdate(req.customer._id, update);
  res.json({ success: true });
}));

/* =====================================================
   FEEDBACK & BUG REPORTS
===================================================== */
const feedbackController = require("../controllers/feedbackController");

router.post("/customer/feedback", authenticateCustomer, multerUpload.single("screenshot"), asyncHandler(feedbackController.submitFeedback));
router.get("/customer/feedback", authenticateCustomer, asyncHandler(feedbackController.getMyFeedback));
router.patch("/customer/feedback/:id/reopen", authenticateCustomer, asyncHandler(feedbackController.reopenFeedback));

router.post("/owner/feedback", authenticateOwner, multerUpload.single("screenshot"), asyncHandler(feedbackController.submitFeedback));
router.get("/owner/feedback", authenticateOwner, asyncHandler(feedbackController.getMyFeedback));
router.patch("/owner/feedback/:id/reopen", authenticateOwner, asyncHandler(feedbackController.reopenFeedback));

router.get("/admin/feedback", authenticateAdmin, asyncHandler(feedbackController.getAllFeedback));
router.patch("/admin/feedback/:id", authenticateAdmin, asyncHandler(feedbackController.updateFeedbackStatus));

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
  await Business.findByIdAndUpdate(booking.salonId, { averageRating: Math.round(avg * 10) / 10, totalReviews: allReviews.length });

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
   CUSTOMER FOLLOW ROUTES
===================================================== */

// POST /customer/salons/:salonId/follow — toggle follow
router.post("/customer/salons/:salonId/follow",
  authenticateCustomer,
  validateObjectId("salonId"),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    const salonId = req.params.salonId;
    const isFollowing = customer.followedSalons.some(id => id.toString() === salonId);

    if (isFollowing) {
      customer.followedSalons = customer.followedSalons.filter(id => id.toString() !== salonId);
      await customer.save();
      const updatedBiz = await Business.findByIdAndUpdate(salonId, { $inc: { followersCount: -1 } }, { new: true });
      return res.json({ success: true, following: false, followersCount: updatedBiz?.followersCount ?? 0, message: "Unfollowed" });
    }

    customer.followedSalons.push(salonId);
    await customer.save();
    const updated = await Business.findByIdAndUpdate(salonId, { $inc: { followersCount: 1 } }, { new: true });
    res.json({ success: true, following: true, followersCount: updated.followersCount, message: "Followed" });
  })
);

// GET /customer/salons/:salonId/follow-status — check if following
router.get("/customer/salons/:salonId/follow-status",
  authenticateCustomer,
  validateObjectId("salonId"),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.customer._id).select("followedSalons");
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    const following = customer.followedSalons.some(id => id.toString() === req.params.salonId);
    res.json({ success: true, following });
  })
);

/* =====================================================
   OWNER AUTH ROUTES
===================================================== */

router.post(
  "/owner/auth/firebase-register",
  rateLimiter(5, 900000),
  asyncHandler(ownerAuthController.firebaseRegister)
);

router.post(
  "/owner/auth/firebase-login",
  rateLimiter(10, 900000),
  asyncHandler(ownerAuthController.firebaseLogin)
);

// ── STAFF login — phone OTP, auto-detects role, auto-activates on first login ──
router.post("/staff/auth/firebase-login", rateLimiter(10, 900000), asyncHandler(async (req, res) => {
  const Barber = require('../models/Barber');
  const { firebaseToken, phone: clientPhone } = req.body;
  if (!firebaseToken) return res.status(400).json(formatErrorResponse('Firebase token is required', 400));

  const { verifyFirebaseToken } = require('../config/firebaseAdmin');
  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseToken(firebaseToken);
  } catch {
    return res.status(401).json(formatErrorResponse('Invalid or expired Firebase token', 401));
  }

  const rawPhone = (firebaseUser.phone || '').trim();
  const digits   = rawPhone.replace(/\D/g, '');
  const tenDigit = digits.length >= 10 ? digits.slice(-10) : digits;

  const variants = new Set([rawPhone, `+91${tenDigit}`, `91${tenDigit}`, tenDigit, `0${tenDigit}`]);
  if (clientPhone) {
    const cd = String(clientPhone).replace(/\D/g, '');
    const ct = cd.length >= 10 ? cd.slice(-10) : cd;
    [String(clientPhone).trim(), `+91${ct}`, `91${ct}`, ct, `0${ct}`].forEach(v => variants.add(v));
  }

  // Primary lookup by phone variants — $ne:true catches records where field is absent
  let barber = await Barber.findOne({ phone: { $in: [...variants] }, isOwner: { $ne: true } });
  if (!barber) {
    // Fallback: last-10-digits match scoped to non-owner records
    const all = await Barber.find({ isOwner: { $ne: true } }).select('phone status isActive salonId staffRole name').lean();
    const matched = all.find(b => {
      if (!b.phone) return false;
      const d = String(b.phone).replace(/\D/g, '');
      return d.length >= 10 && d.slice(-10) === tenDigit;
    });
    if (matched) barber = await Barber.findById(matched._id);
  }

  if (!barber) {
    return res.status(404).json(formatErrorResponse(
      'No staff account found for this number. Ask your salon owner to add you as a team member.', 404
    ));
  }

  if (barber.status === 'blocked' || !barber.isActive) {
    return res.status(403).json(formatErrorResponse('Your account has been deactivated. Contact your salon owner.', 403));
  }

  const now = new Date();
  const isFirstLogin = barber.status === 'invited';

  const token = jwt.sign(
    { _id: barber._id, salonId: barber.salonId, role: 'staff', staffRole: barber.staffRole },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  const refreshToken = jwt.sign(
    { _id: barber._id, type: 'staff_refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );

  // Use findByIdAndUpdate to avoid full-document Mongoose validation on legacy records
  const updateFields = {
    lastLogin:     now,
    firebaseUid:   firebaseUser.uid,
    refreshTokens: [...(barber.refreshTokens || []).slice(-4), { token: refreshToken }],
    ...(isFirstLogin ? { status: 'active', joinedAt: now } : {}),
  };

  try {
    await Barber.findByIdAndUpdate(barber._id, { $set: updateFields }, { runValidators: false });
  } catch (updateErr) {
    if (updateErr.code === 11000) {
      // Another record has this Firebase UID — clear it and retry
      try {
        await Barber.updateOne({ firebaseUid: firebaseUser.uid, _id: { $ne: barber._id } }, { $unset: { firebaseUid: 1 } });
        await Barber.findByIdAndUpdate(barber._id, { $set: updateFields }, { runValidators: false });
      } catch (retryErr) {
        console.error('[staff auth] update retry error:', retryErr.message);
        return res.status(500).json(formatErrorResponse('Failed to update login. Please try again.', 500));
      }
    } else {
      console.error('[staff auth] update error:', updateErr.message, updateErr.code);
      return res.status(500).json(formatErrorResponse('Failed to update login. Please try again.', 500));
    }
  }

  clearAuthCookies(res); // clear any residual owner session cookies
  res.json(formatSuccessResponse({
    token,
    refreshToken,
    isFirstLogin,
    staff: {
      _id:          barber._id,
      name:         barber.name,
      phone:        barber.phone,
      profilePhoto: barber.profilePhoto,
      staffRole:    barber.staffRole,
      salonId:      barber.salonId,
      status:       barber.status,
      role:         'staff',
    },
  }, 'Staff login successful'));
}));

// ── GET /staff/auth/me ──
router.get("/staff/auth/me", asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json(formatErrorResponse('Unauthorized', 401));
  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    if (decoded.role !== 'staff') return res.status(403).json(formatErrorResponse('Forbidden', 403));
    const barber = await Barber.findById(decoded._id).select('-refreshTokens -firebaseUid').lean();
    if (!barber) return res.status(404).json(formatErrorResponse('Staff not found', 404));
    res.json(formatSuccessResponse({ ...barber, role: 'staff' }));
  } catch {
    res.status(401).json(formatErrorResponse('Invalid token', 401));
  }
}));

// ── GET /staff/salon — returns the salon the staff member belongs to ──
router.get("/staff/salon", asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json(formatErrorResponse('Unauthorized', 401));
  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    if (decoded.role !== 'staff') return res.status(403).json(formatErrorResponse('Forbidden', 403));
    if (!decoded.salonId) return res.status(404).json(formatErrorResponse('No salon linked to this staff account', 404));
    const salon = await Business.findById(decoded.salonId)
      .populate('services')
      .populate('barbers')
      .lean();
    if (!salon) return res.status(404).json(formatErrorResponse('Salon not found', 404));
    res.json(formatSuccessResponse(salon));
  } catch {
    res.status(401).json(formatErrorResponse('Invalid token', 401));
  }
}));

// ── GET /staff/bookings/today ──
router.get("/staff/bookings/today", asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json(formatErrorResponse('Unauthorized', 401));
  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    if (decoded.role !== 'staff') return res.status(403).json(formatErrorResponse('Forbidden', 403));

    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      barberId:        decoded._id,
      appointmentDate: { $gte: todayStart, $lte: todayEnd },
      status:          { $ne: 'cancelled' },
    }).sort({ appointmentTime: 1 }).lean();

    res.json(formatSuccessResponse({ bookings, total: bookings.length }));
  } catch {
    res.status(401).json(formatErrorResponse('Invalid token', 401));
  }
}));

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
  "/owner/auth/delete-account",
  asyncHandler(ownerAuthController.deleteAccount)
);

/* =====================================================
   OWNER ONBOARDING DRAFT ROUTES
===================================================== */

// GET /owner/onboarding/draft — load saved draft
router.get("/owner/onboarding/draft", authenticateOwner, asyncHandler(async (req, res) => {
  const owner = await Owner.findById(req.owner._id).select("onboardingDraft").lean();
  res.json({ success: true, data: owner?.onboardingDraft || { currentStep: 1, data: {} } });
}));

// PUT /owner/onboarding/draft — save draft
router.put("/owner/onboarding/draft", authenticateOwner, asyncHandler(async (req, res) => {
  const { currentStep, data } = req.body;
  await Owner.updateOne(
    { _id: req.owner._id },
    { $set: { onboardingDraft: { currentStep, data, updatedAt: new Date() } } }
  );
  res.json({ success: true });
}));

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

router.post(
  "/owner/services/bulk",
  authenticateOwner,
  asyncHandler(serviceController.bulkUpsertServices)
);

router.patch(
  "/owner/services/bulk",
  authenticateOwner,
  asyncHandler(serviceController.bulkUpdateServices)
);

router.post(
  "/owner/services/upload-photo",
  authenticateOwner,
  multerUpload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const { cloudinary } = require("../config/cloudinary");
    const url = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "smart-salon/service-photos", resource_type: "image" },
        (error, result) => { if (error) reject(error); else resolve(result.secure_url); }
      );
      stream.end(req.file.buffer);
    });
    res.json({ success: true, data: { url } });
  })
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
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.json({ success: true, data: { bookings: [], total: 0, page: 1, limit: 20 } });

  const { status, date, page = 1, limit = 20, q } = req.query;
  const query = { salonId: salon._id, deletedAt: null };
  if (status && status !== "all") query.status = status;

  if (q && q.trim()) {
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    query.$or = [
      { customerName:  rx },
      { customerPhone: rx },
      { bookingId:     rx },
      { serviceName:   rx },
    ];
    // cross-date search — ignore date filter when q is set
  } else if (date) {
    query.appointmentDate = {
      $gte: new Date(date + "T00:00:00.000Z"),
      $lte: new Date(date + "T23:59:59.999Z"),
    };
  }

  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const [bookings, total] = await Promise.all([
    Booking.find(query).sort({ appointmentDate: -1, createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Booking.countDocuments(query),
  ]);

  res.json({ success: true, data: { bookings, total, page: p, limit: l } });
}));

router.post("/owner/bookings", authenticateOwner, idempotency, checkSubscription, asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
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

  // Fix 3: per-barber overlap (same logic as online path)
  const { barberId: walkInBarberId } = req.body;
  let assignedBarberId = null;
  if (walkInBarberId) {
    const Barber = require("../models/Barber");
    const barber = await Barber.findOne({ _id: walkInBarberId, salonId: salon._id, isActive: true });
    if (!barber) return res.status(404).json({ success: false, message: "Staff not found" });
    assignedBarberId = barber._id;
  } else {
    // Auto-pick least-busy active barber (or null = unassigned)
    const Barber = require("../models/Barber");
    const barbers = await Barber.find({ salonId: salon._id, isActive: true }).select('_id').lean();
    for (const b of barbers) {
      const conflict = await Booking.findOne({
        barberId: b._id,
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ["pending", "confirmed", "in_progress"] },
        appointmentTime: { $exists: true },
      }).select("appointmentTime estimatedDuration").lean();
      const newStart2 = timeToMinutes(appointmentTime);
      const newEnd2   = newStart2 + service.duration;
      if (!conflict || !overlaps(conflict, newStart2, newEnd2)) {
        assignedBarberId = b._id; break;
      }
    }
  }

  function overlaps(b, ns, ne) {
    const bs = timeToMinutes(b.appointmentTime);
    const be = bs + (b.estimatedDuration || 30);
    return ns < be && bs < ne;
  }

  if (assignedBarberId) {
    const barberBooks = await Booking.find({
      barberId: assignedBarberId,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["pending", "confirmed", "in_progress"] },
    }).select("appointmentTime estimatedDuration").lean();
    const ns = timeToMinutes(appointmentTime);
    const ne = ns + service.duration;
    if (barberBooks.some(b => overlaps(b, ns, ne))) {
      return res.status(409).json({ success: false, message: "This stylist is already booked at that time" });
    }
  }

  const booking = await Booking.create({
    isWalkIn:         true,
    salonId:          salon._id,
    salonName:        salon.name,
    serviceId:        service._id,
    serviceName:      service.name,
    services: [{ serviceId: service._id, serviceName: service.name, servicePrice: service.basePrice, duration: service.duration }],
    customerName:     customerName.trim(),
    customerPhone:    customerPhone.trim(),
    barberId:         assignedBarberId || null,
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

  // Increment monthly booking count for subscription billing
  try {
    const Owner = require("../models/Owner");
    await Owner.updateOne(
      { _id: salon.ownerId || req.owner._id },
      { $inc: { 'subscription.monthlyBookingCount': 1 } }
    );
  } catch {}

  // Fire-and-forget push to owner
  try {
    const { sendExpoPush } = require("../utils/pushNotification");
    const Owner = require("../models/Owner");
    const owner = await Owner.findById(salon.ownerId).select("pushToken").lean();
    if (owner?.pushToken) {
      sendExpoPush(
        owner.pushToken,
        "🚶 Walk-in Booking Added",
        `${customerName} — ${service.name} at ${appointmentTime}`,
        { bookingId: booking._id.toString(), type: "walk_in_booking" },
        { channelId: "new_booking" }
      ).catch(() => {});
    }
  } catch {}

  res.status(201).json({ success: true, data: booking });
}));

router.put("/owner/bookings/:bookingId", authenticateOwner, validateObjectId("bookingId"), auditLogger('booking.status_changed', 'Booking', (req) => req.params.bookingId), asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: salon._id });
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  const { status, cancellationReason } = req.body;
  if (!["confirmed", "completed", "cancelled", "in_progress", "no_show"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  // Fix 4: completed must come from in_progress + 50% duration elapsed
  if (status === "completed") {
    if (booking.status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Booking must be in_progress before marking complete" });
    }
    if (booking.startedAt && booking.estimatedDuration) {
      const elapsedMin = (Date.now() - new Date(booking.startedAt).getTime()) / 60000;
      const required   = booking.estimatedDuration * 0.5;
      if (elapsedMin < required) {
        return res.status(400).json({ success: false, message: `Service must be at least 50% done. Wait ${Math.ceil(required - elapsedMin)} more minute(s).` });
      }
    }
  }

  // Fix 1: no_show — must come from pending/confirmed; increment customer noShowCount; auto-ban at 3
  if (status === "no_show") {
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Can only mark as no-show from pending or confirmed" });
    }
    if (booking.customerId) {
      const Customer = require("../models/Customer");
      const cust = await Customer.findById(booking.customerId);
      if (cust) {
        cust.noShowCount = (cust.noShowCount || 0) + 1;
        if (cust.noShowCount >= 3 && !cust.isBanned) {
          cust.isBanned  = true;
          cust.banReason = "Auto-banned: 3 or more no-shows";
          cust.bannedAt  = new Date();
        }
        await cust.save();
      }
    }
    booking.noShowMarkedAt = new Date();
  }

  booking.status = status;
  if (status === "confirmed")   booking.confirmedAt  = new Date();
  if (status === "completed")   booking.completedAt  = new Date();
  if (status === "cancelled")   { booking.cancelledAt = new Date(); if (cancellationReason) booking.cancellationReason = cancellationReason; }
  if (status === "in_progress") booking.startedAt    = new Date();
  await booking.save();

  // Recalculate live tentative timing for this barber's remaining queue today
  if (booking.barberId && ["in_progress", "completed", "cancelled", "no_show"].includes(status)) {
    const { recalcQueueTiming } = require("../utils/queueTiming");
    const dateStr = booking.appointmentDate.toISOString().slice(0, 10);
    recalcQueueTiming(booking.salonId, booking.barberId, dateStr, req.app.get("io")).catch(err =>
      console.error('recalcQueueTiming error:', err.message)
    );
  }

  // StyleAI attribution — fire on booking completion to record converted_booking event
  if (status === "completed" && booking.customerId) {
    const hairstyleAttr = require('../utils/hairstyleAttribution');
    const svcNames = (booking.services || []).map(s => s.serviceName || s.name || '').filter(Boolean);
    hairstyleAttr.checkAndFireAttribution(booking.customerId, booking._id, svcNames).catch(() => {});
  }

  // Fix 11: broadcast to all owner tabs + customer room
  const io = req.app.get("io");
  if (io) {
    const updatePayload = { bookingId: booking._id, status };
    if (booking.customerId) io.to(`customer-${booking.customerId}`).emit("booking-status-changed", updatePayload);
    io.to(`salon-${salon._id}`).emit("booking-updated", { ...updatePayload, booking: booking.toObject() });
  }

  // Send push notification to customer on all status changes
  if (booking.customerId) {
    try {
      const Customer = require("../models/Customer");
      const customer = await Customer.findById(booking.customerId).select("pushToken");
      if (customer?.pushToken) {
        const { Expo } = require("expo-server-sdk");
        const expo = new Expo();
        if (Expo.isExpoPushToken(customer.pushToken)) {
          const pushMap = {
            confirmed: {
              title: "Booking Confirmed ✅",
              body: `Your appointment at ${salon.name} is confirmed. See you soon!`,
              type: "booking_confirmed",
            },
            in_progress: {
              title: "Your Service Has Started 💈",
              body: `Your appointment at ${salon.name} is now in progress.`,
              type: "booking_in_progress",
            },
            cancelled: {
              title: "Booking Cancelled ❌",
              body: `Your appointment at ${salon.name} has been cancelled.`,
              type: "booking_cancelled",
            },
            completed: {
              title: "How was your experience? ⭐",
              body: `Your service at ${salon.name} is complete. Tap to leave a review!`,
              type: "review_prompt",
            },
            no_show: {
              title: "Booking Marked as No-Show",
              body: `Your appointment at ${salon.name} was marked as no-show. Please contact the salon for assistance.`,
              type: "booking_no_show",
            },
          };
          const push = pushMap[status];
          if (push) {
            await expo.sendPushNotificationsAsync([{
              to: customer.pushToken,
              sound: "default",
              title: push.title,
              body: push.body,
              data: { bookingId: booking._id.toString(), type: push.type },
            }]);
          }
        }
      }
    } catch (e) { /* non-critical, ignore push errors */ }
  }

  res.json({ success: true, data: booking });
}));

/* =====================================================
   OWNER REVIEWS
===================================================== */

// GET /owner/reviews — get all published reviews for this owner's salon
router.get("/owner/reviews", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const reviews = await Review.find({ salonId: salon._id, isPublished: true, isHidden: false })
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: { reviews } });
}));

// PUT /owner/reviews/:reviewId/reply — add/update owner reply on a review
router.put("/owner/reviews/:reviewId/reply", authenticateOwner, validateObjectId("reviewId"), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
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

router.get(
  "/owner/analytics/insights",
  authenticateOwner,
  asyncHandler(barberController.getSmartInsights)
);

router.get(
  "/owner/analytics/smart-pricing",
  authenticateOwner,
  asyncHandler(barberController.getSmartPricing)
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

router.get("/admin/diagnose-phone/:phone", authenticateAdmin, asyncHandler(async (req, res) => {
  const Owner = require("../models/Owner");
  const raw = req.params.phone;
  const digits = raw.replace(/\D/g, '');
  const tenDigit = digits.length >= 10 ? digits.slice(-10) : digits;

  const owner = await Owner.findOne({ phone: { $regex: tenDigit + '$' } }).select('_id phone email name businessId');
  const business = await Business.findOne({ phone: { $regex: tenDigit + '$' } }).select('_id phone name ownerId');
  const ownerViaBusiness = business?.ownerId
    ? await Owner.findById(business.ownerId).select('_id phone email name')
    : null;

  res.json({ success: true, data: { input: raw, tenDigit, owner, business, ownerViaBusiness } });
}));
router.get("/admin/salons/all", authenticateAdmin, asyncHandler(adminManagementController.getAllSalons));
router.get("/admin/salons/filter-options", authenticateAdmin, asyncHandler(adminManagementController.getFilterOptions));
router.get("/admin/salons/:salonId/detail", authenticateAdmin, asyncHandler(adminManagementController.getSalonDetail));
router.get("/admin/salons/:salonId/media", authenticateAdmin, asyncHandler(adminManagementController.getBusinessMedia));
router.put("/admin/salons/:salonId/toggle", authenticateAdmin, asyncHandler(adminManagementController.toggleSalonActive));
router.get("/admin/bookings", authenticateAdmin, asyncHandler(adminManagementController.getAllBookings));
router.get("/admin/customers", authenticateAdmin, asyncHandler(adminManagementController.getAllCustomers));
router.get("/admin/analytics", authenticateAdmin, asyncHandler(adminManagementController.getAnalytics));

/* =====================================================
   ADMIN SUBSCRIPTION ROUTES
===================================================== */

router.get("/admin/subscriptions/stats",    authenticateAdmin, asyncHandler(subscriptionAdminController.getSubscriptionStats));
router.get("/admin/subscriptions/users",    authenticateAdmin, asyncHandler(subscriptionAdminController.getSubscriptionUsers));
router.get("/admin/subscriptions/logs",     authenticateAdmin, asyncHandler(subscriptionAdminController.getSubscriptionLogs));
router.get("/admin/subscriptions/invoices", authenticateAdmin, asyncHandler(subscriptionAdminController.getSubscriptionInvoices));

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
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
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
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
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
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] })
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
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
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
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
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
  const rawSalons = await Business.find({
    _id: { $in: salonIds },
    isApproved: true,
    isActive: true,
  })
    .select("name address city locality phone photos logo coverPhoto averageRating totalReviews totalBookings workingHours category servedGender offeredCategories location ownerId")
    .populate("ownerId", "profilePhoto")
    .lean();

  // Attach matched service names and ownerPhoto to each salon
  const salonsWithMatch = rawSalons.map(s => ({
    ...s,
    ownerPhoto: s.ownerId?.profilePhoto || null,
    ownerId: undefined,
    offeredCategoryNames: (s.offeredCategories || []).map(c => c.name),
    offeredCategories: undefined,
    matchedServices: salonIdMap[s._id.toString()] || [],
  }));

  res.json({ success: true, data: { salons: salonsWithMatch, matchedService: q } });
}));

/* =====================================================
   PUSH TOKEN ROUTES
===================================================== */

// POST /owner/referral/apply — apply a user referral code
router.post("/owner/referral/apply", authenticateOwner, asyncHandler(async (req, res) => {
  const Owner    = require("../models/Owner");
  const Customer = require("../models/Customer");

  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ success: false, message: "Referral code is required" });
  }

  const trimmed = code.trim().toUpperCase();
  if (!/^MSB[0-9A-Z]{6}$/.test(trimmed)) {
    return res.status(400).json({ success: false, message: "Invalid referral code format" });
  }

  // Check if owner already applied a code
  const owner = await Owner.findById(req.owner._id).select("referredBy referralCode phone").lean();
  if (owner.referredBy) {
    return res.status(400).json({ success: false, message: "You have already applied a referral code" });
  }

  // Extract 6-char suffix and find matching customer by phone
  const suffix = trimmed.slice(3); // last 6 digits of phone
  const customers = await Customer.find({ phone: { $exists: true, $ne: null } })
    .select("phone _id name").lean();

  const matched = customers.find(c => {
    const digits = (c.phone || "").replace(/\D/g, "");
    return digits.slice(-6).toUpperCase() === suffix;
  });

  if (!matched) {
    return res.status(404).json({ success: false, message: "Referral code not found. Please check and try again." });
  }

  // Prevent self-referral (owner phone matches customer phone)
  const ownerDigits = (owner.phone || "").replace(/\D/g, "").slice(-6);
  if (ownerDigits === suffix) {
    return res.status(400).json({ success: false, message: "You cannot use your own referral code" });
  }

  await Owner.findByIdAndUpdate(req.owner._id, {
    referredBy: matched._id,
    referralCode: trimmed,
    referralAppliedAt: new Date(),
  });

  res.json({ success: true, message: `Referral code applied successfully! Referred by ${matched.name || "a user"}.` });
}));

// GET /owner/referral/status — check if a referral code is already applied
router.get("/owner/referral/status", authenticateOwner, asyncHandler(async (req, res) => {
  const Owner = require("../models/Owner");
  const owner = await Owner.findById(req.owner._id).select("referredBy referralCode referralAppliedAt").lean();
  res.json({
    success: true,
    data: {
      applied: !!owner.referredBy,
      code: owner.referralCode || null,
      appliedAt: owner.referralAppliedAt || null,
    },
  });
}));

// POST /owner/push-token — save/update owner's Expo push token
router.post("/owner/push-token", authenticateOwner, asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: "token is required" });
  const Owner = require("../models/Owner");
  await Owner.findByIdAndUpdate(req.owner._id, { pushToken: token });
  res.json({ success: true });
}));

// POST /customer/push-token — save/update customer's Expo push token
router.post("/customer/push-token", authenticateCustomer, asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: "token is required" });
  await Customer.findByIdAndUpdate(req.customer._id, { pushToken: token });
  res.json({ success: true });
}));

/* =====================================================
   OWNER GALLERY ROUTES
===================================================== */

// GET /owner/gallery/upload-signature
router.get("/owner/gallery/upload-signature", authenticateOwner, asyncHandler(async (req, res) => {
  const { resource_type = 'image' } = req.query;
  const { cloudinary: cl } = require("../config/cloudinary");
  const timestamp = Math.round(Date.now() / 1000);
  const folder = resource_type === 'video' ? 'smart-salon/gallery-videos' : 'smart-salon/gallery';
  // Only sign params that Cloudinary includes in their server-side verification.
  // max_bytes is NOT a recognized signed param — including it causes "Invalid Signature".
  // Size limits are enforced client-side in UploadModal (100 MB video / 10 MB image).
  const paramsToSign = { folder, timestamp };
  const signature = cl.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
  res.json({
    success: true,
    data: {
      signature, timestamp,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      folder,     resource_type,
    },
  });
}));

// POST /owner/gallery/register-photo — save a Cloudinary photo URL after direct upload
router.post("/owner/gallery/register-photo", authenticateOwner, asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url || !url.startsWith('https://'))
    return res.status(400).json({ success: false, message: "Valid Cloudinary url required" });
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  salon.photos.push({ url, caption: '', tags: [], isCover: false });
  await salon.save({ validateModifiedOnly: true });
  await BusinessMedia.create({ businessId: salon._id, type: 'photo', url, publicId: '' });
  const i = salon.photos.length - 1;
  res.status(201).json({ success: true, data: { _id: `p_${i}`, url, caption: '', tags: [], isCover: false, type: 'image' } });
}));

// POST /owner/gallery/register-video — save a Cloudinary video URL after direct upload.
// Automatically adds the video to reelVideos (public feed) with the supplied categories.
router.post("/owner/gallery/register-video", authenticateOwner, asyncHandler(async (req, res) => {
  const { url: rawUrl, categories, targetGender } = req.body;
  const url = String(rawUrl || '')
    .trim()
    .split('#')[0]
    .trim();
  if (!url || !url.startsWith('https://'))
    return res.status(400).json({ success: false, message: "Valid Cloudinary url required" });
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  // Save to gallery videos
  if (!salon.videos) salon.videos = [];
  salon.videos.push({ url, caption: '', tags: [] });

  // Auto-add to public reelVideos with the supplied categories and targetGender
  if (!salon.reelVideos) salon.reelVideos = [];
  const reelCats = Array.isArray(categories)
    ? categories.filter((c) => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim())
    : [];
  const genderVal = ['male', 'female', 'both'].includes(targetGender) ? targetGender : 'both';
  const existingReelIdx = salon.reelVideos.findIndex((rv) => galleryUrlKey(reelEntryUrl(rv)) === galleryUrlKey(url));
  if (existingReelIdx === -1) {
    salon.reelVideos.push({ url, categories: reelCats, targetGender: genderVal, createdAt: new Date() });
  } else {
    salon.reelVideos[existingReelIdx] = { url, categories: reelCats, targetGender: genderVal, createdAt: new Date() };
    salon.markModified('reelVideos');
  }

  await salon.save({ validateModifiedOnly: true });
  await BusinessMedia.updateOne(
    { businessId: salon._id, url },
    { $setOnInsert: { businessId: salon._id, type: 'video', url, publicId: '' } },
    { upsert: true }
  );
  const i = salon.videos.length - 1;
  res.status(201).json({ success: true, data: { _id: `v_${i}`, url, caption: '', tags: [], type: 'video', inReels: true, reelCategories: reelCats, targetGender: genderVal } });
}));

// GET /owner/gallery — return all photos + videos
router.get("/owner/gallery", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  // Heal data drift: reels visible to customers must appear in owner gallery even if
  // salon.videos was never populated, or URLs differ only by http/query (reel vs video row).
  if (!salon.videos) salon.videos = [];
  if (!salon.reelVideos) salon.reelVideos = [];
  const urlKeysInVideos = new Set(
    (salon.videos || []).map((v) => galleryUrlKey(normVideo(v).url)).filter(Boolean)
  );
  let healedVideos = false;

  // Heal: registration video (salon.videoUrl) missing from videos[] and reelVideos[]
  if (salon.videoUrl && isPresentableGalleryUrl(salon.videoUrl)) {
    const vk = galleryUrlKey(salon.videoUrl);
    if (vk && !urlKeysInVideos.has(vk)) {
      salon.videos.push({ url: salon.videoUrl, caption: '', tags: [] });
      urlKeysInVideos.add(vk);
      healedVideos = true;
    }
    const reelKeys = new Set((salon.reelVideos || []).map(rv => galleryUrlKey(reelEntryUrl(rv))).filter(Boolean));
    if (vk && !reelKeys.has(vk)) {
      salon.reelVideos.push({ url: salon.videoUrl, categories: [], targetGender: salon.servedGender === 'male' ? 'male' : salon.servedGender === 'female' ? 'female' : 'both', createdAt: new Date() });
      healedVideos = true;
    }
  }

  for (const rv of salon.reelVideos || []) {
    const u = normalizeGalleryMediaUrl(reelEntryUrl(rv));
    if (!isPresentableGalleryUrl(u)) continue;
    const k = galleryUrlKey(u);
    if (!k || urlKeysInVideos.has(k)) continue;
    salon.videos.push({ url: u, caption: '', tags: [] });
    urlKeysInVideos.add(k);
    healedVideos = true;
  }
  if (healedVideos) {
    salon.markModified('videos');
    salon.markModified('reelVideos');
    await salon.save({ validateModifiedOnly: true });
  }

  // Reel metadata by URL key (matches analytics + public reels even if video row URL string differs slightly)
  const reelMetaByKey = new Map();
  for (const rv of salon.reelVideos || []) {
    const u = reelEntryUrl(rv);
    if (!u) continue;
    const k = galleryUrlKey(u);
    const cats = typeof rv === 'string' ? [] : rv.categories || [];
    const meta = { inReels: true, reelCategories: cats };
    reelMetaByKey.set(k, meta);
    reelMetaByKey.set(u, meta);
  }

  // Omit entries with no usable URL (corrupt subdocs) but keep _id index = Mongo index for DELETE.
  const photos = (salon.photos || []).flatMap((p, i) => {
    const n = normPhoto(p);
    const u = normalizeGalleryMediaUrl(n.url);
    if (!isPresentableGalleryUrl(u)) return [];
    return [{
      _id: `p_${i}`,
      url: u,
      caption: n.caption || '',
      tags: n.tags || [],
      isCover: n.isCover || false,
      type: 'image',
    }];
  });
  const videos = (salon.videos || []).flatMap((v, i) => {
    const n = normVideo(v);
    const u = normalizeGalleryMediaUrl(n.url);
    if (!isPresentableGalleryUrl(u)) return [];
    const k = galleryUrlKey(u);
    const rv = reelMetaByKey.get(k) || reelMetaByKey.get(u) || { inReels: false, reelCategories: [] };
    return [{
      _id: `v_${i}`,
      url: u,
      caption: n.caption || '',
      tags: n.tags || [],
      type: 'video',
      inReels: rv.inReels,
      reelCategories: rv.reelCategories || [],
    }];
  });

  res.json({ success: true, data: [...photos, ...videos] });
}));

// PUT /owner/gallery/reel-toggle — add/remove a video from reelVideos, optionally update categories/targetGender
// MUST be before /owner/gallery/:mediaId so Express doesn't swallow "reel-toggle" as a mediaId param
router.put("/owner/gallery/reel-toggle", authenticateOwner, asyncHandler(async (req, res) => {
  const { videoUrl, categories, targetGender } = req.body;
  if (!videoUrl) return res.status(400).json({ success: false, message: "videoUrl required" });
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  salon.reelVideos = (salon.reelVideos || []).map(rv =>
    typeof rv === 'string' ? { url: rv, categories: [], targetGender: 'both' } : rv
  );

  const targetKey = galleryUrlKey(videoUrl);
  const idx = salon.reelVideos.findIndex((rv) => galleryUrlKey(reelEntryUrl(rv)) === targetKey);
  let inReels;
  const catList = Array.isArray(categories)
    ? categories.filter((c) => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim())
    : [];
  const genderVal = ['male', 'female', 'both'].includes(targetGender) ? targetGender : 'both';
  if (idx === -1) {
    salon.reelVideos.push({ url: videoUrl, categories: catList, targetGender: genderVal });
    inReels = true;
  } else if (categories !== undefined || targetGender !== undefined) {
    if (categories !== undefined) salon.reelVideos[idx].categories = catList;
    if (targetGender !== undefined) salon.reelVideos[idx].targetGender = genderVal;
    inReels = true;
  } else {
    salon.reelVideos.splice(idx, 1);
    inReels = false;
  }
  salon.markModified('reelVideos');
  await salon.save({ validateModifiedOnly: true });
  const match = salon.reelVideos.find((rv) => galleryUrlKey(reelEntryUrl(rv)) === targetKey);
  res.json({ success: true, inReels, reelCategories: inReels ? (match?.categories || []) : [], targetGender: inReels ? (match?.targetGender || 'both') : null });
}));

// PUT /owner/gallery/:mediaId — update caption, tags, isCover for a photo or video
router.put("/owner/gallery/:mediaId", authenticateOwner, asyncHandler(async (req, res) => {
  const mid = req.params.mediaId;
  const { caption, tags, isCover, isCtaPhoto } = req.body;
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  if (mid.startsWith('v_')) {
    const idx = parseInt(mid.slice(2), 10);
    if (isNaN(idx) || idx < 0 || idx >= (salon.videos || []).length)
      return res.status(404).json({ success: false, message: "Video not found" });
    const entry = normVideo(salon.videos[idx]);
    if (caption  !== undefined) entry.caption = caption;
    if (tags     !== undefined) entry.tags    = tags;
    salon.videos[idx] = entry;
    salon.markModified('videos');
  } else {
    const idx = mid.startsWith('p_') ? parseInt(mid.slice(2), 10) : parseInt(mid, 10);
    if (isNaN(idx) || idx < 0 || idx >= (salon.photos || []).length)
      return res.status(404).json({ success: false, message: "Photo not found" });
    const entry = normPhoto(salon.photos[idx]);
    if (caption  !== undefined) entry.caption  = caption;
    if (tags     !== undefined) entry.tags     = tags;
    if (isCover === true) {
      // clear isCover on all other photos, then set this one + update coverPhoto
      salon.photos = salon.photos.map((p, i) => {
        const n = normPhoto(p);
        n.isCover = (i === idx);
        return n;
      });
      salon.coverPhoto = salon.photos[idx]?.url || entry.url;
      salon.markModified('photos');
    } else if (isCtaPhoto === true) {
      salon.ctaPhoto = entry.url;
      salon.photos[idx] = entry;
      salon.markModified('photos');
    } else {
      salon.photos[idx] = entry;
      salon.markModified('photos');
    }
  }

  await salon.save({ validateModifiedOnly: true });
  res.json({ success: true, message: "Updated" });
}));

// POST /owner/gallery — legacy server-side photo upload (kept for fallback)
router.post("/owner/gallery", authenticateOwner, multerUpload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const { cloudinary: cloudinaryClient } = require("../config/cloudinary");
  const url = await new Promise((resolve, reject) => {
    const stream = cloudinaryClient.uploader.upload_stream(
      { folder: "smart-salon/gallery", resource_type: "image" },
      (error, result) => { if (error) reject(error); else resolve(result.secure_url); }
    );
    stream.end(req.file.buffer);
  });
  salon.photos.push({ url, caption: '', tags: [], isCover: false });
  await salon.save({ validateModifiedOnly: true });
  await BusinessMedia.create({ businessId: salon._id, type: 'photo', url, publicId: '' });
  const i = salon.photos.length - 1;
  res.status(201).json({ success: true, data: { _id: `p_${i}`, url, caption: '', tags: [], isCover: false, type: 'image' } });
}));

// POST /owner/gallery/video — legacy server-side video upload (kept for fallback)
router.post("/owner/gallery/video", authenticateOwner, multerVideoUpload.single("video"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No video uploaded" });
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const { cloudinary: cloudinaryClient } = require("../config/cloudinary");
  const url = await new Promise((resolve, reject) => {
    const stream = cloudinaryClient.uploader.upload_stream(
      { folder: "smart-salon/gallery-videos", resource_type: "video" },
      (error, result) => { if (error) reject(error); else resolve(result.secure_url); }
    );
    stream.end(req.file.buffer);
  });
  if (!salon.videos) salon.videos = [];
  salon.videos.push({ url, caption: '', tags: [] });
  await salon.save({ validateModifiedOnly: true });
  await BusinessMedia.create({ businessId: salon._id, type: 'video', url, publicId: '' });
  const i = salon.videos.length - 1;
  res.status(201).json({ success: true, data: { _id: `v_${i}`, url, caption: '', tags: [], type: 'video', inReels: false, reelCategories: [] } });
}));

// DELETE /owner/gallery/:mediaId — remove photo or video, also clean up reelVideos
router.delete("/owner/gallery/:mediaId", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const mid = req.params.mediaId;

  if (mid.startsWith('v_')) {
    const idx = parseInt(mid.slice(2), 10);
    if (isNaN(idx) || idx < 0 || idx >= (salon.videos || []).length)
      return res.status(404).json({ success: false, message: "Video not found" });
    const deletedUrl = normVideo(salon.videos[idx]).url;
    salon.videos.splice(idx, 1);
    // Also remove from reelVideos
    const delKey = galleryUrlKey(deletedUrl);
    salon.reelVideos = (salon.reelVideos || []).filter((rv) => {
      const ru = reelEntryUrl(rv);
      return galleryUrlKey(ru) !== delKey && ru !== deletedUrl;
    });
    salon.markModified('reelVideos');
  } else {
    const idx = mid.startsWith('p_') ? parseInt(mid.slice(2), 10) : parseInt(mid, 10);
    if (isNaN(idx) || idx < 0 || idx >= (salon.photos || []).length)
      return res.status(404).json({ success: false, message: "Photo not found" });
    salon.photos.splice(idx, 1);
    salon.markModified('photos');
  }

  await salon.save({ validateModifiedOnly: true });
  res.json({ success: true, message: "Media deleted" });
}));

/* =====================================================
   OWNER COUPONS ROUTES
===================================================== */

// GET /owner/coupons
router.get("/owner/coupons", authenticateOwner, asyncHandler(async (req, res) => {
  const Coupon = require("../models/Coupon");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const { page: cpPage = 1, limit: cpLimit = 50 } = req.query;
  const cpP = Math.max(1, parseInt(cpPage));
  const cpL = Math.min(100, Math.max(1, parseInt(cpLimit)));
  const coupons = await Coupon.find({ salonId: salon._id, deletedAt: null }).sort({ createdAt: -1 }).skip((cpP - 1) * cpL).limit(cpL).lean();
  const couponTotal = await Coupon.countDocuments({ salonId: salon._id, deletedAt: null });
  const nowTs = new Date();
  const mapped = coupons.map(c => {
    const remaining = c.maxUsageCount ? Math.max(0, c.maxUsageCount - (c.usageCount || 0)) : null;
    const daysLeft  = c.validUntil ? Math.ceil((new Date(c.validUntil) - nowTs) / 86400000) : null;
    return {
      ...c,
      minOrderAmount: c.minAmount || 0,
      maxUses: c.maxUsageCount || null,
      expiryDate: c.validUntil ? c.validUntil.toISOString() : null,
      usedCount: c.usageCount || 0,
      remaining,
      daysLeft,
      isExpiringSoon: daysLeft !== null && daysLeft <= 3 && daysLeft >= 0,
      isLimited: remaining !== null && remaining <= 10,
    };
  });
  res.json({ success: true, data: { coupons: mapped, total: couponTotal, page: cpP, limit: cpL } });
}));

// POST /owner/coupons
router.post("/owner/coupons", authenticateOwner, asyncHandler(async (req, res) => {
  const Coupon = require("../models/Coupon");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiryDate } = req.body;
  if (!code?.trim()) return res.status(400).json({ success: false, message: "Coupon code is required" });
  if (!discountValue || isNaN(Number(discountValue))) return res.status(400).json({ success: false, message: "Valid discount value is required" });
  const existing = await Coupon.findOne({ code: code.trim().toUpperCase(), salonId: salon._id });
  if (existing) return res.status(409).json({ success: false, message: "Coupon code already exists for this salon" });
  let coupon;
  try {
    coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      salonId: salon._id,
      discountType: discountType || "percentage",
      discountValue: Number(discountValue),
      minAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      maxUsageCount: maxUses ? Number(maxUses) : null,
      validUntil: expiryDate ? new Date(expiryDate) : null,
      isActive: true,
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: "Coupon code already exists for this salon" });
    throw e;
  }
  res.status(201).json({ success: true, data: {
    ...coupon.toObject(),
    minOrderAmount: coupon.minAmount || 0,
    maxUses: coupon.maxUsageCount || null,
    expiryDate: coupon.validUntil ? coupon.validUntil.toISOString() : null,
    usedCount: 0,
  }});
}));

// PUT /owner/coupons/:id
router.put("/owner/coupons/:id", authenticateOwner, validateObjectId("id"), asyncHandler(async (req, res) => {
  const Coupon = require("../models/Coupon");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const coupon = await Coupon.findOne({ _id: req.params.id, salonId: salon._id });
  if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
  const { isActive, discountValue, minOrderAmount, maxUses, expiryDate } = req.body;
  if (isActive !== undefined) coupon.isActive = Boolean(isActive);
  if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
  if (minOrderAmount !== undefined) coupon.minAmount = Number(minOrderAmount);
  if (maxUses !== undefined) coupon.maxUsageCount = maxUses ? Number(maxUses) : null;
  if (expiryDate !== undefined) coupon.validUntil = expiryDate ? new Date(expiryDate) : null;
  await coupon.save();
  res.json({ success: true, data: {
    ...coupon.toObject(),
    minOrderAmount: coupon.minAmount || 0,
    maxUses: coupon.maxUsageCount || null,
    expiryDate: coupon.validUntil ? coupon.validUntil.toISOString() : null,
    usedCount: coupon.usageCount || 0,
  }});
}));

// DELETE /owner/coupons/:id
router.delete("/owner/coupons/:id", authenticateOwner, validateObjectId("id"), asyncHandler(async (req, res) => {
  const Coupon = require("../models/Coupon");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const coupon = await Coupon.findOneAndUpdate(
    { _id: req.params.id, salonId: salon._id, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
  res.json({ success: true, message: "Coupon deleted" });
}));

// GET /owner/coupons/:id/analytics — usage history for a coupon
router.get("/owner/coupons/:id/analytics", authenticateOwner, validateObjectId("id"), asyncHandler(async (req, res) => {
  const Coupon = require("../models/Coupon");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const coupon = await Coupon.findOne({ _id: req.params.id, salonId: salon._id })
    .populate("usageHistory.customerId", "name phone")
    .lean();
  if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
  const totalDiscount = coupon.usageHistory.reduce((s, h) => s + (h.discountApplied || 0), 0);
  res.json({ success: true, data: {
    code: coupon.code,
    usageCount: coupon.usageCount || 0,
    totalDiscount,
    remaining: coupon.maxUsageCount ? Math.max(0, coupon.maxUsageCount - (coupon.usageCount || 0)) : null,
    history: coupon.usageHistory.map(h => ({
      customer: h.customerId?.name || "Unknown",
      phone: h.customerId?.phone || null,
      discountApplied: h.discountApplied,
      usedAt: h.usedAt,
    })),
  }});
}));

// POST /owner/coupons/broadcast — send push notification to customers of this salon within 5 km
router.post("/owner/coupons/broadcast", authenticateOwner, asyncHandler(async (req, res) => {
  const Coupon   = require("../models/Coupon");
  const Booking  = require("../models/Booking");
  const Customer = require("../models/Customer");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] })
    .select("name location");
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const salonCoords = salon.location?.coordinates; // [lng, lat]
  if (!salonCoords || salonCoords.length !== 2) {
    return res.status(400).json({ success: false, message: "Salon location not configured" });
  }

  const { couponId, customMessage } = req.body;
  const coupon = couponId ? await Coupon.findOne({ _id: couponId, salonId: salon._id }).lean() : null;

  // Customers who have booked at this salon
  const customerIds = await Booking.distinct("customerId", { salonId: salon._id });

  // Filter: must have push token + lastLocation within 5 km of salon
  const RADIUS_KM = 5;
  const EARTH_RADIUS_KM = 6371;
  const customers = await Customer.find({
    _id: { $in: customerIds },
    pushToken: { $exists: true, $ne: null, $ne: "" },
    lastLocation: {
      $geoWithin: {
        $centerSphere: [salonCoords, RADIUS_KM / EARTH_RADIUS_KM],
      },
    },
  }).select("pushToken name").lean();

  if (customers.length === 0) {
    return res.json({
      success: true,
      data: { sent: 0, total: 0 },
      message: "No eligible customers within 5 km with notifications enabled",
    });
  }

  const title = coupon
    ? `🎉 Special Offer at ${salon.name}!`
    : `📢 Update from ${salon.name}`;

  const body = coupon
    ? `Use code ${coupon.code} — get ${coupon.discountType === 'percentage' ? coupon.discountValue + '% OFF' : '₹' + coupon.discountValue + ' OFF'}!${coupon.validUntil ? ' Hurry, limited time!' : ''}`
    : (customMessage || `${salon.name} has something new for you!`);

  const messages = customers
    .filter(c => c.pushToken && c.pushToken.startsWith('ExponentPushToken'))
    .map(c => ({
      to: c.pushToken, sound: 'default', title, body,
      data: { type: 'offer', salonId: salon._id.toString(), couponCode: coupon?.code || null },
    }));

  let sent = 0;
  if (messages.length > 0) {
    try {
      const r = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (r.ok) sent = messages.length;
    } catch { /* non-critical */ }
  }

  res.json({ success: true, data: { sent, total: customers.length }, message: `Notification sent to ${sent} of ${customers.length} nearby customers` });
}));

/* =====================================================
   OWNER WORKING HOURS ROUTES
===================================================== */

// GET /owner/working-hours
router.get("/owner/working-hours", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] })
    .select("workingHours").lean();
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  res.json({ success: true, data: { workingHours: salon.workingHours } });
}));

// PUT /owner/working-hours
router.put("/owner/working-hours", authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const { workingHours } = req.body;
  if (!workingHours) return res.status(400).json({ success: false, message: "workingHours is required" });
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const day of days) {
    if (workingHours[day]) {
      salon.workingHours[day] = {
        open:     workingHours[day].open     || salon.workingHours[day]?.open  || "09:00",
        close:    workingHours[day].close    || salon.workingHours[day]?.close || "18:00",
        isClosed: Boolean(workingHours[day].isClosed),
      };
    }
  }
  await salon.save();
  res.json({ success: true, data: { workingHours: salon.workingHours } });
}));

/* =====================================================
   OWNER CUSTOMERS ROUTES
===================================================== */

// GET /owner/customers — list all customers (registered + walk-in) who booked at this salon
router.get("/owner/customers", authenticateOwner, asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const Customer = require("../models/Customer");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });
  const { page: custPage = 1, limit: custLimit = 50, q } = req.query;
  const custP = Math.max(1, parseInt(custPage));
  const custL = Math.min(200, Math.max(1, parseInt(custLimit)));

  // 1. Registered customers (have customerId)
  const registered = await Booking.aggregate([
    { $match: { salonId: salon._id, customerId: { $exists: true, $ne: null }, deletedAt: null } },
    {
      $group: {
        _id:               "$customerId",
        totalBookings:     { $sum: 1 },
        totalSpent:        { $sum: "$totalAmount" },
        lastVisit:         { $max: "$appointmentDate" },
        completedBookings: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      }
    },
    { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" } },
    { $unwind: "$customer" },
    { $match: { "customer.deletedAt": null } },
    {
      $project: {
        _id:               "$customer._id",
        name:              "$customer.name",
        phone:             "$customer.phone",
        email:             "$customer.email",
        profilePhoto:      "$customer.profilePhoto",
        totalBookings:     1,
        totalSpent:        1,
        lastVisit:         1,
        completedBookings: 1,
        isWalkIn:          { $literal: false },
      }
    },
  ]);

  // 2. Walk-in customers (no customerId, have customerPhone, grouped by phone)
  const walkIns = await Booking.aggregate([
    {
      $match: {
        salonId:       salon._id,
        customerId:    { $exists: false },
        customerPhone: { $exists: true, $nin: [null, ""] },
        deletedAt:     null,
      }
    },
    {
      $group: {
        _id:               "$customerPhone",
        name:              { $last: "$customerName" },
        phone:             { $last: "$customerPhone" },
        totalBookings:     { $sum: 1 },
        totalSpent:        { $sum: "$totalAmount" },
        lastVisit:         { $max: "$appointmentDate" },
        completedBookings: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      }
    },
    {
      $project: {
        _id:               { $concat: ["walkin_", "$_id"] },
        name:              1,
        phone:             1,
        email:             { $literal: "" },
        profilePhoto:      { $literal: null },
        totalBookings:     1,
        totalSpent:        1,
        lastVisit:         1,
        completedBookings: 1,
        isWalkIn:          { $literal: true },
      }
    },
  ]);

  // Merge: skip walk-ins whose phone already matches a registered customer
  const registeredPhones = new Set(registered.map(c => c.phone).filter(Boolean));
  const uniqueWalkIns = walkIns.filter(w => !registeredPhones.has(w.phone));

  let customers = [...registered, ...uniqueWalkIns]
    .sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0));

  if (q) {
    const safeQ = escapeRegex(String(q).slice(0, 100)).toLowerCase();
    customers = customers.filter(c =>
      c.name?.toLowerCase().includes(safeQ) || c.phone?.includes(safeQ)
    );
  }

  const total = customers.length;
  const paginated = customers.slice((custP - 1) * custL, custP * custL);
  res.json({ success: true, data: { customers: paginated, total, page: custP, limit: custL } });
}));

// POST /owner/customers — manually add a customer
router.post("/owner/customers", authenticateOwner, asyncHandler(async (req, res) => {
  const Customer = require("../models/Customer");
  const { name, phone, email, notes } = req.body;
  if (!name?.trim())  return res.status(400).json({ success: false, message: "Name is required" });
  if (!phone?.trim()) return res.status(400).json({ success: false, message: "Phone is required" });
  const existing = await Customer.findOne({ phone: phone.trim() });
  if (existing) return res.status(409).json({ success: false, message: "A customer with this phone already exists" });
  const customer = await Customer.create({
    name:    name.trim(),
    phone:   phone.trim(),
    email:   email?.trim() || undefined,
    notes:   notes?.trim() || undefined,
    gender:  'male',
    role:    'customer',
  });
  res.status(201).json({ success: true, data: customer });
}));

// PUT /owner/customers/:customerId — update a customer's details
router.put("/owner/customers/:customerId", authenticateOwner, asyncHandler(async (req, res) => {
  const Customer = require("../models/Customer");
  const { name, phone, email, notes } = req.body;
  const update = {};
  if (name?.trim())  update.name  = name.trim();
  if (phone?.trim()) update.phone = phone.trim();
  if (email !== undefined) update.email = email?.trim() || "";
  if (notes !== undefined) update.notes = notes?.trim() || "";
  const customer = await Customer.findByIdAndUpdate(
    req.params.customerId,
    { $set: update },
    { new: true, runValidators: false }
  );
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
  res.json({ success: true, data: customer });
}));

// DELETE /owner/customers/:customerId — remove a customer record
router.delete("/owner/customers/:customerId", authenticateOwner, asyncHandler(async (req, res) => {
  const Customer = require("../models/Customer");
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.customerId, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
  res.json({ success: true, message: "Customer deleted" });
}));

// GET /owner/customers/:customerId/bookings — booking history (registered or walk-in by phone)
router.get("/owner/customers/:customerId/bookings", authenticateOwner, asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: "Salon not found" });

  const { customerId } = req.params;

  // Walk-in virtual IDs are prefixed with "walkin_"
  if (customerId.startsWith("walkin_")) {
    const phone = customerId.slice(7);
    const bookings = await Booking.find({ salonId: salon._id, customerPhone: phone, isWalkIn: true })
      .sort({ appointmentDate: -1 }).limit(50).lean();
    return res.json({ success: true, data: { bookings } });
  }

  // Registered customer
  const bookings = await Booking.find({ salonId: salon._id, customerId })
    .sort({ appointmentDate: -1 }).limit(50).lean();
  res.json({ success: true, data: { bookings } });
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
   TEST / DEBUG HELPERS  (ALLOW_TEST_ENDPOINTS=true only)
===================================================== */

// POST /test/owner/create  — create a test owner + return token (no Firebase needed)
router.post("/test/owner/create", asyncHandler(async (req, res) => {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled' });
  }
  const Owner = require('../models/Owner');
  const jwt = require('jsonwebtoken');
  const { name, email, phone, password } = req.body;

  // Clean up existing test owner with same email
  await Owner.deleteOne({ email });

  const owner = await Owner.create({
    name: name || 'Test Owner',
    email,
    phone,
    password: password || 'Test@12345',
    phoneVerified: true,
    status: 'approved',
    approvalStatus: 'approved',
    role: 'owner',
    subscription: {
      trialStartDate: new Date(),
      planType: 'free_trial',
      paymentStatus: 'trial',
      monthlyBookingCount: 0,
    },
  });

  const token = jwt.sign({ id: owner._id, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ success: true, data: { ownerId: owner._id, token } });
}));

// DELETE /test/owner/cleanup  — delete all test owners (email containing 'test_')
router.delete("/test/owner/cleanup", asyncHandler(async (req, res) => {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled' });
  }
  const Owner = require('../models/Owner');
  const SubscriptionLog = require('../models/SubscriptionLog');
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'email required' });
  const owner = await Owner.findOne({ email });
  if (owner) {
    await SubscriptionLog.deleteMany({ ownerId: owner._id });
    await Subscription.deleteMany({ ownerId: owner._id });
    await Owner.deleteOne({ _id: owner._id });
  }
  res.json({ success: true, message: 'Test owner cleaned up' });
}));

// POST /test/subscription/set-trial-date
// Body: { daysAgo: 31 }  — manually move trialStartDate to simulate expiry
// ONLY available when ALLOW_TEST_ENDPOINTS=true in .env
router.post("/test/subscription/set-trial-date", authenticateOwner, asyncHandler(async (req, res) => {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled' });
  }
  const { daysAgo = 31 } = req.body;
  const Owner = require('../models/Owner');
  const owner = await Owner.findById(req.owner._id);
  if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

  const newDate = new Date();
  newDate.setDate(newDate.getDate() - Number(daysAgo));
  owner.subscription.trialStartDate = newDate;
  await owner.save();

  res.json({
    success: true,
    message: `Trial start date set to ${daysAgo} days ago`,
    data: { trialStartDate: owner.subscription.trialStartDate },
  });
}));

// POST /test/subscription/reset
// Resets owner subscription back to fresh trial state
router.post("/test/subscription/reset", authenticateOwner, asyncHandler(async (req, res) => {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled' });
  }
  const Owner = require('../models/Owner');
  const owner = await Owner.findById(req.owner._id);
  if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

  owner.subscription = {
    trialStartDate: new Date(),
    planType: 'free_trial',
    billingCycleStart: null,
    monthlyBookingCount: 0,
    lastPaymentDate: null,
    paymentStatus: 'trial',
    razorpaySubscriptionId: null,
    trialEndReminderSent: false,
    paymentDueReminderSent: false,
  };
  await owner.save();

  res.json({ success: true, message: 'Subscription reset to fresh trial', data: owner.subscription });
}));

// POST /test/subscription/force-pay
// Simulates a successful Razorpay payment without hitting Razorpay.
// Sets paymentStatus='paid', billingCycleEndDate=now+30d, creates a Subscription invoice.
// Body: { planType?: 'starter'|'per_booking', bookingCount?: number }
router.post("/test/subscription/force-pay", authenticateOwner, asyncHandler(async (req, res) => {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled' });
  }
  const Owner        = require('../models/Owner');
  const Subscription = require('../models/Subscription');
  const owner = await Owner.findById(req.owner._id);
  if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

  const planType = req.body.planType || owner.subscription.planType || 'starter';
  if (!['starter', 'per_booking'].includes(planType)) {
    return res.status(400).json({ success: false, message: 'Invalid planType' });
  }

  const bookingCount = req.body.bookingCount ?? owner.subscription.monthlyBookingCount ?? 0;
  const amount       = planType === 'starter' ? 150 : Math.max(bookingCount * 1, 1);
  const now          = new Date();
  const cycleEnd     = new Date(now.getTime() + 30 * 86400000);
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const fakePayId    = `pay_test_${Date.now()}`;
  const fakeOrderId  = `order_test_${Date.now()}`;

  // Create or update invoice
  let invoice = await Subscription.findOne({ ownerId: owner._id, billingMonth, paymentStatus: { $in: ['pending', 'paid'] } });
  if (!invoice) {
    invoice = await Subscription.create({
      ownerId: owner._id, salonId: owner.businessId, planType,
      billingMonth, bookingCount, amount,
      razorpayOrderId: fakeOrderId, razorpayPaymentId: fakePayId,
      paymentStatus: 'paid', paidAt: now,
    });
  } else {
    invoice.paymentStatus = 'paid';
    invoice.paidAt = now;
    invoice.razorpayPaymentId = fakePayId;
    await invoice.save();
  }

  owner.subscription.planType             = planType;
  owner.subscription.paymentStatus        = 'paid';
  owner.subscription.lastPaymentDate      = now;
  owner.subscription.billingCycleStart    = now;
  owner.subscription.billingCycleEndDate  = cycleEnd;
  owner.subscription.planSelectedDuringTrial = null;
  owner.subscription.paymentDueReminderSent  = false;
  await owner.save();

  res.json({ success: true, message: 'Payment simulated', data: { planType, amount, billingCycleEndDate: cycleEnd, invoiceId: invoice._id } });
}));

// POST /test/subscription/set-booking-count
// Directly sets monthlyBookingCount for testing per-booking billing.
// Body: { count: number }
router.post("/test/subscription/set-booking-count", authenticateOwner, asyncHandler(async (req, res) => {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled' });
  }
  const Owner = require('../models/Owner');
  const { count = 0 } = req.body;
  await Owner.updateOne({ _id: req.owner._id }, { $set: { 'subscription.monthlyBookingCount': Number(count) } });
  res.json({ success: true, message: `monthlyBookingCount set to ${count}` });
}));

// POST /test/subscription/run-monthly-reset
// Runs the billing-cycle reset logic for this specific owner only (simulates cron without waiting for 1st of month).
router.post("/test/subscription/run-monthly-reset", authenticateOwner, asyncHandler(async (req, res) => {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled' });
  }
  const Owner        = require('../models/Owner');
  const Subscription = require('../models/Subscription');
  const { logSubscriptionEvent } = require('../utils/subscriptionLogger');

  const owner = await Owner.findById(req.owner._id);
  if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

  const sub = owner.subscription;
  const now = new Date();
  const cycleEnd = new Date(now.getTime() + 30 * 86400000);
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const changes = [];

  // Apply scheduled plan switch if pending
  if (sub.planChangeRequested && sub.nextPlan) {
    const newPlan = sub.nextPlan;
    sub.planType              = newPlan;
    sub.nextPlan              = null;
    sub.planChangeRequested   = false;
    sub.planChangeRequestedAt = null;
    sub.monthlyBookingCount   = 0;
    sub.billingCycleStart     = now;
    sub.billingCycleEndDate   = cycleEnd;
    sub.paymentStatus         = 'overdue';
    sub.paymentDueReminderSent = false;
    await owner.save();
    changes.push(`plan_switched_to:${newPlan}`);
  } else if (sub.planType === 'per_booking' && sub.paymentStatus === 'paid') {
    const bookingCount = sub.monthlyBookingCount || 0;
    const amount = Math.max(bookingCount * 1, 1);
    const existing = await Subscription.findOne({ ownerId: owner._id, billingMonth });
    if (!existing) {
      await Subscription.create({
        ownerId: owner._id, salonId: owner.businessId, planType: 'per_booking',
        billingMonth, bookingCount, amount, paymentStatus: 'pending',
      });
    }
    sub.monthlyBookingCount = 0;
    sub.billingCycleStart   = now;
    sub.paymentStatus       = 'overdue';
    await owner.save();
    changes.push(`per_booking_invoice_created:₹${amount}`, 'booking_count_reset:0');
  } else if (sub.planType === 'starter' && sub.paymentStatus === 'paid') {
    sub.monthlyBookingCount = 0;
    sub.billingCycleStart   = now;
    sub.billingCycleEndDate = cycleEnd;
    sub.paymentStatus       = 'overdue';
    await owner.save();
    changes.push('starter_cycle_reset', 'booking_count_reset:0');
  }

  res.json({ success: true, message: 'Monthly reset applied to this owner', data: { changes, subscription: owner.subscription } });
}));

// GET /test/subscription/owner-state  — dump full subscription state for debugging
router.get("/test/subscription/owner-state", authenticateOwner, asyncHandler(async (req, res) => {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
    return res.status(403).json({ success: false, message: 'Test endpoints are disabled' });
  }
  const Owner = require('../models/Owner');
  const SubscriptionLog = require('../models/SubscriptionLog');

  const owner = await Owner.findById(req.owner._id).select('name email subscription createdAt').lean();
  const logs = await SubscriptionLog.find({ ownerId: req.owner._id })
    .sort({ createdAt: -1 }).limit(20).lean();

  const sub = owner.subscription || {};
  const TRIAL_DAYS = 30;
  const elapsed = Math.floor((Date.now() - new Date(sub.trialStartDate || owner.createdAt)) / 86400000);
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsed);

  res.json({
    success: true,
    data: {
      owner: { name: owner.name, email: owner.email },
      subscription: sub,
      computed: {
        trialDaysElapsed: elapsed,
        trialDaysLeft: daysLeft,
        trialActive: daysLeft > 0,
        accessStatus: daysLeft > 0
          ? 'trial'
          : ['starter', 'per_booking'].includes(sub.planType) && sub.paymentStatus === 'paid'
          ? 'active'
          : sub.paymentStatus === 'overdue'
          ? 'overdue'
          : 'restricted',
      },
      recentLogs: logs,
    },
  });
}));

/* =====================================================
   SUBSCRIPTION / BILLING ROUTES
===================================================== */

router.get("/owner/subscription/status",              authenticateOwner, asyncHandler(subscriptionController.getSubscriptionStatus));
router.post("/owner/subscription/select-plan",         authenticateOwner, asyncHandler(subscriptionController.selectPlan));
router.post("/owner/subscription/request-plan-change", authenticateOwner, asyncHandler(subscriptionController.requestPlanChange));
router.post("/owner/subscription/cancel-plan-change",  authenticateOwner, asyncHandler(subscriptionController.cancelPlanChange));
router.post("/owner/subscription/create-order",        authenticateOwner, asyncHandler(subscriptionController.createPaymentOrder));
router.post("/owner/subscription/verify-payment",      authenticateOwner, asyncHandler(subscriptionController.verifyPayment));
router.get("/owner/subscription/billing-history",      authenticateOwner, asyncHandler(subscriptionController.getBillingHistory));
router.post("/owner/subscription/webhook",             asyncHandler(subscriptionController.razorpayWebhook));

/* =====================================================
   PROMOTIONS — PUBLIC
===================================================== */
router.get("/public/promotions/pricing", asyncHandler(promotionController.getPricing));

/* =====================================================
   PROMOTIONS — OWNER ROUTES
===================================================== */
router.get( "/owner/promotions/pricing",        authenticateOwner, asyncHandler(promotionController.getPricing));
router.get( "/owner/promotions/active",         authenticateOwner, asyncHandler(promotionController.getActivePromotion));
router.get( "/owner/promotions/history",        authenticateOwner, asyncHandler(promotionController.getHistory));
router.post("/owner/promotions/create-order",   authenticateOwner, asyncHandler(promotionController.createPromotionOrder));
router.post("/owner/promotions/verify-payment", authenticateOwner, asyncHandler(promotionController.verifyPromotionPayment));

/* =====================================================
   PROMOTIONS — ADMIN ROUTES
===================================================== */
router.get(   "/admin/promotions/stats",         authenticateAdmin, asyncHandler(promotionAdminController.getStats));
router.get(   "/admin/promotions/all",           authenticateAdmin, asyncHandler(promotionAdminController.getAllPromotions));
router.get(   "/admin/promotions/pricing",       authenticateAdmin, asyncHandler(promotionAdminController.getPricingTiers));
router.post(  "/admin/promotions/pricing",       authenticateAdmin, asyncHandler(promotionAdminController.createPricingTier));
router.put(   "/admin/promotions/pricing/:id",   authenticateAdmin, asyncHandler(promotionAdminController.updatePricingTier));
router.delete("/admin/promotions/pricing/:id",   authenticateAdmin, asyncHandler(promotionAdminController.deletePricingTier));
router.put(   "/admin/promotions/:id/cancel",    authenticateAdmin, asyncHandler(promotionAdminController.cancelPromotion));

/* =====================================================
   PACKAGES & MEMBERSHIPS — OWNER ROUTES
===================================================== */

const Package     = require('../models/Package');
const UserPackage = require('../models/UserPackage');

// GET /public/salons/:salonId/packages — active packages for a salon (public)
router.get('/public/salons/:salonId/packages', validateObjectId('salonId'), asyncHandler(async (req, res) => {
  const { type } = req.query; // optional filter: 'package' | 'membership'
  const query = { salonId: req.params.salonId, isActive: true };
  if (type && ['package', 'membership'].includes(type)) query.type = type;
  const packages = await Package.find(query).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { packages } });
}));

// POST /owner/packages — create a package or membership
router.post('/owner/packages', authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  const {
    type, name, description, icon, tag,
    services, originalPrice, discountedPrice, discountPercent, totalDuration,
    price, billingCycle, durationDays, benefits,
  } = req.body;

  if (!type || !['package', 'membership'].includes(type))
    return res.status(400).json({ success: false, message: "type must be 'package' or 'membership'" });
  if (!name?.trim())
    return res.status(400).json({ success: false, message: 'name is required' });

  const doc = await Package.create({
    salonId: salon._id, type,
    name: name.trim(),
    description: description?.trim() || '',
    icon: icon || (type === 'package' ? '🎁' : '💳'),
    tag: tag || '',
    // Package fields
    services: type === 'package' ? (services || []) : [],
    originalPrice:   type === 'package' ? (Number(originalPrice) || 0)  : 0,
    discountedPrice: type === 'package' ? (Number(discountedPrice) || 0) : 0,
    discountPercent: type === 'package' ? (Number(discountPercent) || 0) : 0,
    totalDuration:   type === 'package' ? (Number(totalDuration) || 0)  : 0,
    // Membership fields
    price:        type === 'membership' ? (Number(price) || 0)    : 0,
    billingCycle: type === 'membership' ? (billingCycle || 'monthly') : 'monthly',
    durationDays: type === 'membership' ? (Number(durationDays) || 30) : 30,
    benefits: type === 'membership' ? {
      freeServices:    benefits?.freeServices    || [],
      discountPercent: Number(benefits?.discountPercent) || 0,
      priorityBooking: Boolean(benefits?.priorityBooking),
    } : { freeServices: [], discountPercent: 0, priorityBooking: false },
  });

  res.status(201).json({ success: true, data: doc });
}));

// GET /owner/packages — list all packages/memberships for the salon
router.get('/owner/packages', authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });
  const { type } = req.query;
  const query = { salonId: salon._id };
  if (type && ['package', 'membership'].includes(type)) query.type = type;
  const packages = await Package.find(query).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { packages } });
}));

// PUT /owner/packages/:id — update or toggle active
router.put('/owner/packages/:id', authenticateOwner, validateObjectId('id'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });
  const pkg = await Package.findOne({ _id: req.params.id, salonId: salon._id });
  if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

  const allowed = ['name','description','icon','tag','isActive',
    'services','originalPrice','discountedPrice','discountPercent','totalDuration',
    'price','billingCycle','durationDays','benefits'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) pkg[key] = req.body[key];
  }
  await pkg.save();
  res.json({ success: true, data: pkg });
}));

// DELETE /owner/packages/:id
router.delete('/owner/packages/:id', authenticateOwner, validateObjectId('id'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });
  const pkg = await Package.findOneAndDelete({ _id: req.params.id, salonId: salon._id });
  if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
  res.json({ success: true, message: 'Deleted' });
}));

/* =====================================================
   BROADCAST NOTIFICATIONS — SETTINGS & CAMPAIGNS
===================================================== */

const NotificationSettings  = require('../models/NotificationSettings');
const NotificationCampaign  = require('../models/NotificationCampaign');
const { createOrder: rzpCreateOrder, verifyPaymentSignature } = require('../config/razorpay');

// Helper: current calendar month string 'YYYY-MM'
const currentMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

// Helper: resolve target customers list based on targetType + optional gender filter
// targetGender: 'male' | 'female' | 'both'
async function resolveTargetCustomers(targetType, salon, targetGender = 'both') {
  const Customer = require('../models/Customer');
  const Booking  = require('../models/Booking');

  // Build gender filter — 'both' means no restriction
  const genderFilter = targetGender === 'both'
    ? {}
    : { gender: targetGender };

  if (targetType === 'my_customers') {
    const bookings = await Booking.find({ salonId: salon._id }).select('customerId').lean();
    const ids = [...new Set(bookings.map(b => b.customerId?.toString()).filter(Boolean))];
    if (!ids.length) return [];
    return Customer.find({ _id: { $in: ids }, isActive: true, isBanned: { $ne: true }, ...genderFilter })
      .select('pushToken _id').lean();
  }

  const radiusMap = { radius_5km: 5000, radius_10km: 10000, radius_25km: 25000 };
  const maxDistance = radiusMap[targetType];
  if (!maxDistance) return [];

  return Customer.find({
    lastLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: salon.location.coordinates },
        $maxDistance: maxDistance,
      },
    },
    isActive: true,
    isBanned: { $ne: true },
    ...genderFilter,
  }).select('pushToken _id').lean();
}

// Helper: send Expo push + socket to a list of customers
async function dispatchNotification(customers, title, message, pkg, io, salonId) {
  const { Expo } = require('expo-server-sdk');
  const expo = new Expo();
  const msgs = customers
    .filter(c => c.pushToken && Expo.isExpoPushToken(c.pushToken))
    .map(c => ({
      to: c.pushToken,
      sound: 'default',
      title,
      body: message,
      data: { type: 'package_notification', packageId: pkg._id.toString(), packageType: pkg.type },
    }));

  let notifiedCount = 0;
  if (msgs.length) {
    try { await expo.sendPushNotificationsAsync(msgs); notifiedCount = msgs.length; }
    catch { /* non-critical */ }
  }

  try {
    if (io) {
      customers.forEach(c => {
        io.to(`customer-${c._id}`).emit('package-notification', {
          packageId: pkg._id.toString(), packageName: pkg.name, title, message,
        });
      });
    }
  } catch { /* non-critical */ }

  return notifiedCount;
}

// GET /owner/notification-settings
router.get('/owner/notification-settings', authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  let settings = await NotificationSettings.findOne({ salonId: salon._id }).lean();
  if (!settings) {
    settings = await NotificationSettings.create({ salonId: salon._id });
    settings = settings.toObject();
  }

  const month = currentMonth();
  const freeUsedThisMonth = settings.freeRadiusMonthly?.month === month
    ? (settings.freeRadiusMonthly.used || 0) : 0;

  res.json({
    success: true,
    data: {
      broadcastEnabled: settings.broadcastEnabled,
      pricing: settings.pricing,
      freeRadiusRemaining: Math.max(0, 1 - freeUsedThisMonth),
      salonServedGender: salon.servedGender || 'unisex',
    },
  });
}));

// PUT /owner/notification-settings — update pricing and enabled state
router.put('/owner/notification-settings', authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  const { broadcastEnabled, pricing } = req.body;
  const update = {};
  if (typeof broadcastEnabled === 'boolean') update.broadcastEnabled = broadcastEnabled;
  if (pricing) {
    if (typeof pricing.radius5km  === 'number') update['pricing.radius5km']  = Math.max(0, pricing.radius5km);
    if (typeof pricing.radius10km === 'number') update['pricing.radius10km'] = Math.max(0, pricing.radius10km);
    if (typeof pricing.radius25km === 'number') update['pricing.radius25km'] = Math.max(0, pricing.radius25km);
  }

  const settings = await NotificationSettings.findOneAndUpdate(
    { salonId: salon._id },
    { $set: update },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: settings });
}));

// POST /owner/packages/:id/notify
// body { title, message, targetType, preview? }
//   preview=true  → returns { estimatedCount, isFree, amount } without sending
//   preview=false → if free: sends immediately; if paid: creates Razorpay order
router.post('/owner/packages/:id/notify', authenticateOwner, validateObjectId('id'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  const pkg = await Package.findOne({ _id: req.params.id, salonId: salon._id });
  if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

  const { title, message, targetType = 'my_customers', preview = false, targetGender: rawGender } = req.body;

  const VALID_TARGETS = ['my_customers', 'radius_5km', 'radius_10km', 'radius_25km'];
  if (!VALID_TARGETS.includes(targetType))
    return res.status(400).json({ success: false, message: 'Invalid targetType' });

  // Auto-determine gender from salon's servedGender; only unisex salons can override
  let targetGender = 'both';
  if (salon.servedGender === 'male')   targetGender = 'male';
  else if (salon.servedGender === 'female') targetGender = 'female';
  else if (salon.servedGender === 'unisex') {
    if (['male', 'female', 'both'].includes(rawGender)) targetGender = rawGender;
    // default 'both' if not provided
  }

  // Load settings
  let settings = await NotificationSettings.findOne({ salonId: salon._id });
  if (!settings) settings = await NotificationSettings.create({ salonId: salon._id });

  if (!settings.broadcastEnabled)
    return res.status(403).json({ success: false, message: 'Broadcast notifications are disabled for this salon' });

  // Determine cost
  const priceMap = {
    my_customers: 0,
    radius_5km:   settings.pricing.radius5km  || 19,
    radius_10km:  settings.pricing.radius10km || 39,
    radius_25km:  settings.pricing.radius25km || 79,
  };
  const rawAmount = priceMap[targetType];

  // Check free quota for radius campaigns
  const month = currentMonth();
  const freeUsed = settings.freeRadiusMonthly?.month === month
    ? (settings.freeRadiusMonthly.used || 0) : 0;
  const hasFreeQuota = rawAmount === 0 || freeUsed < 1; // 1 free radius campaign per month
  const isFree = rawAmount === 0 || hasFreeQuota;
  const amount = isFree ? 0 : rawAmount;

  // Estimate target customers (gender-filtered)
  const customers = await resolveTargetCustomers(targetType, salon, targetGender);
  const estimatedCount = customers.length;

  if (preview) {
    return res.json({
      success: true,
      data: { estimatedCount, isFree, amount, freeRadiusRemaining: hasFreeQuota ? 1 - freeUsed : 0, targetGender },
    });
  }

  // ── Actual send ──
  if (!title?.trim() || !message?.trim())
    return res.status(400).json({ success: false, message: 'title and message are required' });

  if (!estimatedCount)
    return res.json({ success: true, message: 'No matching customers to notify', notifiedCount: 0 });

  if (isFree) {
    // Consume free quota if radius-based
    if (rawAmount > 0) {
      settings.freeRadiusMonthly = { month, used: freeUsed + 1 };
      await settings.save();
    }

    // Create campaign record
    const campaign = await NotificationCampaign.create({
      salonId: salon._id, packageId: pkg._id, packageName: pkg.name, packageType: pkg.type,
      targetType, targetGender, title: title.trim(), message: message.trim(),
      isFree: true, amount: 0, paymentStatus: 'free', status: 'sent', sentAt: new Date(),
    });

    const io = req.app.get('io');
    const notifiedCount = await dispatchNotification(
      customers, title.trim(), message.trim(), pkg, io, salon._id
    );

    campaign.recipientCount = notifiedCount;
    await campaign.save();

    return res.json({ success: true, notifiedCount, campaignId: campaign._id });
  }

  // ── Paid campaign: create Razorpay order ──
  const campaign = await NotificationCampaign.create({
    salonId: salon._id, packageId: pkg._id, packageName: pkg.name, packageType: pkg.type,
    targetType, targetGender, title: title.trim(), message: message.trim(),
    isFree: false, amount, paymentStatus: 'pending',
    status: 'payment_pending',
  });

  const orderResult = await rzpCreateOrder(amount, null, campaign._id.toString(), null, null);
  if (!orderResult.success) {
    campaign.status = 'failed';
    await campaign.save();
    return res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }

  campaign.razorpayOrderId = orderResult.orderId;
  await campaign.save();

  const Owner = require('../models/Owner');
  const owner = await Owner.findById(req.owner._id).select('name email phone').lean();

  res.json({
    success: true,
    needsPayment: true,
    data: {
      campaignId: campaign._id,
      amount,
      orderId: orderResult.orderId,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      ownerName:  owner?.name  || '',
      ownerEmail: owner?.email || '',
      ownerPhone: owner?.phone || '',
    },
  });
}));

// POST /owner/notification-campaigns/:id/verify-payment — verify Razorpay payment then send
router.post('/owner/notification-campaigns/:id/verify-payment', authenticateOwner, validateObjectId('id'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  const campaign = await NotificationCampaign.findOne({ _id: req.params.id, salonId: salon._id });
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
  if (campaign.status !== 'payment_pending')
    return res.status(400).json({ success: false, message: 'Campaign is not awaiting payment' });

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
    return res.status(400).json({ success: false, message: 'Payment details required' });

  const verified = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!verified.success) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  campaign.razorpayPaymentId = razorpayPaymentId;
  campaign.razorpaySignature = razorpaySignature;
  campaign.paymentStatus = 'paid';

  const pkg = await Package.findById(campaign.packageId);
  if (!pkg) {
    campaign.status = 'failed';
    await campaign.save();
    return res.status(404).json({ success: false, message: 'Package not found' });
  }

  const customers = await resolveTargetCustomers(campaign.targetType, salon, campaign.targetGender || 'both');
  const io = req.app.get('io');
  const notifiedCount = await dispatchNotification(
    customers, campaign.title, campaign.message, pkg, io, salon._id
  );

  campaign.recipientCount = notifiedCount;
  campaign.status = 'sent';
  campaign.sentAt = new Date();
  await campaign.save();

  res.json({ success: true, notifiedCount });
}));

// GET /owner/package-requests — list all purchase requests for this salon
router.get('/owner/package-requests', authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });
  const { status } = req.query;
  const query = { salonId: salon._id };
  if (status && ['pending','active','expired','rejected'].includes(status)) query.status = status;
  const requests = await UserPackage.find(query).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: { requests } });
}));

// PUT /owner/package-requests/:id — confirm (activate) or reject a request
router.put('/owner/package-requests/:id', authenticateOwner, validateObjectId('id'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });
  const request = await UserPackage.findOne({ _id: req.params.id, salonId: salon._id });
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

  const { action, rejectedReason } = req.body; // action: 'confirm' | 'reject'
  if (!['confirm', 'reject'].includes(action))
    return res.status(400).json({ success: false, message: "action must be 'confirm' or 'reject'" });

  if (action === 'confirm') {
    // Look up package to get durationDays
    const pkg = await Package.findById(request.packageId).select('durationDays type').lean();
    const durationDays = pkg?.type === 'membership' ? (pkg.durationDays || 30) : 0;
    const now = new Date();
    request.status      = 'active';
    request.startDate   = now;
    request.endDate     = durationDays > 0
      ? new Date(now.getTime() + durationDays * 86400000)
      : null; // packages (one-time) have no expiry
    request.confirmedAt = now;

    // Build usage tracking for memberships
    if (pkg?.type === 'membership') {
      const fullPkg = await Package.findById(request.packageId).lean();
      if (fullPkg?.benefits?.freeServices?.length) {
        request.usageTracking = fullPkg.benefits.freeServices.map(fs => ({
          serviceId:   fs.serviceId,
          serviceName: fs.serviceName,
          used: 0,
          limit: fs.usageLimit || 1,
        }));
      }
    }
  } else {
    request.status         = 'rejected';
    request.rejectedAt     = new Date();
    request.rejectedReason = rejectedReason?.trim() || '';
  }
  await request.save();

  // Push notification to customer
  try {
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(request.customerId).select('pushToken name').lean();
    if (customer?.pushToken) {
      const isConfirm = action === 'confirm';
      const { Expo } = require('expo-server-sdk');
      const expo = new Expo();
      if (Expo.isExpoPushToken(customer.pushToken)) {
        await expo.sendPushNotificationsAsync([{
          to: customer.pushToken,
          sound: 'default',
          title: isConfirm
            ? `✅ ${request.packageName} Activated!`
            : `❌ ${request.packageName} Request Rejected`,
          body: isConfirm
            ? `Your ${request.type} at ${salon.name} is now active. Enjoy!`
            : `Your request at ${salon.name} was not approved.${rejectedReason ? ' Reason: ' + rejectedReason : ''}`,
          data: { type: isConfirm ? 'package_confirmed' : 'package_rejected', requestId: request._id.toString() },
        }]);
      }
    }
  } catch { /* non-critical */ }

  // Real-time socket event to customer
  try {
    const io = req.app.get('io');
    if (io && request.customerId) {
      io.to(`customer-${request.customerId}`).emit('package-request-updated', {
        requestId: request._id, status: request.status,
      });
    }
  } catch { /* non-critical */ }

  res.json({ success: true, data: request });
}));

/* =====================================================
   PACKAGES & MEMBERSHIPS — CUSTOMER ROUTES
===================================================== */

// POST /customer/package-request — request to purchase a package/membership
router.post('/customer/package-request', authenticateCustomer, asyncHandler(async (req, res) => {
  const Customer = require('../models/Customer');
  const { packageId, purchaseNote } = req.body;
  if (!packageId) return res.status(400).json({ success: false, message: 'packageId is required' });

  const pkg = await Package.findById(packageId);
  if (!pkg || !pkg.isActive)
    return res.status(404).json({ success: false, message: 'Package not found or inactive' });

  const salon = await Business.findById(pkg.salonId).select('name ownerId').lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  const customer = await Customer.findById(req.customer._id).select('name phone').lean();

  // Prevent duplicate pending request
  const existing = await UserPackage.findOne({
    customerId: req.customer._id, packageId, status: 'pending',
  });
  if (existing) return res.status(409).json({ success: false, message: 'You already have a pending request for this package' });

  const request = await UserPackage.create({
    customerId:    req.customer._id,
    customerName:  customer.name,
    customerPhone: customer.phone || '',
    salonId:       pkg.salonId,
    packageId:     pkg._id,
    type:          pkg.type,
    packageName:   pkg.name,
    pricePaid:     pkg.type === 'package' ? pkg.discountedPrice : pkg.price,
    purchaseNote:  purchaseNote?.trim() || '',
  });

  // Push notification to salon owner
  try {
    const Owner = require('../models/Owner');
    const owner = await Owner.findById(salon.ownerId).select('pushToken').lean();
    if (owner?.pushToken) {
      const { Expo } = require('expo-server-sdk');
      const expo = new Expo();
      if (Expo.isExpoPushToken(owner.pushToken)) {
        await expo.sendPushNotificationsAsync([{
          to: owner.pushToken,
          sound: 'default',
          channelId: 'new_booking',
          title: `🎁 New ${pkg.type === 'membership' ? 'Membership' : 'Package'} Request!`,
          body: `${customer.name} wants to buy "${pkg.name}" — ₹${request.pricePaid}`,
          data: { type: 'package_request', requestId: request._id.toString() },
        }]);
      }
    }
  } catch { /* non-critical */ }

  // Real-time socket event to salon owner
  try {
    const io = req.app.get('io');
    if (io) {
      io.to(`salon-${pkg.salonId}`).emit('new-package-request', {
        requestId:    request._id,
        customerName: customer.name,
        packageName:  pkg.name,
        type:         pkg.type,
        pricePaid:    request.pricePaid,
      });
    }
  } catch { /* non-critical */ }

  res.status(201).json({ success: true, data: request });
}));

// GET /customer/my-packages — get all my purchases
router.get('/customer/my-packages', authenticateCustomer, asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = { customerId: req.customer._id };
  if (status && ['pending','active','expired','rejected'].includes(status)) query.status = status;

  // Auto-expire any active packages/memberships that passed their endDate
  const now = new Date();
  await UserPackage.updateMany(
    { customerId: req.customer._id, status: 'active', endDate: { $lt: now, $ne: null } },
    { $set: { status: 'expired' } }
  );

  const purchases = await UserPackage.find(query)
    .sort({ createdAt: -1 })
    .populate('packageId', 'icon type benefits services discountPercent discountedPrice originalPrice')
    .lean();
  res.json({ success: true, data: { purchases } });
}));

/* =====================================================
   CHAT — PER-BOOKING MESSAGES
===================================================== */

const Message = require('../models/Message');

// helper — verify booking belongs to the caller and is still open
async function getChatBooking(bookingId, role, callerId) {
  const booking = await Booking.findById(bookingId).select('salonId customerId status ownerId').lean();
  if (!booking) return null;
  if (['completed', 'cancelled'].includes(booking.status)) return null; // chat closed
  if (role === 'customer' && booking.customerId.toString() !== callerId.toString()) return null;
  if (role === 'owner') {
    const Business = require('../models/Business');
    const salon = await Business.findOne({ ownerId: callerId }).select('_id').lean();
    if (!salon || salon._id.toString() !== booking.salonId.toString()) return null;
  }
  return booking;
}

// GET /owner/messages/unread — all unread customer messages across all bookings
router.get('/owner/messages/unread', authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] }).select('_id').lean();
  if (!salon) return res.json({ success: true, data: { messages: [], count: 0 } });

  const messages = await Message.find({ salonId: salon._id, senderRole: 'customer', readAt: null })
    .sort({ createdAt: -1 }).limit(50).lean();

  const bookingIds = [...new Set(messages.map((m) => m.bookingId.toString()))];
  const bookings   = await Booking.find({ _id: { $in: bookingIds } })
    .select('customerName serviceName appointmentDate appointmentTime status customerId').lean();
  const bookingMap = {};
  bookings.forEach((b) => { bookingMap[b._id.toString()] = b; });

  const enriched = messages.map((m) => ({ ...m, booking: bookingMap[m.bookingId.toString()] || null }));
  res.json({ success: true, data: { messages: enriched, count: enriched.length } });
}));

// GET /owner/messages/threads — all conversation threads with latest message + unread count
router.get('/owner/messages/threads', authenticateOwner, asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ ownerId: req.owner._id }).select('_id').lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  const threads = await Message.aggregate([
    { $match: { salonId: salon._id } },
    { $sort:  { createdAt: 1 } },
    { $group: {
      _id:           '$bookingId',
      latestMessage: { $last: '$$ROOT' },
      unreadCount:   { $sum: { $cond: [{ $and: [{ $eq: ['$senderRole', 'customer'] }, { $eq: ['$readAt', null] }] }, 1, 0] } },
      totalCount:    { $sum: 1 },
    }},
    { $sort: { 'latestMessage.createdAt': -1 } },
    { $limit: 100 },
  ]);

  const bookingIds = threads.map(t => t._id);
  const bookings   = await Booking.find({ _id: { $in: bookingIds } })
    .select('customerName serviceName appointmentDate appointmentTime status').lean();
  const bookingMap = {};
  bookings.forEach(b => { bookingMap[b._id.toString()] = b; });

  const result = threads
    .map(t => ({
      bookingId:     t._id,
      booking:       bookingMap[t._id.toString()] || null,
      latestMessage: t.latestMessage,
      unreadCount:   t.unreadCount,
      totalCount:    t.totalCount,
    }))
    .filter(t => t.booking);

  res.json({ success: true, data: result });
}));

// GET /owner/bookings/:bookingId/messages
router.get('/owner/bookings/:bookingId/messages', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const Business = require('../models/Business');
  const salon = await Business.findOne({ ownerId: req.owner._id }).select('_id').lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: salon._id }).select('_id customerId salonId').lean();
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  const messages = await Message.find({ bookingId: booking._id }).sort({ createdAt: 1 }).lean();

  // Mark customer messages as read
  await Message.updateMany(
    { bookingId: booking._id, senderRole: 'customer', readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ success: true, data: { messages } });
}));

// POST /owner/bookings/:bookingId/messages
router.post('/owner/bookings/:bookingId/messages', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, message: 'Message text is required' });

  const Business = require('../models/Business');
  const salon = await Business.findOne({ ownerId: req.owner._id }).select('_id').lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: salon._id }).select('_id customerId salonId status serviceName appointmentDate appointmentTime customerName').lean();
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (['completed', 'cancelled'].includes(booking.status))
    return res.status(400).json({ success: false, message: 'Chat is closed for this booking' });

  const message = await Message.create({
    bookingId:  booking._id,
    salonId:    salon._id,
    customerId: booking.customerId,
    senderRole: 'owner',
    text:       text.trim(),
  });

  // Emit to the shared chat room so both parties receive instantly
  try {
    const io = req.app.get('io');
    if (io) {
      io.to(`chat-${booking._id}`).emit('chat-message', {
        bookingId:  booking._id.toString(),
        message:    { ...message.toObject() },
      });
    }
  } catch {}

  // Push notification to customer's app
  try {
    const { sendExpoPush } = require('../utils/pushNotification');
    const customer = await Customer.findById(booking.customerId).select('pushToken name').lean();
    if (customer?.pushToken) {
      const salonName  = req.owner?.salonName || salon.name || 'Your salon';
      const service    = booking.serviceName  || 'Appointment';
      const apptDate   = booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
      const apptTime   = booking.appointmentTime || '';
      const subtitle   = [service, apptDate, apptTime].filter(Boolean).join(' · ');
      await sendExpoPush(
        customer.pushToken,
        `💬 ${salonName}`,
        `${message.text.slice(0, 80)}\n${subtitle}`,
        { type: 'chat_message', bookingId: booking._id.toString(), salonName, service, apptTime, apptDate },
        { channelId: 'chat' }
      );
    }
  } catch { /* non-critical */ }

  res.status(201).json({ success: true, data: { message } });
}));

// PUT /owner/bookings/:bookingId/messages/read — mark owner's unread messages as read
router.put('/owner/bookings/:bookingId/messages/read', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const Business = require('../models/Business');
  const salon = await Business.findOne({ ownerId: req.owner._id }).select('_id').lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

  await Message.updateMany(
    { bookingId: req.params.bookingId, salonId: salon._id, senderRole: 'customer', readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.json({ success: true });
}));

// GET /customer/bookings/:bookingId/messages
router.get('/customer/bookings/:bookingId/messages', authenticateCustomer, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, customerId: req.customer._id }).select('_id salonId customerId').lean();
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  const messages = await Message.find({ bookingId: booking._id }).sort({ createdAt: 1 }).lean();

  // Mark owner messages as read
  await Message.updateMany(
    { bookingId: booking._id, senderRole: 'owner', readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ success: true, data: { messages } });
}));

// POST /customer/bookings/:bookingId/messages
router.post('/customer/bookings/:bookingId/messages', authenticateCustomer, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, message: 'Message text is required' });

  const booking = await Booking.findOne({ _id: req.params.bookingId, customerId: req.customer._id }).select('_id salonId customerId status serviceName appointmentDate appointmentTime customerName').lean();
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (['completed', 'cancelled'].includes(booking.status))
    return res.status(400).json({ success: false, message: 'Chat is closed for this booking' });

  const message = await Message.create({
    bookingId:  booking._id,
    salonId:    booking.salonId,
    customerId: req.customer._id,
    senderRole: 'customer',
    text:       text.trim(),
  });

  // Emit to chat room (for open chat panel) + salon room (for owner web notification)
  try {
    const io = req.app.get('io');
    if (io) {
      const payload = { bookingId: booking._id.toString(), message: { ...message.toObject() } };
      io.to(`chat-${booking._id}`).emit('chat-message', payload);
      io.to(`salon-${booking.salonId}`).emit('new-chat-message', payload);
    }
  } catch {}

  // Push notification to owner's Android app
  try {
    const { sendExpoPush } = require('../utils/pushNotification');
    const Owner = require('../models/Owner');
    const salonDoc = await Business.findById(booking.salonId).select('ownerId').lean();
    if (salonDoc?.ownerId) {
      const owner = await Owner.findById(salonDoc.ownerId).select('pushToken').lean();
      if (owner?.pushToken) {
        const customerName = booking.customerName || req.customer?.name || 'Customer';
        const service      = booking.serviceName  || 'Appointment';
        const apptDate     = booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
        const apptTime     = booking.appointmentTime || '';
        const subtitle     = [service, apptDate, apptTime].filter(Boolean).join(' · ');
        await sendExpoPush(
          owner.pushToken,
          `💬 ${customerName}`,
          `${message.text.slice(0, 80)}\n${subtitle}`,
          { type: 'chat_message', bookingId: booking._id.toString(), customerName, service, apptTime, apptDate },
          { channelId: 'chat' }
        );
      }
    }
  } catch { /* non-critical */ }

  res.status(201).json({ success: true, data: { message } });
}));

// PUT /customer/bookings/:bookingId/messages/read — mark owner messages as read
router.put('/customer/bookings/:bookingId/messages/read', authenticateCustomer, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, customerId: req.customer._id }).select('_id salonId').lean();
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  await Message.updateMany(
    { bookingId: req.params.bookingId, salonId: booking.salonId, senderRole: 'owner', readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.json({ success: true });
}));

/* =====================================================
   SITE SETTINGS — Hero Images
===================================================== */

const SiteSettings = require('../models/SiteSettings');

// GET /public/site-settings — fetch active hero images (public, no auth)
router.get('/public/site-settings', asyncHandler(async (req, res) => {
  const settings = await SiteSettings.findOne({ key: 'global' }).lean();
  const heroImages = (settings?.heroImages || [])
    .filter(img => img.active)
    .sort((a, b) => a.order - b.order)
    .map(img => ({ url: img.url, label: img.label }));
  res.json({ success: true, data: { heroImages } });
}));

// GET /admin/site-settings — fetch all hero images including inactive (admin only)
router.get('/admin/site-settings', authenticateAdmin, asyncHandler(async (req, res) => {
  const settings = await SiteSettings.findOne({ key: 'global' }).lean();
  res.json({ success: true, data: { heroImages: settings?.heroImages || [] } });
}));

// POST /admin/site-settings/hero-images — upload a new hero image
router.post('/admin/site-settings/hero-images', authenticateAdmin, multerUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });
  const { cloudinary: cl } = require('../config/cloudinary');
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cl.uploader.upload_stream(
      { folder: 'smart-salon/hero', resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
      (err, result) => { if (err) reject(err); else resolve(result); }
    );
    stream.end(req.file.buffer);
  });
  const label = req.body.label || '';
  const settings = await SiteSettings.findOneAndUpdate(
    { key: 'global' },
    {
      $push: {
        heroImages: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          label,
          active: true,
          order: 0,
          addedAt: new Date(),
        },
      },
    },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: { heroImages: settings.heroImages } });
}));

// PATCH /admin/site-settings/hero-images/:imageId — toggle active or update label/order
router.patch('/admin/site-settings/hero-images/:imageId', authenticateAdmin, asyncHandler(async (req, res) => {
  const { active, label, order } = req.body;
  const update = {};
  if (active !== undefined) update['heroImages.$.active'] = active;
  if (label  !== undefined) update['heroImages.$.label']  = label;
  if (order  !== undefined) update['heroImages.$.order']  = order;
  const settings = await SiteSettings.findOneAndUpdate(
    { key: 'global', 'heroImages._id': req.params.imageId },
    { $set: update },
    { new: true }
  );
  if (!settings) return res.status(404).json({ success: false, message: 'Image not found' });
  res.json({ success: true, data: { heroImages: settings.heroImages } });
}));

// DELETE /admin/site-settings/hero-images/:imageId — remove a hero image
router.delete('/admin/site-settings/hero-images/:imageId', authenticateAdmin, asyncHandler(async (req, res) => {
  const settings = await SiteSettings.findOne({ key: 'global' });
  if (!settings) return res.status(404).json({ success: false, message: 'Settings not found' });
  const img = settings.heroImages.id(req.params.imageId);
  if (!img) return res.status(404).json({ success: false, message: 'Image not found' });
  if (img.publicId) {
    try {
      const { cloudinary: cl } = require('../config/cloudinary');
      await cl.uploader.destroy(img.publicId);
    } catch (e) { /* ignore cloudinary delete errors */ }
  }
  settings.heroImages.pull({ _id: req.params.imageId });
  await settings.save();
  res.json({ success: true, data: { heroImages: settings.heroImages } });
}));

/* =====================================================
   ADMIN — SERVICE CATALOG
===================================================== */
const catalogController = require('../controllers/admin/catalogController');

// Public — returns only images, no auth needed (used by owner + user frontends as defaults)
router.get('/public/catalog-images', asyncHandler(async (req, res) => {
  const CatalogEntry = require('../models/CatalogEntry');
  const { businessType } = req.query;
  const filter = { isActive: true };
  if (businessType) filter.businessType = businessType;
  const entries = await CatalogEntry.find(filter, 'category subCategory name categoryImage subCategoryImage defaultImage').lean();
  const categoryImages    = {};
  const subCategoryImages = {}; // key: subCategory label
  const serviceImages     = {};
  for (const e of entries) {
    if (e.categoryImage && !categoryImages[e.category]) categoryImages[e.category] = e.categoryImage;
    if (e.subCategory && e.subCategoryImage && !subCategoryImages[e.subCategory]) subCategoryImages[e.subCategory] = e.subCategoryImage;
    if (e.defaultImage) serviceImages[e.name] = e.defaultImage;
  }
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: { categoryImages, subCategoryImages, serviceImages } });
}));

router.get(   '/admin/catalog/business-types', authenticateAdmin, asyncHandler(catalogController.getBusinessTypes));
router.get(   '/admin/catalog/tree',           authenticateAdmin, asyncHandler(catalogController.getTree));
router.get(   '/admin/catalog/entries',        authenticateAdmin, asyncHandler(catalogController.getEntries));
router.post(  '/admin/catalog/entries',        authenticateAdmin, asyncHandler(catalogController.createEntry));
router.put(   '/admin/catalog/entries/:id',    authenticateAdmin, asyncHandler(catalogController.updateEntry));
router.delete('/admin/catalog/entries/:id',    authenticateAdmin, asyncHandler(catalogController.deleteEntry));
router.delete('/admin/catalog/batch',          authenticateAdmin, asyncHandler(catalogController.deleteBatch));
router.put(   '/admin/catalog/rename',         authenticateAdmin, asyncHandler(catalogController.renameLevel));
router.post(  '/admin/catalog/upload-image',   authenticateAdmin, multerUpload.single('image'), asyncHandler(catalogController.uploadImage));
router.post(  '/admin/catalog/seed',             authenticateAdmin, asyncHandler(catalogController.seed));
router.post(  '/admin/catalog/reseed-slim',      authenticateAdmin, asyncHandler(catalogController.reseedSlim));
router.post(  '/admin/catalog/overwrite-images', authenticateAdmin, asyncHandler(catalogController.overwriteImages));
router.post(  '/admin/catalog/force-overwrite-images', authenticateAdmin, asyncHandler(catalogController.forceOverwriteImages));

/* =====================================================
   OWNER — TEAM MANAGEMENT
===================================================== */
const staffController = require('../controllers/owner/staffController');
router.get(   '/owner/team',                         authenticateOwner,                                  asyncHandler(staffController.getTeam));
router.post(  '/owner/team',                         authenticateOwner, checkSubscription,               asyncHandler(staffController.addStaff));
router.get(   '/owner/team/stats',                   authenticateOwner,                                  asyncHandler(staffController.getTeamStats));
router.put(   '/owner/team/:staffId',                authenticateOwner, checkSubscription, validateObjectId('staffId'), asyncHandler(staffController.updateStaff));
router.delete('/owner/team/:staffId',                authenticateOwner, checkSubscription, validateObjectId('staffId'), asyncHandler(staffController.removeStaff));
router.put(   '/owner/team/:staffId/assign-booking', authenticateOwner, checkSubscription, validateObjectId('staffId'), asyncHandler(staffController.assignBooking));


/* =====================================================
   OWNER — CATALOG (read-only, returns tree for their business type)
===================================================== */
router.get('/owner/catalog', authenticateOwner, asyncHandler(async (req, res) => {
  const CatalogEntry = require('../models/CatalogEntry');
  const Business     = require('../models/Business');

  const salon = await Business.findOne({ ownerId: req.owner._id }).lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Business not found' });

  const businessType = salon.businessType || 'salon';
  const entries = await CatalogEntry.find({ businessType, isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();

  if (!entries.length) {
    return res.json({ success: true, data: { categories: [], empty: true } });
  }

  const catMap = {};
  const subCatImageMap = {}; // subCategory label → image
  for (const e of entries) {
    if (!catMap[e.category]) {
      catMap[e.category] = { label: e.category, categoryImage: e.categoryImage || '', sections: {}, subServices: [] };
    }
    const cat = catMap[e.category];
    if (e.categoryImage && !cat.categoryImage) cat.categoryImage = e.categoryImage;
    if (e.subCategory && e.subCategoryImage && !subCatImageMap[e.subCategory]) subCatImageMap[e.subCategory] = e.subCategoryImage;
    const sec = e.subCategory || 'All Services';
    if (!cat.sections[sec]) cat.sections[sec] = [];
    cat.sections[sec].push(e.name);
    if (!cat.subServices.includes(e.name)) cat.subServices.push(e.name);
  }

  const categories = Object.values(catMap).map(c => ({
    key: c.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    label: c.label,
    categoryImage: c.categoryImage,
    sections: Object.entries(c.sections).map(([label, services]) => ({ label, services })),
    subServices: c.subServices,
    serviceDetails: (() => {
      const map = {};
      for (const e of entries.filter(e2 => e2.category === c.label)) {
        map[e.name] = { defaultImage: e.defaultImage || '', priceHints: e.priceHints || [], durationHints: e.durationHints || [], defaultDuration: e.defaultDuration || 30 };
      }
      return map;
    })(),
  }));

  res.json({ success: true, data: { categories, subCategoryImages: subCatImageMap } });
}));

/* =====================================================
   FIX 5 — STAFF ABSENCE
===================================================== */
// POST /owner/team/:staffId/absent — mark a staff member absent today, auto-reassign their bookings
router.post('/owner/team/:staffId/absent', authenticateOwner, validateObjectId('staffId'), asyncHandler(async (req, res) => {
  const StaffAbsence = require('../models/StaffAbsence');
  const Barber       = require('../models/Barber');
  const salon = await Business.findOne({ ownerId: req.owner._id }).lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Business not found' });

  const staff = await Barber.findOne({ _id: req.params.staffId, salonId: salon._id }).lean();
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

  const nowIST  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const todayStr = nowIST.toISOString().slice(0, 10);
  const { reason = '' } = req.body;

  // Upsert absence record
  await StaffAbsence.findOneAndUpdate(
    { salonId: salon._id, barberId: staff._id, date: todayStr },
    { salonId: salon._id, barberId: staff._id, date: todayStr, reason },
    { upsert: true, new: true }
  );

  // Auto-reassign today's bookings for this staff to other available staff
  const dayStart = new Date(todayStr + 'T00:00:00.000Z');
  const dayEnd   = new Date(todayStr + 'T23:59:59.999Z');
  const affectedBookings = await Booking.find({
    salonId:   salon._id,
    barberId:  staff._id,
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['pending', 'confirmed'] },
  }).lean();

  const otherStaff = await Barber.find({ salonId: salon._id, isActive: true, _id: { $ne: staff._id } }).select('_id').lean();

  const { sendWithRetry } = require('../utils/sendWithRetry');
  let reassigned = 0;

  for (const bk of affectedBookings) {
    // Pick first available staff for this slot
    let newBarber = null;
    for (const ob of otherStaff) {
      const conflict = await Booking.exists({
        barberId: ob._id,
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
        appointmentTime: bk.appointmentTime,
      });
      if (!conflict) { newBarber = ob; break; }
    }
    await Booking.updateOne(
      { _id: bk._id },
      { $set: { barberId: newBarber?._id || null, staffName: null, barberName: null } }
    );
    // Notify customer
    if (bk.customerId) {
      const cust = await Customer.findById(bk.customerId).select('pushToken').lean();
      if (cust?.pushToken) {
        sendWithRetry(
          cust.pushToken,
          'Appointment Update',
          `Your ${bk.appointmentTime} appointment staff has changed due to absence. We apologise for the inconvenience.`,
          { bookingId: bk._id.toString(), type: 'staff_reassigned' },
          { channelId: 'booking_confirmed' },
          bk._id
        ).catch(() => {});
      }
    }
    reassigned++;
  }

  res.json({ success: true, message: `${staff.name} marked absent. ${reassigned} booking(s) reassigned.`, reassigned });
}));

// DELETE /owner/team/:staffId/absent — remove absence for today
router.delete('/owner/team/:staffId/absent', authenticateOwner, validateObjectId('staffId'), asyncHandler(async (req, res) => {
  const StaffAbsence = require('../models/StaffAbsence');
  const salon = await Business.findOne({ ownerId: req.owner._id }).lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Business not found' });

  const todayStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await StaffAbsence.deleteOne({ salonId: salon._id, barberId: req.params.staffId, date: todayStr });
  res.json({ success: true, message: 'Absence removed' });
}));

// GET /owner/team/absences?date=YYYY-MM-DD — list absent staff for a day
router.get('/owner/team/absences', authenticateOwner, asyncHandler(async (req, res) => {
  const StaffAbsence = require('../models/StaffAbsence');
  const salon = await Business.findOne({ ownerId: req.owner._id }).lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Business not found' });

  const date = req.query.date || new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const absences = await StaffAbsence.find({ salonId: salon._id, date }).lean();
  res.json({ success: true, data: { absences } });
}));

/* =====================================================
   FIX 8 — LATE ARRIVAL
===================================================== */
// POST /owner/bookings/:bookingId/late — mark customer as late, move to end of queue
router.post('/owner/bookings/:bookingId/late', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ ownerId: req.owner._id }).lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Business not found' });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: salon._id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({ success: false, message: 'Can only mark late on pending/confirmed bookings' });
  }

  booking.lateMarkedAt = new Date();
  await booking.save();

  // Move to end of queue
  const Queue = require('../models/Queue');
  const queue = await Queue.findOne({ salonId: salon._id });
  if (queue) {
    const idx = queue.queue.findIndex(q => q.bookingId?.toString() === booking._id.toString());
    if (idx > -1) {
      const [entry] = queue.queue.splice(idx, 1);
      queue.queue.push(entry);
      await queue.save();
    }
  }

  // Push to customer
  if (booking.customerId) {
    const cust = await Customer.findById(booking.customerId).select('pushToken').lean();
    if (cust?.pushToken) {
      const { sendWithRetry } = require('../utils/sendWithRetry');
      sendWithRetry(
        cust.pushToken,
        'Late Arrival Notice',
        `You have been marked as late for your ${booking.appointmentTime} appointment at ${salon.name}. Your slot has been moved to the end of the queue.`,
        { bookingId: booking._id.toString(), type: 'late_arrival' },
        { channelId: 'bookings' },
        booking._id
      ).catch(() => {});
    }
  }

  res.json({ success: true, message: 'Booking marked as late and moved to end of queue' });
}));

/* =====================================================
   FIX 10 — CASH RECONCILIATION
===================================================== */
// POST /owner/bookings/:bookingId/collect-cash
router.post('/owner/bookings/:bookingId/collect-cash', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ ownerId: req.owner._id }).lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Business not found' });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: salon._id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (booking.paymentMethod !== 'cash') {
    return res.status(400).json({ success: false, message: 'This booking is not a cash payment' });
  }

  booking.cashCollected    = true;
  booking.cashCollectedAt  = new Date();
  booking.paymentStatus    = 'completed';
  await booking.save();

  res.json({ success: true, message: 'Cash collected', data: booking });
}));

/* =====================================================
   RECEIPT — GET /owner/bookings/:bookingId/receipt
===================================================== */
router.get('/owner/bookings/:bookingId/receipt', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ ownerId: req.owner._id })
    .select('name phone email address city state pincode gstNumber photos')
    .lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Business not found' });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: salon._id })
    .populate('customerId', 'name phone email')
    .populate('barberId', 'name')
    .lean();
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  const logoUrl = salon.photos?.find(p => p.isCover)?.url || salon.photos?.[0]?.url || null;

  const receipt = {
    receiptNumber: `RCP-${booking.bookingId || booking._id.toString().slice(-8).toUpperCase()}`,
    issuedAt: new Date().toISOString(),
    salon: {
      name: salon.name,
      phone: salon.phone,
      email: salon.email,
      address: [salon.address, salon.city, salon.state, salon.pincode].filter(Boolean).join(', '),
      gstNumber: salon.gstNumber || null,
      logoUrl,
    },
    customer: {
      name: booking.customerName || booking.customerId?.name || 'Walk-in Customer',
      phone: booking.customerPhone || booking.customerId?.phone || null,
    },
    staff: { name: booking.staffName || booking.barberName || booking.barberId?.name || null },
    appointment: {
      date: booking.appointmentDate,
      time: booking.appointmentTime,
      bookingId: booking.bookingId,
    },
    services: (booking.services || []).map(s => ({
      name: s.serviceName,
      duration: s.duration,
      price: s.servicePrice,
    })),
    subtotal: booking.totalAmount + (booking.discount || 0),
    discount: booking.discount || 0,
    couponApplied: booking.couponApplied || null,
    total: booking.totalAmount,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
  };

  res.json({ success: true, data: receipt });
}));

/* =====================================================
   RESCHEDULE — PUT /owner/bookings/:bookingId/reschedule
===================================================== */
router.put('/owner/bookings/:bookingId/reschedule', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const salon = await Business.findOne({ ownerId: req.owner._id }).lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Business not found' });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: salon._id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  // Policy: only pending/confirmed can be rescheduled
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({ success: false, message: `Cannot reschedule a ${booking.status} booking` });
  }
  // Policy: max 2 reschedules per booking
  if ((booking.rescheduleCount || 0) >= 2) {
    return res.status(400).json({ success: false, message: 'This booking has already been rescheduled the maximum number of times (2)' });
  }

  const { newDate, newTime, barberId: newBarberId } = req.body;
  if (!newDate || !newTime) return res.status(400).json({ success: false, message: 'newDate and newTime are required' });

  // Policy: new date/time must be in the future
  const newDt = new Date(`${newDate}T${newTime}:00`);
  if (newDt <= new Date()) {
    return res.status(400).json({ success: false, message: 'New appointment time must be in the future' });
  }

  // Policy: must be rescheduled ≥1h before original appointment
  const origDt = new Date(booking.appointmentDate);
  origDt.setHours(0, 0, 0, 0);
  const [oh, om] = (booking.appointmentTime || '00:00').split(':').map(Number);
  const originalFull = new Date(origDt.getTime() + oh * 3600000 + om * 60000);
  const msUntilOriginal = originalFull.getTime() - Date.now();
  if (msUntilOriginal < 3600000) {
    return res.status(400).json({ success: false, message: 'Reschedule must be done at least 1 hour before the original appointment time' });
  }

  const targetBarberId = newBarberId || booking.barberId;

  // Barber absence check on new date
  if (targetBarberId) {
    const StaffAbsence = require('../models/StaffAbsence');
    const absence = await StaffAbsence.findOne({ staffId: targetBarberId, salonId: salon._id, date: newDate }).lean();
    if (absence) {
      const Barber = require('../models/Barber');
      const barber = await Barber.findById(targetBarberId).select('name').lean();
      return res.status(409).json({ success: false, message: `${barber?.name || 'Staff'} is marked absent on that date. Please choose a different date or another staff member.` });
    }
  }

  // Overlap check on new slot (exclude this booking itself)
  const timeToMinutes = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
  function overlapsSlot(b, ns, ne) {
    const bs = timeToMinutes(b.appointmentTime);
    const be = bs + (b.estimatedDuration || 30);
    return ns < be && bs < ne;
  }

  if (targetBarberId) {
    const dayStart = new Date(newDate + 'T00:00:00.000Z');
    const dayEnd   = new Date(newDate + 'T23:59:59.999Z');
    const existingBooks = await Booking.find({
      _id: { $ne: booking._id },
      barberId: targetBarberId,
      salonId: salon._id,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
    }).select('appointmentTime estimatedDuration').lean();

    const ns = timeToMinutes(newTime);
    const ne = ns + (booking.estimatedDuration || 30);
    const conflict = existingBooks.find(b => overlapsSlot(b, ns, ne));
    if (conflict) {
      // Find next available slot hint
      const takenEnds = existingBooks.map(b => timeToMinutes(b.appointmentTime) + (b.estimatedDuration || 30)).sort((a, b) => a - b);
      const slotDur = booking.estimatedDuration || 30;
      let nextMins = ns;
      for (const end of takenEnds) {
        if (nextMins < end && end + slotDur <= 1380) nextMins = end; // up to 11 PM
      }
      const nextH = String(Math.floor(nextMins / 60)).padStart(2, '0');
      const nextM = String(nextMins % 60).padStart(2, '0');
      return res.status(409).json({
        success: false,
        message: `That slot is already taken. Next available: ${nextH}:${nextM}`,
        nextAvailableTime: `${nextH}:${nextM}`,
      });
    }
  }

  // Save history and update booking
  const fromDate = booking.appointmentDate;
  const fromTime = booking.appointmentTime;
  booking.rescheduleHistory = booking.rescheduleHistory || [];
  booking.rescheduleHistory.push({ fromDate, fromTime, toDate: new Date(newDate + 'T12:00:00.000Z'), toTime: newTime, rescheduledBy: 'owner' });
  booking.rescheduleCount  = (booking.rescheduleCount || 0) + 1;
  booking.appointmentDate  = new Date(newDate + 'T12:00:00.000Z');
  booking.appointmentTime  = newTime;
  if (targetBarberId && String(targetBarberId) !== String(booking.barberId)) {
    booking.barberId = targetBarberId;
  }
  // Reset reminder flags so new reminders fire
  booking.remindersSent = { tenMin: false, thirtyMin: false, oneHour: false };
  await booking.save();

  // Cancel old BullMQ reminder jobs
  try {
    const { queues } = require('../queues');
    const reminderQ = queues.bookingReminder;
    if (reminderQ) {
      const bookingIdStr = booking._id.toString();
      await Promise.allSettled([
        reminderQ.remove(`reminder:24h:${bookingIdStr}`),
        reminderQ.remove(`reminder:1h:${bookingIdStr}`),
        reminderQ.remove(`reminder:30min:${bookingIdStr}`),
      ]);
      // Schedule new reminders
      const { addReminderJob } = require('../queues');
      const newAppointmentMs = new Date(`${newDate}T${newTime}:00`).getTime();
      if (newAppointmentMs - Date.now() > 24 * 3600000) {
        await addReminderJob(bookingIdStr, '24h', new Date(newAppointmentMs - 24 * 3600000)).catch(() => {});
      }
      if (newAppointmentMs - Date.now() > 3600000) {
        await addReminderJob(bookingIdStr, '1h', new Date(newAppointmentMs - 3600000)).catch(() => {});
      }
      if (newAppointmentMs - Date.now() > 1800000) {
        await addReminderJob(bookingIdStr, '30min', new Date(newAppointmentMs - 1800000)).catch(() => {});
      }
    }
  } catch { /* non-fatal */ }

  // Push notification to customer
  if (booking.customerId) {
    const cust = await Customer.findById(booking.customerId).select('pushToken').lean();
    if (cust?.pushToken) {
      const { sendWithRetry } = require('../utils/sendWithRetry');
      const dateLabel = new Date(newDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      sendWithRetry(
        cust.pushToken,
        'Appointment Rescheduled',
        `Your booking at ${salon.name} has been moved to ${dateLabel} at ${newTime}.`,
        { bookingId: booking._id.toString(), type: 'rescheduled' },
        { channelId: 'bookings' },
        booking._id
      ).catch(() => {});
    }
  }

  res.json({ success: true, message: 'Booking rescheduled', data: booking });
}));

/* =====================================================
   FIX 7 — GET CANCELLATION POLICY (for customer)
===================================================== */
router.get('/public/salons/:salonId/cancellation-policy', validateObjectId('salonId'), asyncHandler(async (req, res) => {
  const salon = await Business.findById(req.params.salonId)
    .select('cancellationCutoffHours cancellationPolicy')
    .lean();
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });
  res.json({ success: true, data: { cutoffHours: salon.cancellationCutoffHours ?? 2, policy: salon.cancellationPolicy } });
}));

/* =====================================================
   FIX 14 — PERFORMANCE: ownerId index on Business
===================================================== */
// (Index is added at model level — this is a one-time migration endpoint for existing data)
router.post('/admin/maintenance/ensure-indexes', authenticateAdmin, asyncHandler(async (req, res) => {
  await Business.collection.createIndex({ ownerId: 1 });
  await Booking.collection.createIndex({ customerPhone: 1, appointmentDate: 1 });
  res.json({ success: true, message: 'Indexes ensured' });
}));

/* =====================================================
   SESSION MANAGEMENT
===================================================== */
const ownerAuthCtrl = require('../controllers/auth/ownerAuthController');

router.get('/owner/auth/sessions', authenticateOwner, asyncHandler(ownerAuthCtrl.getSessions));
router.delete('/owner/auth/sessions/:sessionId', authenticateOwner, asyncHandler(ownerAuthCtrl.revokeSession));

/* =====================================================
   AUDIT LOGS
===================================================== */
const AuditLog = require('../models/AuditLog');

router.get('/owner/audit', authenticateOwner, validatePaginationParams, asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const { action, entity, from, to } = req.query;
  const businessId = req.owner.businessId;

  const filter = { businessId };
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: { logs, total, page: Number(page), totalPages: Math.ceil(total / limit) } });
}));

/* =====================================================
   BULK BOOKING ACTIONS
===================================================== */
const { validate } = require('../middleware/validate');
const bookingSchema = require('../validation/booking.schema');

router.patch('/owner/bookings/bulk', authenticateOwner, validate(bookingSchema.bulkBookingAction), asyncHandler(async (req, res) => {
  const { ids, action, payload } = req.body;
  const businessId = req.owner.businessId;

  const filter = { _id: { $in: ids }, salonId: businessId, deletedAt: null };
  let updateOp = {};

  if (action === 'cancel') {
    updateOp = { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: payload?.reason || 'Bulk cancelled' } };
  } else if (action === 'complete') {
    updateOp = { $set: { status: 'completed', completedAt: new Date() } };
  } else if (action === 'reassign' && payload?.barberId) {
    updateOp = { $set: { barberId: payload.barberId } };
  }

  const result = await Booking.updateMany(filter, updateOp);
  res.json({ success: true, message: `${result.modifiedCount} bookings updated`, data: { modifiedCount: result.modifiedCount } });
}));

/* =====================================================
   BULK CUSTOMER ACTIONS
===================================================== */
const customerSchema = require('../validation/customer.schema');

router.patch('/owner/customers/bulk', authenticateOwner, validate(customerSchema.bulkCustomerAction), asyncHandler(async (req, res) => {
  const { ids, action, payload } = req.body;
  const businessId = req.owner.businessId;

  if (action === 'block') {
    await Customer.updateMany({ _id: { $in: ids } }, { $addToSet: { blockedSalons: businessId } });
  } else if (action === 'unblock') {
    await Customer.updateMany({ _id: { $in: ids } }, { $pull: { blockedSalons: businessId } });
  } else if (action === 'tag' && payload?.tag) {
    await Customer.updateMany({ _id: { $in: ids } }, { $set: { tag: payload.tag } });
  } else if (action === 'delete') {
    await Customer.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: new Date() } });
  }

  res.json({ success: true, message: `Bulk ${action} applied to ${ids.length} customers` });
}));

/* =====================================================
   STAFF NOTES
===================================================== */
const StaffNote = require('../models/StaffNote');

router.get('/owner/bookings/:bookingId/notes', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const notes = await StaffNote.find({ bookingId: req.params.bookingId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: notes });
}));

router.post('/owner/bookings/:bookingId/notes', authenticateOwner, validateObjectId('bookingId'), asyncHandler(async (req, res) => {
  const { content, isPinned } = req.body;
  if (!content?.trim()) return res.status(400).json({ success: false, message: 'Note content required' });

  const booking = await Booking.findOne({ _id: req.params.bookingId, salonId: req.owner.businessId });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  const note = await StaffNote.create({
    bookingId:  req.params.bookingId,
    salonId:    req.owner.businessId,
    authorId:   req.owner._id,
    authorName: req.user?.name || 'Owner',
    authorRole: 'owner',
    content:    content.trim(),
    isPinned:   isPinned || false,
  });

  res.status(201).json({ success: true, data: note });
}));

router.delete('/owner/bookings/:bookingId/notes/:noteId', authenticateOwner, asyncHandler(async (req, res) => {
  await StaffNote.deleteOne({ _id: req.params.noteId, salonId: req.owner.businessId });
  res.json({ success: true, message: 'Note deleted' });
}));

/* =====================================================
   TEAM CHAT (REST fallback for non-socket clients)
===================================================== */
router.get('/owner/team/chat', authenticateOwner, asyncHandler(async (req, res) => {
  const { before, limit = 50 } = req.query;
  const filter = { salonId: req.owner.businessId, type: 'team' };
  if (before) filter.createdAt = { $lt: new Date(before) };
  const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean();
  res.json({ success: true, data: messages.reverse() });
}));

router.post('/owner/team/chat', authenticateOwner, asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, message: 'Text required' });
  const msg = await Message.create({
    salonId:    req.owner.businessId,
    type:       'team',
    senderId:   req.owner._id,
    senderName: req.user?.name || 'Owner',
    senderRole: 'owner',
    text:       text.trim().slice(0, 1000),
  });
  const io = req.app.get('io');
  if (io) io.to(`team-${req.owner.businessId}`).emit('team-chat-message', msg);
  res.status(201).json({ success: true, data: msg });
}));


/* =====================================================
   WALK-IN WAIT TIME (REST fallback + socket triggers)
===================================================== */
router.get('/owner/queue/:salonId/wait-time', authenticateOwner, validateObjectId('salonId'), asyncHandler(async (req, res) => {
  const { salonId } = req.params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const queue = await Queue.findOne({ salonId, date: { $gte: today } }).lean();

  if (!queue) return res.json({ success: true, data: { estimatedMinutes: 0, queueLength: 0 } });

  const activeItems = (queue.queue || []).filter(i => i.status === 'waiting' || i.status === 'in_progress');
  const estimatedMinutes = activeItems.reduce((sum, i) => sum + (i.estimatedDuration || 30), 0);

  res.json({
    success: true,
    data: { estimatedMinutes, queueLength: activeItems.filter(i => i.status === 'waiting').length },
  });
}));

/* =====================================================
   DEVELOPER — API KEY MANAGEMENT
===================================================== */
const ApiKey = require('../models/ApiKey');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const webhookSchema = require('../validation/webhook.schema');
const WebhookEndpoint = require('../models/WebhookEndpoint');

router.get('/owner/developer/api-keys', authenticateOwner, asyncHandler(async (req, res) => {
  const keys = await ApiKey.find({ ownerId: req.owner._id }).lean();
  res.json({ success: true, data: keys });
}));

router.post('/owner/developer/api-keys', authenticateOwner, asyncHandler(async (req, res) => {
  const { label, permissions } = req.body;
  if (!label?.trim()) return res.status(400).json({ success: false, message: 'Label required' });

  const { rawKey, keyHash, keyPrefix } = ApiKey.generateKey();
  const apiKey = await ApiKey.create({
    ownerId:    req.owner._id,
    businessId: req.owner.businessId,
    label:      label.trim(),
    keyHash,
    keyPrefix,
    permissions: permissions || ['bookings:read'],
  });

  res.status(201).json({ success: true, data: { ...apiKey.toObject(), rawKey } }); // rawKey shown once only
}));

router.delete('/owner/developer/api-keys/:keyId', authenticateOwner, asyncHandler(async (req, res) => {
  await ApiKey.findOneAndDelete({ _id: req.params.keyId, ownerId: req.owner._id });
  res.json({ success: true, message: 'API key revoked' });
}));

/* =====================================================
   DEVELOPER — WEBHOOK ENDPOINTS
===================================================== */
router.get('/owner/developer/webhooks', authenticateOwner, asyncHandler(async (req, res) => {
  const webhooks = await WebhookEndpoint.find({ ownerId: req.owner._id }).lean();
  res.json({ success: true, data: webhooks });
}));

router.post('/owner/developer/webhooks', authenticateOwner, validate(webhookSchema.createWebhook), asyncHandler(async (req, res) => {
  const { url, events, label } = req.body;
  const secret = WebhookEndpoint.generateSecret();
  const webhook = await WebhookEndpoint.create({
    ownerId:    req.owner._id,
    businessId: req.owner.businessId,
    url, events,
    label: label || '',
    secret,
  });

  const doc = webhook.toObject();
  delete doc.secret; // never expose secret in GET — only at creation time
  res.status(201).json({ success: true, data: { ...doc, secret } }); // show secret once
}));

router.patch('/owner/developer/webhooks/:webhookId', authenticateOwner, validate(webhookSchema.updateWebhook), asyncHandler(async (req, res) => {
  const webhook = await WebhookEndpoint.findOneAndUpdate(
    { _id: req.params.webhookId, ownerId: req.owner._id },
    { $set: req.body },
    { new: true }
  );
  if (!webhook) return res.status(404).json({ success: false, message: 'Webhook not found' });
  res.json({ success: true, data: webhook });
}));

router.delete('/owner/developer/webhooks/:webhookId', authenticateOwner, asyncHandler(async (req, res) => {
  await WebhookEndpoint.findOneAndDelete({ _id: req.params.webhookId, ownerId: req.owner._id });
  res.json({ success: true, message: 'Webhook deleted' });
}));

// Retry a specific failed delivery
router.post('/owner/developer/webhooks/:webhookId/retry', authenticateOwner, asyncHandler(async (req, res) => {
  const webhook = await WebhookEndpoint.findOne({ _id: req.params.webhookId, ownerId: req.owner._id }).select('+secret');
  if (!webhook) return res.status(404).json({ success: false, message: 'Webhook not found' });
  webhook.isActive = true;
  webhook.failureCount = 0;
  await webhook.save();
  res.json({ success: true, message: 'Webhook re-enabled for delivery' });
}));

/* =====================================================
   PUBLIC API (for 3rd-party integrations via API key)
===================================================== */
router.get('/public/v1/bookings', apiKeyAuth('bookings:read'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, date } = req.query;
  const filter = { salonId: req.activeSalonId, deletedAt: null };
  if (status) filter.status = status;
  if (date)   filter.appointmentDate = { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) };

  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ appointmentDate: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, data: { bookings, total, page: Number(page), totalPages: Math.ceil(total / limit) } });
}));

router.get('/public/v1/customers', apiKeyAuth('customers:read'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const filter = { deletedAt: null };
  const bookingFilter = { salonId: req.activeSalonId };
  const customerIds = await Booking.distinct('customerId', bookingFilter);
  filter._id = { $in: customerIds };

  const [customers, total] = await Promise.all([
    Customer.find(filter).select('-__v').skip((page - 1) * limit).limit(Number(limit)).lean(),
    Customer.countDocuments(filter),
  ]);
  res.json({ success: true, data: { customers, total, page: Number(page), totalPages: Math.ceil(total / limit) } });
}));

/* =====================================================
   BEFORE/AFTER PORTFOLIO
===================================================== */
router.post('/owner/gallery/before-after', authenticateOwner, asyncHandler(async (req, res) => {
  const { beforeUrl, afterUrl, beforePublicId, afterPublicId, caption, tags } = req.body;
  if (!beforeUrl || !afterUrl) return res.status(400).json({ success: false, message: 'Both before and after URLs required' });

  const [before, after] = await Promise.all([
    BusinessMedia.create({ businessId: req.owner.businessId, type: 'photo', url: beforeUrl, publicId: beforePublicId || '', caption: caption || '', tags: tags || [], role: 'before' }),
    BusinessMedia.create({ businessId: req.owner.businessId, type: 'photo', url: afterUrl, publicId: afterPublicId || '', caption: caption || '', tags: tags || [], role: 'after' }),
  ]);

  // Link the pair
  before.pairedWith = after._id;
  after.pairedWith  = before._id;
  await Promise.all([before.save(), after.save()]);

  res.status(201).json({ success: true, data: { before, after } });
}));

router.get('/owner/gallery/before-after', authenticateOwner, asyncHandler(async (req, res) => {
  const befores = await BusinessMedia.find({
    businessId: req.owner.businessId,
    role:       'before',
    deletedAt:  null,
  }).populate('pairedWith').lean();
  res.json({ success: true, data: befores });
}));


// ══════════════════════════════════════════════════════════════
// STYLE AI — Hairstyle Recommendation
// ══════════════════════════════════════════════════════════════
const multerHair = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg','image/jpg','image/png','image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG/PNG/WebP images are allowed'), false);
  },
});
const hairCtrl      = require('../controllers/customer/hairstyleController');
const adminHairCtrl = require('../controllers/admin/hairstyleAdminController');

// Customer routes
router.post('/customer/hairstyle/recommend',
  rateLimiter(30, 3600000),            // pre-auth IP rate limit
  authenticateCustomer,
  rateLimiter(10, 3600000),            // per-user limit: 10 uploads/hour
  multerHair.single('image'),
  asyncHandler(hairCtrl.recommend)
);
router.get('/customer/hairstyle/by-shape',       authenticateCustomer, asyncHandler(hairCtrl.byShape));
router.post('/customer/hairstyle/interact',      authenticateCustomer, rateLimiter(60, 60000), asyncHandler(hairCtrl.trackInteraction));
router.get('/customer/hairstyle/saved',          authenticateCustomer, asyncHandler(hairCtrl.getSaved));
router.get('/customer/hairstyle/trending',       asyncHandler(hairCtrl.getTrending));   // public
router.post('/customer/hairstyle/stylist-match', authenticateCustomer, rateLimiter(30, 60000), asyncHandler(hairCtrl.getStylistMatch));

// Owner route
router.get('/owner/hairstyle/stats', authenticateOwner, asyncHandler(hairCtrl.getOwnerStats));

// Admin routes
router.get('/admin/v1/hairstyle-catalog',           authenticateAdmin, asyncHandler(adminHairCtrl.listCatalog));
router.post('/admin/v1/hairstyle-catalog',          authenticateAdmin, asyncHandler(adminHairCtrl.createEntry));
router.patch('/admin/v1/hairstyle-catalog/:id',     authenticateAdmin, asyncHandler(adminHairCtrl.updateEntry));
router.delete('/admin/v1/hairstyle-catalog/:id',    authenticateAdmin, asyncHandler(adminHairCtrl.deleteEntry));
router.patch('/admin/v1/hairstyle-catalog/:id/promote', authenticateAdmin, asyncHandler(adminHairCtrl.togglePromotion));
router.get('/admin/v1/hairstyle/analytics',         authenticateAdmin, asyncHandler(adminHairCtrl.getAnalytics));

module.exports = router;