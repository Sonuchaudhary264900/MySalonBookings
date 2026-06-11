// controllers/payment/walletController.js
const WalletTransaction = require('../../models/WalletTransaction');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const { getOrCreateWallet, credit, debit } = require('../../utils/walletService');
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
// REQUEST WITHDRAWAL — debit wallet, create pending request
// ===================================================
const UPI_ID_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
const MIN_WITHDRAWAL = 50;

const requestWithdrawal = async (ownerId, ownerType, req, res) => {
  const { amount, upiId } = req.body;

  if (!amount || isNaN(amount) || Number(amount) < MIN_WITHDRAWAL) {
    return res.status(400).json(formatErrorResponse(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`, 400));
  }
  if (!upiId || !UPI_ID_REGEX.test(String(upiId).trim())) {
    return res.status(400).json(formatErrorResponse('Enter a valid UPI ID (e.g. name@upi).', 400));
  }

  // Only one in-flight withdrawal at a time keeps manual processing simple
  const inFlight = await WithdrawalRequest.findOne({ ownerId, ownerType, status: 'pending' });
  if (inFlight) {
    return res.status(409).json(formatErrorResponse('You already have a pending withdrawal request. Wait for it to be processed.', 409));
  }

  let debitResult;
  try {
    debitResult = await debit(ownerId, ownerType, Number(amount), 'withdrawal', {
      description: `Withdrawal to ${String(upiId).trim()}`,
      status: 'success',
    });
  } catch (e) {
    if (e.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json(formatErrorResponse('Insufficient wallet balance.', 400));
    }
    throw e;
  }

  const request = await WithdrawalRequest.create({
    ownerId,
    ownerType,
    amount: Number(amount),
    upiId: String(upiId).trim(),
    walletTransactionId: debitResult.transaction._id,
  });

  return res.status(201).json(formatSuccessResponse({
    request,
    balance: debitResult.wallet.balance,
  }, 'Withdrawal request submitted. The amount will be transferred to your UPI account within 1–3 business days.'));
};

// ===================================================
// LIST OWN WITHDRAWAL REQUESTS
// ===================================================
const getWithdrawals = async (ownerId, ownerType, req, res) => {
  const { page, limit } = validatePagination(req.query.page, req.query.limit);

  const filter = { ownerId, ownerType };
  const [requests, total] = await Promise.all([
    WithdrawalRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    WithdrawalRequest.countDocuments(filter),
  ]);

  return res.status(200).json(formatSuccessResponse({
    requests,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, messages.GENERIC.RETRIEVED));
};

// ===================================================
// ADMIN — LIST + PROCESS WITHDRAWALS
// ===================================================
exports.adminListWithdrawals = async (req, res) => {
  const { page, limit } = validatePagination(req.query.page, req.query.limit);
  const filter = {};
  if (req.query.status && ['pending', 'paid', 'rejected'].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const [requests, total] = await Promise.all([
    WithdrawalRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('ownerId', 'name phone email businessName').lean(),
    WithdrawalRequest.countDocuments(filter),
  ]);

  return res.status(200).json(formatSuccessResponse({
    requests,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, messages.GENERIC.RETRIEVED));
};

exports.adminProcessWithdrawal = async (req, res) => {
  const { action, note } = req.body;
  if (!['paid', 'rejected'].includes(action)) {
    return res.status(400).json(formatErrorResponse('action must be "paid" or "rejected".', 400));
  }

  // Atomically claim the pending request so two admins can't process it twice
  const request = await WithdrawalRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { status: action, adminNote: note || undefined, processedAt: new Date() },
    { new: true }
  );
  if (!request) {
    return res.status(404).json(formatErrorResponse('Pending withdrawal request not found (it may already be processed).', 404));
  }

  // Rejected — return the money to the wallet
  if (action === 'rejected') {
    const { transaction } = await credit(request.ownerId, request.ownerType, request.amount, 'withdrawal_refund', {
      description: `Withdrawal request rejected${note ? `: ${note}` : ''}`,
      status: 'success',
    });
    request.refundTransactionId = transaction._id;
    await request.save();
  }

  return res.status(200).json(formatSuccessResponse({ request }, `Withdrawal marked as ${action}.`));
};

// ===================================================
// CUSTOMER ROUTE HANDLERS
// ===================================================
exports.getCustomerWallet = (req, res) => getWallet(req.customer._id, 'Customer', res);
exports.getCustomerTransactions = (req, res) => getTransactions(req.customer._id, 'Customer', req, res);
exports.createCustomerRechargeOrder = (req, res) => createRechargeOrder(req.customer._id, 'Customer', req, res);
exports.verifyCustomerRecharge = (req, res) => verifyRecharge(req.customer._id, 'Customer', req, res);
exports.requestCustomerWithdrawal = (req, res) => requestWithdrawal(req.customer._id, 'Customer', req, res);
exports.getCustomerWithdrawals = (req, res) => getWithdrawals(req.customer._id, 'Customer', req, res);

// ===================================================
// OWNER ROUTE HANDLERS
// ===================================================
exports.getOwnerWallet = (req, res) => getWallet(req.owner._id, 'Owner', res);
exports.getOwnerTransactions = (req, res) => getTransactions(req.owner._id, 'Owner', req, res);
exports.createOwnerRechargeOrder = (req, res) => createRechargeOrder(req.owner._id, 'Owner', req, res);
exports.verifyOwnerRecharge = (req, res) => verifyRecharge(req.owner._id, 'Owner', req, res);
exports.requestOwnerWithdrawal = (req, res) => requestWithdrawal(req.owner._id, 'Owner', req, res);
exports.getOwnerWithdrawals = (req, res) => getWithdrawals(req.owner._id, 'Owner', req, res);
