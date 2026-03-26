// controllers/payment/subscriptionController.js
// Handles SaaS billing: trial tracking, plan selection, plan switching, Razorpay payments

const Owner = require('../../models/Owner');
const Subscription = require('../../models/Subscription');
const { createOrder, verifyPaymentSignature } = require('../../config/razorpay');
const { logSubscriptionEvent } = require('../../utils/subscriptionLogger');

const TRIAL_DAYS      = 30;
const STARTER_PRICE   = 150;   // ₹150/month
const PER_BOOKING_PRICE = 1;   // ₹1 per booking
const CYCLE_DAYS      = 30;    // billing cycle length in days

// ── Helpers ──────────────────────────────────────────────────────────────────

const getTrialDaysRemaining = (trialStartDate) => {
  const elapsed = Math.floor((Date.now() - new Date(trialStartDate)) / 86400000);
  return Math.max(0, TRIAL_DAYS - elapsed);
};

const isTrialActive = (trialStartDate) => getTrialDaysRemaining(trialStartDate) > 0;

const cycleEndFromStart = (start) => {
  const d = new Date(start);
  d.setDate(d.getDate() + CYCLE_DAYS);
  return d;
};

const currentBillingMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

const planLabel = (p) =>
  p === 'starter' ? '₹150/month Starter' : p === 'per_booking' ? '₹1/booking Per Booking' : p;

// ── Compute access status from raw subscription data ─────────────────────────
const computeAccessStatus = (sub, ownerCreatedAt) => {
  const trialStart = sub.trialStartDate || ownerCreatedAt;
  if (isTrialActive(trialStart)) return 'trial';
  if (['starter', 'per_booking'].includes(sub.planType) && sub.paymentStatus === 'paid') return 'active';
  if (sub.paymentStatus === 'overdue') return 'overdue';
  return 'restricted';
};

