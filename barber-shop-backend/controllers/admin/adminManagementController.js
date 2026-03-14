const Owner = require('../../models/Owner');
const Salon = require('../../models/Salon');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');

// GET /admin/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalOwners, totalSalons, pendingSalons, approvedSalons, rejectedSalons
    ] = await Promise.all([
      Owner.countDocuments(),
      Salon.countDocuments(),
      Salon.countDocuments({ approvalStatus: 'pending' }),
      Salon.countDocuments({ approvalStatus: 'approved' }),
      Salon.countDocuments({ approvalStatus: 'rejected' }),
    ]);
    res.json(formatSuccessResponse({ totalOwners, totalSalons, pendingSalons, approvedSalons, rejectedSalons }, 'Stats fetched'));
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/owners?page=1&limit=10&search=
const getAllOwners = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = search
      ? { $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ] }
      : {};
    const [owners, total] = await Promise.all([
      Owner.find(query)
        .select('name email phone status approvalStatus createdAt salonId')
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
    if (state) query.state = { $regex: `^${state}$`, $options: 'i' };
    if (city) query.city = { $regex: `^${city}$`, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }
    const [salons, total] = await Promise.all([
      Salon.find(query)
        .populate('ownerId', 'name phone email')
        .select('name city state address approvalStatus isActive isApproved createdAt photos logo totalBookings averageRating ownerId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Salon.countDocuments(query),
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
      Salon.distinct('state', { state: { $ne: null, $ne: '' } }),
      Salon.distinct('city', { ...stateQuery, city: { $ne: null, $ne: '' } }),
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
    const salon = await Salon.findById(req.params.salonId);
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
    const salon = await Salon.findById(req.params.salonId).populate('ownerId', 'name phone email status approvalStatus createdAt').lean();
    if (!salon) return res.status(404).json(formatErrorResponse('Salon not found', 404));
    res.json(formatSuccessResponse({ salon }, 'Success'));
  } catch (error) {
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

module.exports = { getDashboardStats, getAllOwners, getAllSalons, toggleSalonActive, getSalonDetail, getFilterOptions };
