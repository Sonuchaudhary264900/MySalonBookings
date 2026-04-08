const Owner = require('../../models/Owner');
const Business = require('../../models/Business');
const BusinessMedia = require('../../models/BusinessMedia');
const Booking = require('../../models/Booking');
const Customer = require('../../models/Customer');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');

// Escape special regex characters to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /admin/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalOwners, totalSalons, pendingSalons, approvedSalons, rejectedSalons
    ] = await Promise.all([
      Owner.countDocuments(),
      Business.countDocuments(),
      Business.countDocuments({ approvalStatus: 'pending' }),
      Business.countDocuments({ approvalStatus: 'approved' }),
      Business.countDocuments({ approvalStatus: 'rejected' }),
    ]);
    res.json(formatSuccessResponse({ totalOwners, totalSalons, pendingSalons, approvedSalons, rejectedSalons }, 'Stats fetched'));
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

const BIZ_TYPE_TO_OWNER_TYPE = {
  barbershop:    'BARBERSHOP_OWNER',
  salon:         'SALON_OWNER',
  spa_wellness:  'SPA_WELLNESS_OWNER',
  makeup_bridal: 'MAKEUP_BRIDAL_OWNER',
  skin_derma:    'SKIN_DERMA_OWNER',
};

// GET /admin/owners?page=1&limit=10&search=&businessType=&status=
const getAllOwners = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', businessType = '', status = '' } = req.query;
    const query = search
      ? { $or: [
          { name: { $regex: escapeRegex(search), $options: 'i' } },
          { email: { $regex: escapeRegex(search), $options: 'i' } },
          { phone: { $regex: escapeRegex(search), $options: 'i' } },
        ] }
      : {};

    // Filter by businessType — check ownerType (direct) and businessId join (includes salonType legacy field)
    if (businessType) {
      const ownerType = BIZ_TYPE_TO_OWNER_TYPE[businessType];
      // Also match salonType (legacy field before rename) in case businessType was not migrated yet
      const matchingBusinesses = await Business.find({
        $or: [{ businessType }, { salonType: businessType }],
      }).select('_id').lean();
      const businessIds = matchingBusinesses.map(s => s._id);
      const typeConditions = [];
      if (ownerType) typeConditions.push({ ownerType });
      if (businessIds.length > 0) typeConditions.push({ businessId: { $in: businessIds } });
      if (typeConditions.length > 0) {
        if (search) {
          // search already has $or — wrap both in $and
          const searchOr = query.$or;
          delete query.$or;
          query.$and = [{ $or: searchOr }, { $or: typeConditions }];
        } else {
          query.$or = typeConditions;
        }
      }
    }

    // Filter by status (e.g. mobile_verified = phone only, no business)
    if (status) {
      query.status = status;
      // For mobile_verified, exclude anyone who has already registered/approved a business
      if (status === 'mobile_verified') {
        query.businessId = null; // matches both missing and explicitly null fields
      }
    }

    const [owners, total] = await Promise.all([
      Owner.find(query)
        .select('name email phone status approvalStatus createdAt businessId')
        .populate('businessId', 'businessType name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Owner.countDocuments(query),
    ]);
    res.json(formatSuccessResponse({
      owners,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    }, 'Owners fetched'));
  } catch (error) {
    console.error('Get owners error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/salons/all?page=1&limit=10&search=&status=&state=&city=
const getAllSalons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', state = '', city = '' } = req.query;
    const query = {};
    if (status) query.approvalStatus = status;
    if (state) query.state = { $regex: `^${escapeRegex(state)}$`, $options: 'i' };
    if (city) query.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { city: { $regex: escapeRegex(search), $options: 'i' } },
        { address: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const [salons, total] = await Promise.all([
      Business.find(query)
        .populate('ownerId', 'name phone email')
        .select('name city state address approvalStatus isActive isApproved createdAt photos logo videoUrl businessLicenseUrl businessRegistrationUrl totalBookings averageRating ownerId businessType description')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Business.countDocuments(query),
    ]);
    res.json(formatSuccessResponse({
      salons,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    }, 'Salons fetched'));
  } catch (error) {
    console.error('Get all salons error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/salons/filter-options?state= — returns distinct states & cities
const getFilterOptions = async (req, res) => {
  try {
    const { state = '' } = req.query;
    const stateQuery = state ? { state: { $regex: `^${state}$`, $options: 'i' } } : {};
    const [states, cities] = await Promise.all([
      Business.distinct('state', { state: { $ne: null, $ne: '' } }),
      Business.distinct('city', { ...stateQuery, city: { $ne: null, $ne: '' } }),
    ]);
    res.json(formatSuccessResponse({
      states: states.filter(Boolean).sort(),
      cities: cities.filter(Boolean).sort(),
    }, 'Filter options fetched'));
  } catch (error) {
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// PUT /admin/salons/:salonId/toggle
const toggleSalonActive = async (req, res) => {
  try {
    const salon = await Business.findById(req.params.salonId);
    if (!salon) return res.status(404).json(formatErrorResponse('Salon not found', 404));
    salon.isActive = !salon.isActive;
    await salon.save();
    res.json(formatSuccessResponse({ isActive: salon.isActive }, salon.isActive ? 'Salon activated' : 'Salon deactivated'));
  } catch (error) {
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/salons/:salonId/detail
const getSalonDetail = async (req, res) => {
  try {
    const salon = await Business.findById(req.params.salonId).populate('ownerId', 'name phone email status approvalStatus createdAt').lean();
    if (!salon) return res.status(404).json(formatErrorResponse('Salon not found', 404));
    res.json(formatSuccessResponse({ salon }, 'Success'));
  } catch (error) {
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/bookings?page&limit&status&from&to&search
const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 15, status = '', from = '', to = '', search = '' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (from || to) {
      query.appointmentDate = {};
      if (from) query.appointmentDate.$gte = new Date(from);
      if (to)   query.appointmentDate.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    if (search) {
      query.$or = [
        { customerName: { $regex: escapeRegex(search), $options: 'i' } },
        { customerPhone: { $regex: escapeRegex(search), $options: 'i' } },
        { salonName: { $regex: escapeRegex(search), $options: 'i' } },
        { bookingId: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Booking.countDocuments(query),
    ]);
    res.json(formatSuccessResponse({
      bookings,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    }, 'Bookings fetched'));
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/customers?page&limit&search
const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '' } = req.query;
    const query = search
      ? { $or: [
          { name:  { $regex: escapeRegex(search), $options: 'i' } },
          { phone: { $regex: escapeRegex(search), $options: 'i' } },
          { email: { $regex: escapeRegex(search), $options: 'i' } },
        ] }
      : {};
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .select('name phone email createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Customer.countDocuments(query),
    ]);

    // Attach booking count per customer
    const ids = customers.map(c => c._id);
    const counts = await Booking.aggregate([
      { $match: { customerId: { $in: ids } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });
    const enriched = customers.map(c => ({ ...c, bookingCount: countMap[c._id.toString()] || 0 }));

    res.json(formatSuccessResponse({
      customers: enriched,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    }, 'Customers fetched'));
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/analytics
const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Start   = new Date(startOfToday); last7Start.setDate(last7Start.getDate() - 6);
    const last30Start  = new Date(startOfToday); last30Start.setDate(last30Start.getDate() - 29);

    const [
      totalBookings, totalCustomers, totalOwners, totalSalons,
      bookingsByStatus, revenueAgg, todayBookings, last30Bookings,
      dailyTrend, topSalons,
    ] = await Promise.all([
      Booking.countDocuments(),
      Customer.countDocuments(),
      Owner.countDocuments(),
      Business.countDocuments({ approvalStatus: 'approved' }),

      // bookings grouped by status
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

      // total revenue from completed bookings
      Booking.aggregate([
        { $match: { status: 'completed', totalAmount: { $exists: true } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // today's bookings
      Booking.countDocuments({ createdAt: { $gte: startOfToday } }),

      // last 30 days bookings
      Booking.countDocuments({ createdAt: { $gte: last30Start } }),

      // daily count last 7 days
      Booking.aggregate([
        { $match: { createdAt: { $gte: last7Start } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),

      // top 5 salons by booking count
      Booking.aggregate([
        { $group: { _id: '$salonId', salonName: { $first: '$salonName' }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Build a full 7-day array (fill missing days with 0)
    const trendMap = {};
    dailyTrend.forEach(d => { trendMap[d._id] = d.count; });
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trend.push({ date: key, count: trendMap[key] || 0 });
    }

    const statusMap = {};
    bookingsByStatus.forEach(b => { statusMap[b._id] = b.count; });

    res.json(formatSuccessResponse({
      totalBookings,
      totalCustomers,
      totalOwners,
      totalSalons,
      totalRevenue: revenueAgg[0]?.total || 0,
      todayBookings,
      last30Bookings,
      bookingsByStatus: statusMap,
      dailyTrend: trend,
      topSalons,
    }, 'Analytics fetched'));
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/salons/:salonId/media — returns all BusinessMedia for a business
const getBusinessMedia = async (req, res) => {
  try {
    const media = await BusinessMedia.find({ businessId: req.params.salonId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(formatSuccessResponse({ media }, 'Media fetched'));
  } catch (error) {
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

module.exports = { getDashboardStats, getAllOwners, getAllSalons, toggleSalonActive, getSalonDetail, getFilterOptions, getAllBookings, getAllCustomers, getAnalytics, getBusinessMedia };
