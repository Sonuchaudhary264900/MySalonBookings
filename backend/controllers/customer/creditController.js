// controllers/customer/creditController.js
// Read-only customer-facing endpoints for Booking Credits (non-cash).
const mongoose = require('mongoose');
const creditService = require('../../utils/creditService');
const CreditTransaction = require('../../models/CreditTransaction');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validatePagination } = require('../../utils/validators');

// GET /customer/credits — total + scope breakdown (platform-wide vs per-shop)
exports.getCredits = async (req, res) => {
  const breakdown = await creditService.getBreakdown(req.customer._id);
  res.json(formatSuccessResponse(breakdown, 'Credits retrieved'));
};

// GET /customer/credits/transactions — paginated history
exports.getCreditTransactions = async (req, res) => {
  const { page, limit } = validatePagination(req.query.page, req.query.limit);
  const filter = { customerId: req.customer._id };
  const [transactions, total] = await Promise.all([
    CreditTransaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CreditTransaction.countDocuments(filter),
  ]);
  res.json(formatSuccessResponse(
    { transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    'Retrieved'
  ));
};

// GET /customer/credits/available?salonId= — redeemable amount for a given salon
exports.getAvailableForSalon = async (req, res) => {
  const { salonId } = req.query;
  if (!salonId || !mongoose.isValidObjectId(salonId)) {
    return res.status(400).json(formatErrorResponse('Valid salonId is required', 400));
  }
  const available = await creditService.availableForSalon(req.customer._id, salonId);
  res.json(formatSuccessResponse({ available }, 'Retrieved'));
};
