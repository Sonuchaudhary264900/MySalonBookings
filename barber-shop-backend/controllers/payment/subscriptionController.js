// controllers/payment/subscriptionController.js
// Handles SaaS billing: trial tracking, plan selection, Razorpay payments

const Owner = require('../../models/Owner');
const Subscription = require('../../models/Subscription');
const { createOrder, verifyPaymentSignature, razorpayInstance } = require('../../config/razorpay');

const TRIAL_DAYS = 30;
const STARTER_PRICE = 150;   // ₹150/month
const PER_BOOKING_PRICE = 1; // ₹1 per booking

// Helper: compute trial days remaining
const getTrialDaysRemaining = (trialStartDate) => {
  const start = new Date(trialStartDate);
  const now = new Date();
  const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - elapsed);
};

// Helper: check if trial is still active
const isTrialActive = (trialStartDate) => getTrialDaysRemaining(trialStartDate) > 0;

// Helper: current billing month string YYYY-MM
const currentBillingMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ============================================================
// GET /owner/subscription/status
// ============================================================
const getSubscriptionStatus = async (req, res) => {
  try {
    const owner = await Owner.findById(req.owner._id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const sub = owner.subscription || {};
    const trialStartDate = sub.trialStartDate || owner.createdAt;
    const daysRemaining = getTrialDaysRemaining(trialStartDate);
    const trialActive = isTrialActive(trialStartDate);

    // Determine current access status
    let accessStatus = 'restricted';
    if (trialActive) accessStatus = 'trial';
    else if (sub.planType !== 'free_trial' && sub.paymentStatus === 'paid') accessStatus = 'active';
    else if (sub.paymentStatus === 'overdue') accessStatus = 'overdue';

    // Estimated bill for per_booking
    const estimatedBill =
      sub.planType === 'per_booking'
        ? (sub.monthlyBookingCount || 0) * PER_BOOKING_PRICE
        : sub.planType === 'starter'
        ? STARTER_PRICE
        : 0;

    // Pending invoice (unpaid per_booking)
    const pendingInvoice = await Subscription.findOne({
      ownerId: owner._id,
      paymentStatus: 'pending',
    }).sort({ createdAt: -1 });

    // Billing history (last 6)
    const billingHistory = await Subscription.find({ ownerId: owner._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.json({
      success: true,
      data: {
        trialStartDate,
        trialDaysRemaining: daysRemaining,
        trialActive,
        planType: sub.planType || 'free_trial',
        paymentStatus: sub.paymentStatus || 'trial',
        accessStatus,
        monthlyBookingCount: sub.monthlyBookingCount || 0,
        billingCycleStart: sub.billingCycleStart || null,
        lastPaymentDate: sub.lastPaymentDate || null,
        estimatedBill,
        pendingInvoice: pendingInvoice || null,
        billingHistory,
      },
    });
  } catch (err) {
    console.error('getSubscriptionStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// POST /owner/subscription/select-plan
// Body: { planType: 'starter' | 'per_booking' }
// ============================================================
const selectPlan = async (req, res) => {
  try {
    const { planType } = req.body;
    if (!['starter', 'per_booking'].includes(planType)) {
      return res.status(400).json({ success: false, message: 'Invalid plan type' });
    }

    const owner = await Owner.findById(req.owner._id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    owner.subscription.planType = planType;
    owner.subscription.billingCycleStart = new Date();
    // Keep paymentStatus as 'trial' if still in trial, else 'overdue' until paid
    if (!isTrialActive(owner.subscription.trialStartDate)) {
      owner.subscription.paymentStatus = 'overdue';
    }

    await owner.save();

    res.json({
      success: true,
      message: `Plan set to ${planType}`,
      data: { planType, billingCycleStart: owner.subscription.billingCycleStart },
    });
  } catch (err) {
    console.error('selectPlan error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// POST /owner/subscription/create-order
// Body: { planType: 'starter' | 'per_booking' }
// ============================================================
const createPaymentOrder = async (req, res) => {
  try {
    const owner = await Owner.findById(req.owner._id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const planType = req.body.planType || owner.subscription.planType;
    let amount = 0;

    if (planType === 'starter') {
      amount = STARTER_PRICE;
    } else if (planType === 'per_booking') {
      amount = (owner.subscription.monthlyBookingCount || 0) * PER_BOOKING_PRICE;
      if (amount < 1) amount = 1; // Razorpay minimum ₹1
    } else {
      return res.status(400).json({ success: false, message: 'Invalid plan type for payment' });
    }

    // Check for existing pending invoice to avoid duplicates
    let invoice = await Subscription.findOne({
      ownerId: owner._id,
      billingMonth: currentBillingMonth(),
      paymentStatus: 'pending',
    });

    // Create Razorpay order
    const order = await createOrder(
      amount,
      owner._id.toString(),
      invoice ? invoice._id.toString() : `new_${Date.now()}`,
      owner.email,
      owner.phone
    );

    if (!order.success && order.mode !== 'placeholder') {
      return res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }

    // Create or update invoice record
    if (!invoice) {
      invoice = await Subscription.create({
        ownerId: owner._id,
        salonId: owner.salonId,
        planType,
        billingMonth: currentBillingMonth(),
        bookingCount: owner.subscription.monthlyBookingCount || 0,
        amount,
        razorpayOrderId: order.orderId || null,
        paymentStatus: 'pending',
      });
    } else {
      invoice.razorpayOrderId = order.orderId || null;
      invoice.amount = amount;
      await invoice.save();
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        amount,
        currency: 'INR',
        invoiceId: invoice._id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        ownerName: owner.name,
        ownerEmail: owner.email,
        ownerPhone: owner.phone,
      },
    });
  } catch (err) {
    console.error('createPaymentOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// POST /owner/subscription/verify-payment
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, invoiceId }
// ============================================================
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, invoiceId } = req.body;

    // Verify signature
    const verification = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!verification.success) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Update invoice
    const invoice = await Subscription.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.razorpayPaymentId = razorpayPaymentId;
    invoice.paymentStatus = 'paid';
    invoice.paidAt = new Date();
    await invoice.save();

    // Update owner subscription status
    const owner = await Owner.findById(req.owner._id);
    owner.subscription.paymentStatus = 'paid';
    owner.subscription.lastPaymentDate = new Date();
    owner.subscription.planType = invoice.planType;
    owner.subscription.billingCycleStart = new Date();
    owner.subscription.paymentDueReminderSent = false;
    await owner.save();

    res.json({
      success: true,
      message: 'Payment verified. Subscription activated.',
      data: {
        planType: invoice.planType,
        amount: invoice.amount,
        paidAt: invoice.paidAt,
      },
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// GET /owner/subscription/billing-history
// ============================================================
const getBillingHistory = async (req, res) => {
  try {
    const history = await Subscription.find({ ownerId: req.owner._id })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    res.json({ success: true, data: history });
  } catch (err) {
    console.error('getBillingHistory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// POST /owner/subscription/webhook  (no auth - Razorpay webhook)
// ============================================================
const razorpayWebhook = async (req, res) => {
  try {
    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const paymentId = payload?.payment?.entity?.id;
      const orderId = payload?.payment?.entity?.order_id;
      if (orderId) {
        const invoice = await Subscription.findOne({ razorpayOrderId: orderId });
        if (invoice && invoice.paymentStatus !== 'paid') {
          invoice.razorpayPaymentId = paymentId;
          invoice.paymentStatus = 'paid';
          invoice.paidAt = new Date();
          await invoice.save();

          await Owner.updateOne(
            { _id: invoice.ownerId },
            {
              $set: {
                'subscription.paymentStatus': 'paid',
                'subscription.lastPaymentDate': new Date(),
                'subscription.billingCycleStart': new Date(),
              },
            }
          );
        }
      }
    } else if (event === 'payment.failed') {
      const orderId = payload?.payment?.entity?.order_id;
      if (orderId) {
        await Subscription.updateOne({ razorpayOrderId: orderId }, { $set: { paymentStatus: 'failed' } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('razorpayWebhook error:', err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  getSubscriptionStatus,
  selectPlan,
  createPaymentOrder,
  verifyPayment,
  getBillingHistory,
  razorpayWebhook,
};
