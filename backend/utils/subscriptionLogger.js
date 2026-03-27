// utils/subscriptionLogger.js
// Fire-and-forget helper — never throws, never blocks the request

const SubscriptionLog = require('../models/SubscriptionLog');

/**
 * Log a subscription lifecycle event.
 *
 * @param {string} event     - One of the SubscriptionLog event enum values
 * @param {object} owner     - Owner document or plain object with _id, salonId, subscription
 * @param {object} [extras]  - Extra fields: amount, razorpayOrderId, razorpayPaymentId, meta, ip
 */
const logSubscriptionEvent = (event, owner, extras = {}) => {
  try {
    const sub = owner?.subscription || {};

    // Determine accessStatus from subscription state
    const TRIAL_DAYS = 30;
    let accessStatus = null;
    if (sub.trialStartDate) {
      const elapsed = Math.floor((Date.now() - new Date(sub.trialStartDate)) / 86400000);
      if (elapsed < TRIAL_DAYS) accessStatus = 'trial';
      else if (['starter', 'per_booking'].includes(sub.planType) && sub.paymentStatus === 'paid') accessStatus = 'active';
      else if (sub.paymentStatus === 'overdue') accessStatus = 'overdue';
      else accessStatus = 'restricted';
    }

    SubscriptionLog.create({
      ownerId:           owner._id,
      salonId:           owner.salonId || null,
      event,
      planType:          sub.planType   || extras.planType   || null,
      paymentStatus:     sub.paymentStatus || extras.paymentStatus || null,
      accessStatus:      extras.accessStatus || accessStatus,
      bookingCount:      sub.monthlyBookingCount != null ? sub.monthlyBookingCount : (extras.bookingCount ?? null),
      amount:            extras.amount           ?? null,
      razorpayOrderId:   extras.razorpayOrderId  ?? null,
      razorpayPaymentId: extras.razorpayPaymentId ?? null,
      meta:              extras.meta             ?? {},
      ip:                extras.ip               ?? null,
    }).catch((err) => {
      console.error('[SubscriptionLog] Failed to write log entry:', err.message);
    });
  } catch (err) {
    console.error('[SubscriptionLog] Unexpected error:', err.message);
  }
};

module.exports = { logSubscriptionEvent };
