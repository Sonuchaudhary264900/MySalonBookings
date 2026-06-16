// controllers/admin/creditAdminController.js
// Admin: grant/remove Booking Credits, view a customer's credit history,
// list business referrals, and configure referral reward amounts.
const mongoose = require('mongoose');
const creditService = require('../../utils/creditService');
const CreditTransaction = require('../../models/CreditTransaction');
const BusinessReferral = require('../../models/BusinessReferral');
const SiteSettings = require('../../models/SiteSettings');
const AuditLog = require('../../models/AuditLog');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validatePagination } = require('../../utils/validators');

const audit = (req, action, entityId, meta) =>
  AuditLog.create({
    ownerId: req.admin?._id, actorRole: 'admin', actorName: req.admin?.email,
    action, entity: 'Credit', entityId, meta,
    ip: req.ip, userAgent: req.headers['user-agent'],
  }).catch(() => {});

// POST /admin/credits/grant  { customerId, amount, scopeSalonId?, description? }
exports.grantCredits = async (req, res) => {
  const { customerId, amount, scopeSalonId, description } = req.body;
  if (!customerId || !mongoose.isValidObjectId(customerId)) return res.status(400).json(formatErrorResponse('Valid customerId required', 400));
  if (!amount || Number(amount) <= 0) return res.status(400).json(formatErrorResponse('Amount must be positive', 400));
  if (scopeSalonId && !mongoose.isValidObjectId(scopeSalonId)) return res.status(400).json(formatErrorResponse('Invalid scopeSalonId', 400));
  const { available } = await creditService.adminGrant(customerId, Math.floor(Number(amount)), scopeSalonId || null, description || 'Admin grant');
  await audit(req, 'credit.granted', customerId, { amount: Math.floor(Number(amount)), scopeSalonId: scopeSalonId || null });
  res.json(formatSuccessResponse({ available }, 'Credits granted'));
};

// POST /admin/credits/remove  { customerId, amount, scopeSalonId? }
exports.removeCredits = async (req, res) => {
  const { customerId, amount, scopeSalonId, description } = req.body;
  if (!customerId || !mongoose.isValidObjectId(customerId)) return res.status(400).json(formatErrorResponse('Valid customerId required', 400));
  if (!amount || Number(amount) <= 0) return res.status(400).json(formatErrorResponse('Amount must be positive', 400));
  try {
    const { available } = await creditService.adminRemove(customerId, Math.floor(Number(amount)), scopeSalonId || null, description || 'Admin removal');
    await audit(req, 'credit.removed', customerId, { amount: Math.floor(Number(amount)), scopeSalonId: scopeSalonId || null });
    res.json(formatSuccessResponse({ available }, 'Credits removed'));
  } catch (e) {
    if (e.code === 'INSUFFICIENT_CREDITS') return res.status(400).json(formatErrorResponse('Customer does not have that many credits in this scope', 400));
    throw e;
  }
};

// GET /admin/credits/:customerId  → breakdown + recent history
exports.getCustomerCredits = async (req, res) => {
  const { customerId } = req.params;
  if (!mongoose.isValidObjectId(customerId)) return res.status(400).json(formatErrorResponse('Invalid customerId', 400));
  const { page, limit } = validatePagination(req.query.page, req.query.limit);
  const [breakdown, transactions, total] = await Promise.all([
    creditService.getBreakdown(customerId),
    CreditTransaction.find({ customerId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CreditTransaction.countDocuments({ customerId }),
  ]);
  res.json(formatSuccessResponse({ breakdown, transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, 'Retrieved'));
};

// GET /admin/referrals?status=&page=&limit=
exports.listReferrals = async (req, res) => {
  const { page, limit } = validatePagination(req.query.page, req.query.limit);
  const filter = {};
  if (req.query.status && ['pending', 'rewarded', 'rejected'].includes(req.query.status)) filter.status = req.query.status;
  const [referrals, total] = await Promise.all([
    BusinessReferral.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('referredOwnerId', 'name phone').lean(),
    BusinessReferral.countDocuments(filter),
  ]);
  res.json(formatSuccessResponse({ referrals, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, 'Retrieved'));
};

// GET /admin/referral-config
exports.getReferralConfig = async (req, res) => {
  const s = await SiteSettings.findOne({ key: 'global' }).lean();
  res.json(formatSuccessResponse({
    referralRewardAmount: s?.referralRewardAmount ?? 50,
    referralMinBookings:  s?.referralMinBookings ?? 20,
    referralMinDays:      s?.referralMinDays ?? 7,
  }, 'Retrieved'));
};

// PUT /admin/referral-config  { referralRewardAmount?, referralMinBookings?, referralMinDays? }
exports.updateReferralConfig = async (req, res) => {
  const set = {};
  for (const k of ['referralRewardAmount', 'referralMinBookings', 'referralMinDays']) {
    if (req.body[k] != null) set[k] = Math.max(0, Math.floor(Number(req.body[k]) || 0));
  }
  const s = await SiteSettings.findOneAndUpdate({ key: 'global' }, { $set: set }, { new: true, upsert: true });
  await audit(req, 'referral.config_updated', null, set);
  res.json(formatSuccessResponse({
    referralRewardAmount: s.referralRewardAmount,
    referralMinBookings:  s.referralMinBookings,
    referralMinDays:      s.referralMinDays,
  }, 'Updated'));
};