// ============================================================
// GET /owner/subscription/status
// ============================================================
const getSubscriptionStatus = async (req, res) => {
  try {
    const owner = await Owner.findById(req.owner._id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const sub = owner.subscription || {};
    const trialStartDate  = sub.trialStartDate || owner.createdAt;
    const daysRemaining   = getTrialDaysRemaining(trialStartDate);
    const trialActive     = daysRemaining > 0;
    const accessStatus    = computeAccessStatus(sub, owner.createdAt);

    // Estimated current bill
    const estimatedBill =
      sub.planType === 'per_booking'
        ? (sub.monthlyBookingCount || 0) * PER_BOOKING_PRICE
        : sub.planType === 'starter'
        ? STARTER_PRICE
        : 0;

    // Compute billing cycle end date
    const billingCycleEndDate =
      sub.billingCycleEndDate ||
      (sub.billingCycleStart ? cycleEndFromStart(sub.billingCycleStart) : null);

    // Pending invoice
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
        // Trial
        trialStartDate,
        trialDaysRemaining:       daysRemaining,
        trialActive,

        // Current plan
        planType:                 sub.planType || 'free_trial',
        paymentStatus:            sub.paymentStatus || 'trial',
        accessStatus,

        // Pre-selection during trial
        planSelectedDuringTrial:  sub.planSelectedDuringTrial || null,

        // Scheduled plan change
        nextPlan:                 sub.nextPlan || null,
        planChangeRequested:      sub.planChangeRequested || false,
        planChangeRequestedAt:    sub.planChangeRequestedAt || null,

        // Billing cycle
        billingCycleStart:        sub.billingCycleStart || null,
        billingCycleEndDate,
        lastPaymentDate:          sub.lastPaymentDate || null,

        // Usage
        monthlyBookingCount:      sub.monthlyBookingCount || 0,
        estimatedBill,

        // Invoices
        pendingInvoice:           pendingInvoice || null,
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
//
// Behaviour:
//   • During trial  → pre-select (stored in planSelectedDuringTrial, not activated yet)
//   • After trial   → immediate activation (requires subsequent payment)
// ============================================================
const selectPlan = async (req, res) => {
  try {
    const { planType } = req.body;
    if (!['starter', 'per_booking'].includes(planType)) {
      return res.status(400).json({ success: false, message: 'Invalid plan type' });
    }

    const owner = await Owner.findById(req.owner._id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const sub        = owner.subscription;
    const trialStart = sub.trialStartDate || owner.createdAt;
    const trialOn    = isTrialActive(trialStart);

    if (trialOn) {
      // ── Pre-selection mode (trial still active) ────────────
      owner.set('subscription.planSelectedDuringTrial', planType);
      await owner.save();

      logSubscriptionEvent('plan_selected', owner, {
        planType,
        ip:   req.ip,
        meta: { mode: 'trial_preselection' },
      });

      return res.json({
        success: true,
        message: `${planLabel(planType)} plan pre-selected. It will activate automatically after your free trial ends.`,
        data: {
          planSelectedDuringTrial: planType,
          activatesAfterTrial:     true,
          trialDaysRemaining:      getTrialDaysRemaining(trialStart),
        },
      });
    }

    // ── Post-trial immediate activation ────────────────────────
    const now     = new Date();
    const cycleEnd = cycleEndFromStart(now);

    sub.planType             = planType;
    sub.planSelectedDuringTrial = null;   // clear pre-selection once activated
    sub.billingCycleStart    = now;
    sub.billingCycleEndDate  = cycleEnd;
    sub.paymentStatus        = 'overdue'; // stays overdue until payment completes
    sub.nextPlan             = null;
    sub.planChangeRequested  = false;
    sub.planChangeRequestedAt = null;

    await owner.save();

    logSubscriptionEvent('plan_selected', owner, {
      planType,
      ip:   req.ip,
      meta: { mode: 'immediate_activation', billingCycleStart: now, billingCycleEndDate: cycleEnd },
    });

    return res.json({
      success: true,
      message: `${planLabel(planType)} plan selected. Please complete payment to activate.`,
      data: {
        planType,
        billingCycleStart:   now,
        billingCycleEndDate: cycleEnd,
      },
    });
  } catch (err) {
    console.error('selectPlan error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// POST /owner/subscription/request-plan-change
// Body: { planType: 'starter' | 'per_booking' }
//
// Rules:
//   • Only ONE plan change per billing cycle (anti-abuse)
//   • Change applies at START of next billing cycle
//   • During trial: updates pre-selection instead
// ============================================================
const requestPlanChange = async (req, res) => {
  try {
    const { planType } = req.body;
    if (!['starter', 'per_booking'].includes(planType)) {
      return res.status(400).json({ success: false, message: 'Invalid plan type' });
    }

    const owner = await Owner.findById(req.owner._id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const sub        = owner.subscription;
    const trialStart = sub.trialStartDate || owner.createdAt;

    // ── During trial: just update pre-selection ─────────────
    if (isTrialActive(trialStart)) {
      owner.set('subscription.planSelectedDuringTrial', planType);
      await owner.save();

      logSubscriptionEvent('plan_selected', owner, {
        planType,
        ip:   req.ip,
        meta: { mode: 'trial_preselection_updated' },
      });

      return res.json({
        success: true,
        message: `Pre-selected plan updated to ${planLabel(planType)}.`,
        data: { planSelectedDuringTrial: planType },
      });
    }

    // ── Already on the same plan with no pending change ─────
    if (sub.planType === planType && !sub.planChangeRequested) {
      return res.status(400).json({
        success: false,
        message: `You are already on the ${planLabel(planType)} plan.`,
      });
    }

    // ── Requesting the same plan as the already-scheduled next plan ─
    if (sub.planChangeRequested && sub.nextPlan === planType) {
      return res.status(400).json({
        success: false,
        message: `${planLabel(planType)} is already scheduled as your next plan.`,
      });
    }

    // ── Anti-abuse: only 1 change request per billing cycle ─
    if (sub.planChangeRequested) {
      return res.status(409).json({
        success: false,
        message: `You already have a plan change to ${planLabel(sub.nextPlan)} scheduled for your next billing cycle. Cancel it before requesting a new change.`,
        data: {
          nextPlan:              sub.nextPlan,
          planChangeRequestedAt: sub.planChangeRequestedAt,
          billingCycleEndDate:   sub.billingCycleEndDate,
        },
      });
    }

    // ── Compute billing cycle end ────────────────────────────
    const cycleEnd =
      sub.billingCycleEndDate ||
      (sub.billingCycleStart ? cycleEndFromStart(sub.billingCycleStart) : cycleEndFromStart(new Date()));

    sub.nextPlan              = planType;
    sub.planChangeRequested   = true;
    sub.planChangeRequestedAt = new Date();
    sub.billingCycleEndDate   = cycleEnd;   // ensure it's persisted

    await owner.save();

    logSubscriptionEvent('plan_selected', owner, {
      planType,
      ip:   req.ip,
      meta: {
        mode:        'plan_change_requested',
        currentPlan: sub.planType,
        nextPlan:    planType,
        appliesOn:   cycleEnd,
      },
    });

    return res.json({
      success: true,
      message: `Plan change to ${planLabel(planType)} scheduled. Your current ${planLabel(sub.planType)} plan continues until ${cycleEnd.toLocaleDateString('en-IN')}. The new plan will apply from your next billing cycle.`,
      data: {
        currentPlan:           sub.planType,
        nextPlan:              planType,
        billingCycleEndDate:   cycleEnd,
        planChangeRequestedAt: sub.planChangeRequestedAt,
      },
    });
  } catch (err) {
    console.error('requestPlanChange error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// POST /owner/subscription/cancel-plan-change
// ============================================================
const cancelPlanChange = async (req, res) => {
  try {
    const owner = await Owner.findById(req.owner._id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const sub = owner.subscription;

    if (!sub.planChangeRequested) {
      return res.status(400).json({
        success: false,
        message: 'No pending plan change to cancel.',
      });
    }

    const cancelledPlan = sub.nextPlan;
    sub.nextPlan              = null;
    sub.planChangeRequested   = false;
    sub.planChangeRequestedAt = null;

    await owner.save();

    logSubscriptionEvent('plan_selected', owner, {
      planType: sub.planType,
      ip:       req.ip,
      meta: { mode: 'plan_change_cancelled', cancelledNextPlan: cancelledPlan },
    });

    return res.json({
      success: true,
      message: `Plan change to ${planLabel(cancelledPlan)} cancelled. Your ${planLabel(sub.planType)} plan will continue.`,
      data: { currentPlan: sub.planType },
    });
  } catch (err) {
    console.error('cancelPlanChange error:', err);
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
      if (amount < 1) amount = 1;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid plan type for payment' });
    }

    // Dedup: reuse pending invoice for same billing month
    let invoice = await Subscription.findOne({
      ownerId: owner._id,
      billingMonth: currentBillingMonth(),
      paymentStatus: 'pending',
    });

    const order = await createOrder(
      amount,
      owner._id.toString(),
      invoice ? invoice._id.toString() : `new_${Date.now()}`,
      owner.email,
      owner.phone
    );

    if (!order.success && order.mode !== 'placeholder') {
      logSubscriptionEvent('payment_order_created', owner, {
        planType, amount, ip: req.ip,
        meta: { error: 'razorpay_order_failed' },
      });
      return res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }

    logSubscriptionEvent('payment_order_created', owner, {
      planType, amount,
      razorpayOrderId: order.orderId || null,
      ip: req.ip,
    });

    if (!invoice) {
      invoice = await Subscription.create({
        ownerId:      owner._id,
        salonId:      owner.salonId,
        planType,
        billingMonth: currentBillingMonth(),
        bookingCount: owner.subscription.monthlyBookingCount || 0,
        amount,
        razorpayOrderId: order.orderId || null,
        paymentStatus: 'pending',
      });
    } else {
      invoice.razorpayOrderId = order.orderId || null;
      invoice.amount          = amount;
      await invoice.save();
    }

    res.json({
      success: true,
      data: {
        orderId:        order.orderId,
        amount,
        currency:       'INR',
        invoiceId:      invoice._id,
        razorpayKeyId:  process.env.RAZORPAY_KEY_ID,
        ownerName:      owner.name,
        ownerEmail:     owner.email,
        ownerPhone:     owner.phone,
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

    const verification = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!verification.success) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const invoice = await Subscription.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.razorpayPaymentId = razorpayPaymentId;
    invoice.paymentStatus     = 'paid';
    invoice.paidAt            = new Date();
    await invoice.save();

    const owner    = await Owner.findById(req.owner._id);
    const now      = new Date();
    const cycleEnd = cycleEndFromStart(now);

    owner.subscription.paymentStatus        = 'paid';
    owner.subscription.lastPaymentDate      = now;
    owner.subscription.planType             = invoice.planType;
    owner.subscription.billingCycleStart    = now;
    owner.subscription.billingCycleEndDate  = cycleEnd;
    owner.subscription.paymentDueReminderSent = false;
    owner.subscription.planSelectedDuringTrial = null;  // clear trial pre-selection on payment
    await owner.save();

    logSubscriptionEvent('payment_success', owner, {
      amount:            invoice.amount,
      razorpayOrderId:   invoice.razorpayOrderId,
      razorpayPaymentId,
      ip:                req.ip,
      meta:              { invoiceId: invoice._id },
    });

    res.json({
      success: true,
      message: 'Payment verified. Subscription activated.',
      data: {
        planType:            invoice.planType,
        amount:              invoice.amount,
        paidAt:              invoice.paidAt,
        billingCycleEndDate: cycleEnd,
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
// POST /owner/subscription/webhook  (no auth — Razorpay webhook)
// ============================================================
const razorpayWebhook = async (req, res) => {
  try {
    const event   = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const paymentId = payload?.payment?.entity?.id;
      const orderId   = payload?.payment?.entity?.order_id;
      if (orderId) {
        const invoice = await Subscription.findOne({ razorpayOrderId: orderId });
        if (invoice && invoice.paymentStatus !== 'paid') {
          invoice.razorpayPaymentId = paymentId;
          invoice.paymentStatus     = 'paid';
          invoice.paidAt            = new Date();
          await invoice.save();

          const now      = new Date();
          const cycleEnd = cycleEndFromStart(now);
          await Owner.updateOne(
            { _id: invoice.ownerId },
            {
              $set: {
                'subscription.paymentStatus':       'paid',
                'subscription.lastPaymentDate':     now,
                'subscription.billingCycleStart':   now,
                'subscription.billingCycleEndDate': cycleEnd,
              },
            }
          );
        }
      }
    } else if (event === 'payment.failed') {
      const orderId = payload?.payment?.entity?.order_id;
      if (orderId) {
        await Subscription.updateOne({ razorpayOrderId: orderId }, { $set: { paymentStatus: 'failed' } });
        const failedInvoice = await Subscription.findOne({ razorpayOrderId: orderId });
        if (failedInvoice) {
          const owner = await Owner.findById(failedInvoice.ownerId).lean();
          if (owner) {
            logSubscriptionEvent('payment_failed', owner, {
              razorpayOrderId: orderId,
              amount:          failedInvoice.amount,
              meta:            { invoiceId: failedInvoice._id },
            });
          }
        }
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
  requestPlanChange,
  cancelPlanChange,
  createPaymentOrder,
  verifyPayment,
  getBillingHistory,
  razorpayWebhook,
};
