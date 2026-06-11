// controllers/payment/walletController.js
const WalletTransaction = require('../../models/WalletTransaction');
const { getOrCreateWallet, credit } = require('../../utils/walletService');
const { createOrder, verifyPaymentSignature, getPaymentDetails } = require('../../config/razorpay');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validatePagination } = require('../../utils/validators');
const messages = require('../../utils/messages');

// ===================================================
// GET WALLET BALANCE
// ===================================================
const getWallet = async (ownerId, ownerType, res) => {
  const wallet = await getOrCreateWallet(ownerId, ownerType);
  return res.status(200).json(formatSuccessResponse({
    balance: wallet.balance,
    currency: wallet.currency,
  }, messages.GENERIC.RETRIEVED));
};

// ===================================================
// GET WALLET TRANSACTIONS (paginated)
// ===================================================
const getTransactions = async (ownerId, ownerType, req, res) => {
  const { page, limit } = validatePagination(req.query.page, req.query.limit);

  const filter = { ownerId, ownerType };

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments(filter),
  ]);

  return res.status(200).json(formatSuccessResponse({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, messages.GENERIC.RETRIEVED));
};

// ===================================================
// CREATE RECHARGE ORDER
// ===================================================
const createRechargeOrder = async (ownerId, ownerType, req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json(formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400));
  }
  if (Number(amount) > 100000) {
    return res.status(400).json(formatErrorResponse('Maximum recharge amount is ₹1,00,000.', 400));
  }

  const order = await createOrder(Number(amount), ownerId, 'wallet_recharge');

  if (!order.success) {
    return res.status(503).json(formatErrorResponse(order.message || messages.PAYMENT.PAYMENT_FAILED, 503));
  }

  return res.status(200).json(formatSuccessResponse({
    order,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  }, messages.PAYMENT.PAYMENT_INITIATED));
};

// ===================================================
// VERIFY RECHARGE & CREDIT WALLET
// ===================================================
const verifyRecharge = async (ownerId, ownerType, req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json(formatErrorResponse(messages.GENERIC.MISSING_REQUIRED_FIELDS, 400));
  }

  const verification = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!verification.success) {
    return res.status(400).json(formatErrorResponse(messages.PAYMENT.PAYMENT_INVALID_SIGNATURE, 400));
  }

  // Idempotency: a payment can only be credited once
  const existing = await WalletTransaction.findOne({ razorpayPaymentId: razorpay_payment_id });
  if (existing) {
    return res.status(200).json(formatSuccessResponse({ transaction: existing }, messages.PAYMENT.PAYMENT_ALREADY_PROCESSED));
  }

  // Trust the amount actually captured by Razorpay, not the client
  const paymentDetails = await getPaymentDetails(razorpay_payment_id);
  if (!paymentDetails.success || !paymentDetails.amount) {
    return res.status(400).json(formatErrorResponse(messages.PAYMENT.PAYMENT_FAILED, 400));
  }

  const { wallet, transaction } = await credit(ownerId, ownerType, paymentDetails.amount, 'recharge', {
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    description: 'Wallet recharge',
    status: 'success',
  });

  return res.status(200).json(formatSuccessResponse({
    balance: wallet.balance,
    transaction,
  }, messages.PAYMENT.PAYMENT_SUCCESSFUL));
};

// ===================================================
// CUSTOMER ROUTE HANDLERS
// ===================================================
exports.getCustomerWallet = (req, res) => getWallet(req.customer._id, 'Customer', res);
exports.getCustomerTransactions = (req, res) => getTransactions(req.customer._id, 'Customer', req, res);
exports.createCustomerRechargeOrder = (req, res) => createRechargeOrder(req.customer._id, 'Customer', req, res);
exports.verifyCustomerRecharge = (req, res) => verifyRecharge(req.customer._id, 'Customer', req, res);

// ===================================================
// OWNER ROUTE HANDLERS
// ===================================================
exports.getOwnerWallet = (req, res) => getWallet(req.owner._id, 'Owner', res);
exports.getOwnerTransactions = (req, res) => getTransactions(req.owner._id, 'Owner', req, res);
exports.createOwnerRechargeOrder = (req, res) => createRechargeOrder(req.owner._id, 'Owner', req, res);
exports.verifyOwnerRecharge = (req, res) => verifyRecharge(req.owner._id, 'Owner', req, res);
