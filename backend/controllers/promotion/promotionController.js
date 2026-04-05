'use strict';

const Promotion        = require('../../models/Promotion');
const PromotionPricing = require('../../models/PromotionPricing');
const { createOrder, verifyPaymentSignature } = require('../../config/razorpay');

const PROMOTION_DURATION_DAYS = 7;

// ── GET /owner/promotions/pricing ──────────────────────────────────────────
// Returns all active pricing tiers (also accessible publicly)
const getPricing = async (req, res) => {
  const tiers = await PromotionPricing.find({ isActive: true })
    .sort({ sortOrder: 1, radiusKm: 1 })
    .lean();
  res.json({ success: true, data: { tiers } });
};

// ── GET /owner/promotions/active ───────────────────────────────────────────
const getActivePromotion = async (req, res) => {
  const now = new Date();
  const promotion = await Promotion.findOne({
    ownerId: req.owner._id,
    status: 'active',
    endDate: { $gte: now },
  })
    .populate('pricingTierId', 'radiusKm pricePerWeek label')
    .lean();

  res.json({ success: true, data: { promotion } });
};

// ── GET /owner/promotions/history ──────────────────────────────────────────
const getHistory = async (req, res) => {
  const promotions = await Promotion.find({ ownerId: req.owner._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json({ success: true, data: { promotions } });
};

// ── POST /owner/promotions/create-order ───────────────────────────────────
// Body: { pricingTierId }
const createPromotionOrder = async (req, res) => {
  const { pricingTierId } = req.body;
  if (!pricingTierId) {
    return res.status(400).json({ success: false, message: 'pricingTierId is required' });
  }

  const tier = await PromotionPricing.findById(pricingTierId);
  if (!tier || !tier.isActive) {
    return res.status(404).json({ success: false, message: 'Pricing tier not found or inactive' });
  }

  // Owner must have an approved salon
  const owner = req.owner;
  if (!owner.salonId) {
    return res.status(400).json({ success: false, message: 'No salon found for this owner' });
  }

  // Block if already has an active promotion
  const now = new Date();
  const existing = await Promotion.findOne({
    ownerId: owner._id,
    status: 'active',
    endDate: { $gte: now },
  });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: `You already have an active promotion (${existing.radiusKm} km) running until ${existing.endDate.toLocaleDateString('en-IN')}. It must expire before purchasing a new one.`,
    });
  }

  // Create Razorpay order (amount in paise)
  const amountPaise = Math.round(tier.pricePerWeek * 100);
  let order;
  try {
    order = await createOrder(
      tier.pricePerWeek,
      owner._id.toString(),
      `promo_${owner.salonId}_${Date.now()}`,
      owner.email || '',
      owner.phone || ''
    );
  } catch (err) {
    console.error('Razorpay order error (promotion):', err);
    return res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }

  if (!order.success) {
    return res.status(500).json({ success: false, message: 'Payment gateway error' });
  }

  // Create pending Promotion record
  const promotion = await Promotion.create({
    salonId:       owner.salonId,
    ownerId:       owner._id,
    pricingTierId: tier._id,
    radiusKm:      tier.radiusKm,
    pricePaid:     tier.pricePerWeek,
    status:        'pending_payment',
    razorpayOrderId: order.orderId,
  });

  res.json({
    success: true,
    data: {
      promotionId:   promotion._id,
      razorpayOrderId: order.orderId,
      amount:        amountPaise,
      currency:      'INR',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      tier: {
        radiusKm:     tier.radiusKm,
        pricePerWeek: tier.pricePerWeek,
        label:        tier.label,
      },
    },
  });
};

// ── POST /owner/promotions/verify-payment ─────────────────────────────────
// Body: { promotionId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
const verifyPromotionPayment = async (req, res) => {
  const { promotionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  if (!promotionId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ success: false, message: 'All payment fields are required' });
  }

  const promotion = await Promotion.findOne({
    _id:    promotionId,
    ownerId: req.owner._id,
    status: 'pending_payment',
  });
  if (!promotion) {
    return res.status(404).json({ success: false, message: 'Promotion order not found' });
  }

  const verification = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!verification.success) {
    return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + PROMOTION_DURATION_DAYS);

  promotion.status            = 'active';
  promotion.startDate         = now;
  promotion.endDate           = endDate;
  promotion.razorpayPaymentId = razorpayPaymentId;
  await promotion.save();

  res.json({
    success: true,
    message: `Your salon is now promoted within ${promotion.radiusKm} km for 1 week!`,
    data: {
      promotion: {
        _id:       promotion._id,
        radiusKm:  promotion.radiusKm,
        startDate: promotion.startDate,
        endDate:   promotion.endDate,
        status:    promotion.status,
      },
    },
  });
};

module.exports = {
  getPricing,
  getActivePromotion,
  getHistory,
  createPromotionOrder,
  verifyPromotionPayment,
};
