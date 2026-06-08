// middleware/subscriptionMiddleware.js
// Subscriptions are currently free for all owners — this middleware is a
// pass-through so existing route wiring keeps working without changes.
// Promotion payments (separate system) are unaffected.

const checkSubscription = async (req, res, next) => {
  req.subscriptionStatus = 'active';
  return next();
};

module.exports = { checkSubscription };
