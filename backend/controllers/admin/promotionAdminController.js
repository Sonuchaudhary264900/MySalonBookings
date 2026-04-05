'use strict';

const Promotion        = require('../../models/Promotion');
const PromotionPricing = require('../../models/PromotionPricing');
const Salon            = require('../../models/Salon');

// ── GET /admin/promotions/pricing ─────────────────────────────────────────
const getPricingTiers = async (req, res) => {
  const tiers = await PromotionPricing.find()
    .sort({ sortOrder: 1, radiusKm: 1 })
    .lean();
  res.json({ success: true, data: { tiers } });
};

// ── POST /admin/promotions/pricing ────────────────────────────────────────
// Body: { radiusKm, pricePerWeek, label?, isActive?, sortOrder? }
const createPricingTier = async (req, res) => {
  const { radiusKm, pricePerWeek, label, isActive, sortOrder } = req.body;
  if (!radiusKm || pricePerWeek == null) {
    return res.status(400).json({ success: false, message: 'radiusKm and pricePerWeek are required' });
  }

  const existing = await PromotionPricing.findOne({ radiusKm: Number(radiusKm) });
  if (existing) {
    return res.status(409).json({ success: false, message: `A pricing tier for ${radiusKm} km already exists` });
  }

  const tier = await PromotionPricing.create({
    radiusKm:     Number(radiusKm),
    pricePerWeek: Number(pricePerWeek),
    label:        label || `${radiusKm} km – ₹${pricePerWeek}/week`,
    isActive:     isActive !== undefined ? isActive : true,
    sortOrder:    sortOrder || 0,
  });

  res.status(201).json({ success: true, data: { tier } });
};

// ── PUT /admin/promotions/pricing/:id ────────────────────────────────────
const updatePricingTier = async (req, res) => {
  const { pricePerWeek, label, isActive, sortOrder } = req.body;
  const tier = await PromotionPricing.findById(req.params.id);
  if (!tier) return res.status(404).json({ success: false, message: 'Tier not found' });

  if (pricePerWeek != null) tier.pricePerWeek = Number(pricePerWeek);
  if (label        != null) tier.label        = label;
  if (isActive     != null) tier.isActive     = isActive;
  if (sortOrder    != null) tier.sortOrder     = sortOrder;

  // Auto-update label if not manually provided
  if (pricePerWeek != null && !label) {
    tier.label = `${tier.radiusKm} km – ₹${tier.pricePerWeek}/week`;
  }

  await tier.save();
  res.json({ success: true, data: { tier } });
};

// ── DELETE /admin/promotions/pricing/:id ─────────────────────────────────
const deletePricingTier = async (req, res) => {
  const tier = await PromotionPricing.findByIdAndDelete(req.params.id);
  if (!tier) return res.status(404).json({ success: false, message: 'Tier not found' });
  res.json({ success: true, message: 'Pricing tier deleted' });
};

// ── GET /admin/promotions/all ─────────────────────────────────────────────
// Query: ?status=active|expired|all&page=1&limit=20
const getAllPromotions = async (req, res) => {
  const { status = 'all', page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (status === 'active') {
    filter.status = 'active';
    filter.endDate = { $gte: new Date() };
  } else if (status !== 'all') {
    filter.status = status;
  }

  const [promotions, total] = await Promise.all([
    Promotion.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('salonId', 'name city phone')
      .populate('ownerId', 'name email phone')
      .lean(),
    Promotion.countDocuments(filter),
  ]);

  res.json({ success: true, data: { promotions, total, page: Number(page), limit: Number(limit) } });
};

// ── PUT /admin/promotions/:id/cancel ─────────────────────────────────────
const cancelPromotion = async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) return res.status(404).json({ success: false, message: 'Promotion not found' });
  if (promotion.status !== 'active') {
    return res.status(400).json({ success: false, message: `Cannot cancel a promotion with status '${promotion.status}'` });
  }
  promotion.status = 'cancelled';
  await promotion.save();
  res.json({ success: true, message: 'Promotion cancelled', data: { promotion } });
};

// ── GET /admin/promotions/stats ───────────────────────────────────────────
const getStats = async (req, res) => {
  const now = new Date();
  const [active, total, revenue] = await Promise.all([
    Promotion.countDocuments({ status: 'active', endDate: { $gte: now } }),
    Promotion.countDocuments({ status: { $in: ['active', 'expired'] } }),
    Promotion.aggregate([
      { $match: { status: { $in: ['active', 'expired'] } } },
      { $group: { _id: null, total: { $sum: '$pricePaid' } } },
    ]),
  ]);
  res.json({
    success: true,
    data: {
      activePromotions: active,
      totalPromotions:  total,
      totalRevenue:     revenue[0]?.total || 0,
    },
  });
};

module.exports = {
  getPricingTiers,
  createPricingTier,
  updatePricingTier,
  deletePricingTier,
  getAllPromotions,
  cancelPromotion,
  getStats,
};
