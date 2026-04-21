// middleware/subscriptionMiddleware.js
// Guards routes that require an active subscription or active trial.
// Also auto-activates a pre-selected plan when the trial expires.

const Owner = require('../models/Owner');
const { logSubscriptionEvent } = require('../utils/subscriptionLogger');

const TRIAL_DAYS  = 30;
const CYCLE_DAYS  = 30;

const isTrialActive = (trialStartDate) => {
  const elapsed = Math.floor((Date.now() - new Date(trialStartDate)) / 86400000);
  return elapsed < TRIAL_DAYS;
};

const cycleEndFromStart = (start) => {
  const d = new Date(start);
  d.setDate(d.getDate() + CYCLE_DAYS);
  return d;
};

const checkSubscription = async (req, res, next) => {
  try {
    if (!req.owner?._id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const owner = await Owner.findById(req.owner._id);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    const sub        = owner.subscription || {};
    const trialStart = sub.trialStartDate || owner.createdAt;

    // ── Allow: trial still active ─────────────────────────────
    if (isTrialActive(trialStart)) {
      req.subscriptionStatus = 'trial';
      return next();
    }

    // ── Auto-activate pre-selected plan when trial just expired ─
    // If the user pre-selected a plan during their trial, promote it to the
    // active plan (status = overdue until payment) the first time they hit
    // a protected route after the trial ends.
    if (
      sub.planType === 'free_trial' &&
      sub.planSelectedDuringTrial &&
      ['starter', 'per_booking'].includes(sub.planSelectedDuringTrial)
    ) {
      const now      = new Date();
      const cycleEnd = cycleEndFromStart(now);

      await Owner.updateOne(
        { _id: owner._id },
        {
          $set: {
            'subscription.planType':                sub.planSelectedDuringTrial,
            'subscription.planSelectedDuringTrial': null,
            'subscription.billingCycleStart':       now,
            'subscription.billingCycleEndDate':     cycleEnd,
            'subscription.paymentStatus':           'overdue',
          },
        }
      );

      logSubscriptionEvent('plan_selected', owner, {
        planType: sub.planSelectedDuringTrial,
        ip:       req.ip,
        meta: { mode: 'auto_activated_after_trial', billingCycleEndDate: cycleEnd },
      });

      // Re-read updated sub for downstream access check
      const refreshed = await Owner.findById(owner._id);
      const updatedSub = refreshed.subscription;

      // After auto-activation the paymentStatus is 'overdue' → fall through to block below
      // (user must pay — this is expected, the plan is now set and they see the pay screen)
      logSubscriptionEvent('access_blocked', refreshed, {
        accessStatus: 'overdue',
        ip:   req.ip,
        meta: { route: req.originalUrl, method: req.method, reason: 'awaiting_payment_after_trial' },
      });

      return res.status(403).json({
        success:       false,
        restricted:    true,
        autoActivated: true,
        planType:      updatedSub.planType,
        message:       `Your free trial has ended. Your ${updatedSub.planType === 'starter' ? '₹150/month Starter' : '₹1/booking Per Booking'} plan is now active — please complete payment to continue.`,
        paymentStatus: 'overdue',
        billingCycleEndDate: cycleEnd,
      });
    }

    // ── Allow: paid plan, active payment ──────────────────────
    if (['starter', 'per_booking'].includes(sub.planType) && sub.paymentStatus === 'paid') {
      req.subscriptionStatus = 'active';
      return next();
    }

    // ── Block: trial expired, no paid plan ────────────────────
    logSubscriptionEvent('access_blocked', owner, {
      accessStatus: 'restricted',
      ip:   req.ip,
      meta: { route: req.originalUrl, method: req.method },
    });

    return res.status(403).json({
      success:      false,
      restricted:   true,
      message:      'Please select a plan to continue',
      paymentStatus: sub.paymentStatus || 'overdue',
    });
  } catch (err) {
    console.error('checkSubscription error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { checkSubscription };
