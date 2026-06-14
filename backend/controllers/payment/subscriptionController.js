// controllers/payment/subscriptionController.js
// Subscriptions are free for all owners — this controller now only reports a
// permanent "free/active" status. All payment-flow endpoints are disabled
// stubs kept so existing routes/frontends keep working without changes.
// The promotion payment system (separate controller) is unaffected.
//
// The razorpayWebhook below IS live: although subscriptions are free, this is
// the single Razorpay webhook for the app, so it reconciles the payments that
// DO happen (wallet recharges, booking online payments) when a client pays but
// drops before calling the verify endpoint.

const crypto = require('crypto');
const mongoose = require('mongoose');
const Owner = require('../../models/Owner');

const FREE_RESPONSE = {
  success: false,
  message: 'GlowLoox is currently free for all partners — no subscription payment is required.',
  isFree: true,
};

// ============================================================
// GET /owner/subscription/status
// ============================================================
const getSubscriptionStatus = async (req, res) => {
  try {
    const owner = await Owner.findById(req.owner._id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    // Subscriptions are free for all owners — always report an active, fully-paid status.
    return res.json({
      success: true,
      data: {
        trialStartDate:           owner.subscription?.trialStartDate || owner.createdAt,
        trialDaysRemaining:       0,
        trialActive:              false,

        planType:                 'free',
        paymentStatus:            'paid',
        accessStatus:             'active',

        planSelectedDuringTrial:  null,
        nextPlan:                 null,
        planChangeRequested:      false,
        planChangeRequestedAt:    null,

        billingCycleStart:        null,
        billingCycleEndDate:      null,
        lastPaymentDate:          null,

        monthlyBookingCount:      owner.subscription?.monthlyBookingCount || 0,
        estimatedBill:            0,

        pendingInvoice:           null,
        billingHistory:           [],
        isFree:                   true,
      },
    });
  } catch (err) {
    console.error('getSubscriptionStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// Subscriptions are free for all owners — payment-flow endpoints below are
// disabled stubs so existing routes/frontends keep working without changes.
// The promotion payment system (separate controller) is unaffected.
// ============================================================
const selectPlan         = async (req, res) => res.status(200).json(FREE_RESPONSE);
const requestPlanChange  = async (req, res) => res.status(200).json(FREE_RESPONSE);
const cancelPlanChange   = async (req, res) => res.status(200).json(FREE_RESPONSE);
const createPaymentOrder = async (req, res) => res.status(200).json(FREE_RESPONSE);
const verifyPayment      = async (req, res) => res.status(200).json(FREE_RESPONSE);

const getBillingHistory = async (req, res) => {
  res.json({ success: true, data: [] });
};

// ============================================================
// Reconcile a captured payment (idempotent). Routes by the order notes set in
// config/razorpay.createOrder: notes.bookingId is either 'wallet_recharge' or a
// real Booking ObjectId; notes.customerId is the payer (owner OR customer id).
// ============================================================
const reconcileCapturedPayment = async (payment) => {
  const paymentId = payment.id;
  const orderId   = payment.order_id;
  const amount    = (payment.amount || 0) / 100; // paise → rupees
  const notes     = payment.notes || {};
  const ref       = notes.bookingId;
  const payerId   = notes.customerId;

  // ── Wallet recharge ──────────────────────────────────────
  if (ref === 'wallet_recharge') {
    const WalletTransaction = require('../../models/WalletTransaction');
    if (await WalletTransaction.findOne({ razorpayPaymentId: paymentId }).lean()) return; // already credited
    if (!payerId || !mongoose.isValidObjectId(payerId)) {
      console.error('[webhook] recharge: missing/invalid payer id', payerId);
      return;
    }
    const Customer = require('../../models/Customer');
    let ownerType = null;
    if (await Owner.exists({ _id: payerId }))         ownerType = 'Owner';
    else if (await Customer.exists({ _id: payerId })) ownerType = 'Customer';
    if (!ownerType) { console.error('[webhook] recharge: payer not found', payerId); return; }

    const { credit } = require('../../utils/walletService');
    await credit(payerId, ownerType, amount, 'recharge', {
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      description: 'Wallet recharge (reconciled via webhook)',
      status: 'success',
    });
    console.log(`[webhook] reconciled wallet recharge ₹${amount} for ${ownerType} ${payerId}`);
    return;
  }

  // ── Booking online payment ───────────────────────────────
  if (ref && mongoose.isValidObjectId(ref)) {
    const Transaction = require('../../models/Transaction');
    if (await Transaction.findOne({ transactionId: paymentId }).lean()) return; // already processed

    const Booking  = require('../../models/Booking');
    const booking  = await Booking.findById(ref);
    if (!booking || booking.paymentStatus === 'completed') return;

    const Business = require('../../models/Business');
    const Customer = require('../../models/Customer');
    const [salon, customer] = await Promise.all([
      Business.findById(booking.salonId),
      Customer.findById(booking.customerId),
    ]);
    if (!salon || !customer) return;

    booking.transactionId = paymentId;
    booking.paidAt = new Date();

    const { finalizeBookingAfterPayment } = require('../../controllers/customer/bookingController');
    await finalizeBookingAfterPayment(booking, salon, customer);

    await Transaction.create({
      transactionId: paymentId,
      razorpayId: orderId,
      bookingId: booking._id,
      customerId: customer._id,
      salonId: salon._id,
      amount: booking.totalAmount,
      finalAmount: booking.totalAmount,
      paymentMethod: 'online',
      paymentStatus: 'success',
    });

    const { credit } = require('../../utils/walletService');
    await credit(salon.ownerId, 'Owner', booking.totalAmount, 'booking_earning', {
      bookingId: booking._id,
      description: `Earnings from booking ${booking.bookingId}`,
      status: 'success',
    }).catch((e) => console.error('[webhook] owner earning credit failed', e.message));

    console.log(`[webhook] reconciled booking payment ${booking.bookingId}`);
    return;
  }

  console.warn('[webhook] payment.captured with unrecognized notes — skipped', { paymentId, ref });
};

const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[webhook] RAZORPAY_WEBHOOK_SECRET is not set — rejecting');
      return res.status(503).json({ success: false });
    }

    // Verify HMAC signature over the RAW body (captured in server.js).
    const signature = req.headers['x-razorpay-signature'] || '';
    const body = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const sigBuf = Buffer.from(String(signature));
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('[webhook] invalid signature — rejected');
      return res.status(400).json({ success: false, message: 'invalid signature' });
    }

    const event   = req.body?.event;
    const payment = req.body?.payload?.payment?.entity;
    if (event === 'payment.captured' && payment) {
      // Do the work but never let an error turn into a 5xx (Razorpay would retry-storm).
      await reconcileCapturedPayment(payment).catch((e) =>
        console.error('[webhook] reconcile error', e.message)
      );
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('[webhook] handler error', e.message);
    return res.status(200).json({ success: true }); // ack; logged for investigation
  }
};

module.exports = {
  getSubscriptionStatus,
  selectPlan,
  requestPlanChange,
  cancelPlanChange,
  createPaymentOrder,
  verifyPayment,
  getBillingHistory,
  razorpayWebhook,
};
