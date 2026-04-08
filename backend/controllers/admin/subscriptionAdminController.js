// controllers/admin/subscriptionAdminController.js
// Admin visibility into SaaS subscription stats, user states, and audit logs

const Owner = require('../../models/Owner');
const Subscription = require('../../models/Subscription');
const SubscriptionLog = require('../../models/SubscriptionLog');

const TRIAL_DAYS = 30;

const isTrialActive = (trialStartDate) => {
  const elapsed = Math.floor((Date.now() - new Date(trialStartDate)) / 86400000);
  return elapsed < TRIAL_DAYS;
};

// ============================================================
// GET /admin/subscriptions/stats
// Overview counts for the admin dashboard
// ============================================================
const getSubscriptionStats = async (req, res) => {
  try {
    const owners = await Owner.find({}).select('subscription createdAt name email').lean();

    const stats = {
      total: owners.length,
      trial: 0,
      trialExpiringSoon: 0,   // <= 3 days left
      paid: 0,
      overdue: 0,
      restricted: 0,
      planBreakdown: { free_trial: 0, starter: 0, per_booking: 0 },
    };

    for (const owner of owners) {
      const sub = owner.subscription || {};
      const trialStart = sub.trialStartDate || owner.createdAt;
      const elapsed = Math.floor((Date.now() - new Date(trialStart)) / 86400000);
      const daysLeft = Math.max(0, TRIAL_DAYS - elapsed);

      stats.planBreakdown[sub.planType || 'free_trial']++;

      if (isTrialActive(trialStart)) {
        stats.trial++;
        if (daysLeft <= 3) stats.trialExpiringSoon++;
      } else if (sub.paymentStatus === 'paid') {
        stats.paid++;
      } else if (sub.paymentStatus === 'overdue') {
        stats.overdue++;
      } else {
        stats.restricted++;
      }
    }

    // Revenue from paid invoices
    const revenueAgg = await Subscription.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const revenue = revenueAgg[0] || { total: 0, count: 0 };

    // Failed payments
    const failedCount = await Subscription.countDocuments({ paymentStatus: 'failed' });
    const pendingCount = await Subscription.countDocuments({ paymentStatus: 'pending' });

    res.json({
      success: true,
      data: {
        owners: stats,
        revenue: { totalCollected: revenue.total, paidInvoices: revenue.count },
        invoices: { failed: failedCount, pending: pendingCount },
      },
    });
  } catch (err) {
    console.error('getSubscriptionStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// GET /admin/subscriptions/users?status=trial|paid|overdue|all
// Paginated list of owners with their subscription state
// ============================================================
const getSubscriptionUsers = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));

    const owners = await Owner.find({})
      .select('name email phone subscription createdAt businessId')
      .lean();

    const mapped = owners.map((owner) => {
      const sub = owner.subscription || {};
      const trialStart = sub.trialStartDate || owner.createdAt;
      const elapsed = Math.floor((Date.now() - new Date(trialStart)) / 86400000);
      const daysLeft = Math.max(0, TRIAL_DAYS - elapsed);

      let accessStatus;
      if (isTrialActive(trialStart)) accessStatus = 'trial';
      else if (sub.paymentStatus === 'paid') accessStatus = 'active';
      else if (sub.paymentStatus === 'overdue') accessStatus = 'overdue';
      else accessStatus = 'restricted';

      return {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        businessId: owner.businessId,
        planType: sub.planType || 'free_trial',
        paymentStatus: sub.paymentStatus || 'trial',
        accessStatus,
        trialDaysLeft: daysLeft,
        monthlyBookingCount: sub.monthlyBookingCount || 0,
        lastPaymentDate: sub.lastPaymentDate || null,
        trialStartDate: trialStart,
        createdAt: owner.createdAt,
      };
    });

    const filtered =
      status === 'all'
        ? mapped
        : mapped.filter((o) => o.accessStatus === status);

    const total = filtered.length;
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({ success: true, data: paginated, total, page: p, limit: l });
  } catch (err) {
    console.error('getSubscriptionUsers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// GET /admin/subscriptions/logs?ownerId=&event=&limit=50
// Recent subscription audit log entries
// ============================================================
const getSubscriptionLogs = async (req, res) => {
  try {
    const { ownerId, event, limit = 50, page = 1 } = req.query;
    const l = Math.min(200, Math.max(1, parseInt(limit)));
    const p = Math.max(1, parseInt(page));

    const filter = {};
    if (ownerId) filter.ownerId = ownerId;
    if (event) filter.event = event;

    const [logs, total] = await Promise.all([
      SubscriptionLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .populate('ownerId', 'name email phone')
        .lean(),
      SubscriptionLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: logs, total, page: p, limit: l });
  } catch (err) {
    console.error('getSubscriptionLogs error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// GET /admin/subscriptions/invoices?paymentStatus=pending|paid|failed
// Invoice records
// ============================================================
const getSubscriptionInvoices = async (req, res) => {
  try {
    const { paymentStatus, page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));

    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const [invoices, total] = await Promise.all([
      Subscription.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .populate('ownerId', 'name email phone')
        .lean(),
      Subscription.countDocuments(filter),
    ]);

    res.json({ success: true, data: invoices, total, page: p, limit: l });
  } catch (err) {
    console.error('getSubscriptionInvoices error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getSubscriptionStats,
  getSubscriptionUsers,
  getSubscriptionLogs,
  getSubscriptionInvoices,
};
