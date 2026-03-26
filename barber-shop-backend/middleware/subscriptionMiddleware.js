// middleware/subscriptionMiddleware.js
// Guards routes that require an active subscription or active trial

const Owner = require('../models/Owner');

const TRIAL_DAYS = 30;

const isTrialActive = (trialStartDate) => {
  const start = new Date(trialStartDate);
  const now = new Date();
  const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return elapsed < TRIAL_DAYS;
};

const checkSubscription = async (req, res, next) => {
  try {
    const owner = await Owner.findById(req.owner._id);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    const sub = owner.subscription || {};
    const trialStartDate = sub.trialStartDate || owner.createdAt;

    // Allow if still within 30-day trial
    if (isTrialActive(trialStartDate)) {
      req.subscriptionStatus = 'trial';
      return next();
    }

    // Allow if on a paid plan with active payment
    if (['starter', 'per_booking'].includes(sub.planType) && sub.paymentStatus === 'paid') {
      req.subscriptionStatus = 'active';
      return next();
    }

    // Otherwise block access
    return res.status(403).json({
      success: false,
      restricted: true,
      message: 'Please select a plan to continue',
      paymentStatus: sub.paymentStatus || 'overdue',
    });
  } catch (err) {
    console.error('checkSubscription error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { checkSubscription };
