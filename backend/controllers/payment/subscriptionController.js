// controllers/payment/subscriptionController.js
// Subscriptions are free for all owners — this controller now only reports a
// permanent "free/active" status. All payment-flow endpoints are disabled
// stubs kept so existing routes/frontends keep working without changes.
// The promotion payment system (separate controller) is unaffected.

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

const razorpayWebhook = async (req, res) => {
  res.json({ success: true });
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
