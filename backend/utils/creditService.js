// utils/creditService.js
// Booking Credits ledger — non-cash, scope-aware. Mirrors walletService but credits
// can NEVER be withdrawn/transferred; they only reduce a booking's cost.
const CreditBalance = require('../models/CreditBalance');
const CreditTransaction = require('../models/CreditTransaction');

const norm = (scopeSalonId) => (scopeSalonId ? String(scopeSalonId) : null);

// Fetch (or create) the balance row for a (customer, scope).
const getOrCreateBalance = async (customerId, scopeSalonId = null) => {
  const scope = norm(scopeSalonId);
  let bal = await CreditBalance.findOne({ customerId, scopeSalonId: scope });
  if (!bal) {
    try {
      bal = await CreditBalance.create({ customerId, scopeSalonId: scope, earned: 0, used: 0 });
    } catch {
      bal = await CreditBalance.findOne({ customerId, scopeSalonId: scope }); // race
    }
  }
  return bal;
};

// Add credits. extra: { scopeSalonId, type, bookingId, description, meta }
const earnCredit = async (customerId, amount, source, extra = {}) => {
  if (!(amount > 0)) throw new Error('INVALID_AMOUNT');
  const scope = norm(extra.scopeSalonId);
  await getOrCreateBalance(customerId, scope);
  const bal = await CreditBalance.findOneAndUpdate(
    { customerId, scopeSalonId: scope },
    { $inc: { earned: amount } },
    { new: true }
  );
  const available = bal.earned - bal.used;
  const transaction = await CreditTransaction.create({
    customerId,
    scopeSalonId: scope,
    type: extra.type || 'earn',
    source,
    amount,
    balanceAfter: available,
    bookingId: extra.bookingId,
    description: extra.description,
    meta: extra.meta,
  });
  return { balance: bal, transaction, available };
};

// Total credits redeemable for a booking at `salonId` = platform-wide + that-salon.
const availableForSalon = async (customerId, salonId) => {
  const rows = await CreditBalance.find({
    customerId,
    scopeSalonId: { $in: [null, String(salonId)] },
  }).lean();
  return rows.reduce((sum, r) => sum + Math.max(0, (r.earned || 0) - (r.used || 0)), 0);
};

// Per-scope breakdown for UI display: { total, platform, shops: [{ salonId, available }] }
const getBreakdown = async (customerId) => {
  const rows = await CreditBalance.find({ customerId }).lean();
  let platform = 0;
  const shops = [];
  for (const r of rows) {
    const avail = Math.max(0, (r.earned || 0) - (r.used || 0));
    if (!r.scopeSalonId) platform += avail;
    else if (avail > 0) shops.push({ salonId: String(r.scopeSalonId), available: avail });
  }
  const total = platform + shops.reduce((s, x) => s + x.available, 0);
  return { total, platform, shops };
};

// Redeem up to `amount` for a booking at `salonId`. Draws shop-locked credits FIRST,
// then platform-wide. Atomic per row. Returns { redeemed, applied:[{scopeSalonId, amount}] }.
const redeemForSalon = async (customerId, salonId, amount, source, extra = {}) => {
  if (!(amount > 0)) throw new Error('INVALID_AMOUNT');
  let remaining = amount;
  const applied = [];
  // shop-locked first, then platform-wide
  for (const scope of [String(salonId), null]) {
    if (remaining <= 0) break;
    const bal = await CreditBalance.findOne({ customerId, scopeSalonId: scope });
    if (!bal) continue;
    const avail = bal.earned - bal.used;
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    // atomic guard — only succeeds if (earned - used) still >= take
    const updated = await CreditBalance.findOneAndUpdate(
      { _id: bal._id, $expr: { $gte: [{ $subtract: ['$earned', '$used'] }, take] } },
      { $inc: { used: take } },
      { new: true }
    );
    if (!updated) continue; // lost a race; skip this scope
    remaining -= take;
    applied.push({ scopeSalonId: scope, amount: take });
    await CreditTransaction.create({
      customerId,
      scopeSalonId: scope,
      type: 'redeem',
      source,
      amount: take,
      balanceAfter: updated.earned - updated.used,
      bookingId: extra.bookingId,
      description: extra.description,
      meta: extra.meta,
    });
  }
  return { redeemed: amount - remaining, applied };
};

// Restore previously-redeemed credits (e.g. booking cancelled) back to their original scopes.
// appliedSplit = [{ scopeSalonId, amount }] saved from the redeem.
const restoreCredits = async (customerId, appliedSplit = [], source = 'booking_refund', extra = {}) => {
  for (const part of appliedSplit) {
    if (!(part.amount > 0)) continue;
    const scope = norm(part.scopeSalonId);
    const bal = await CreditBalance.findOneAndUpdate(
      { customerId, scopeSalonId: scope },
      { $inc: { used: -part.amount } },
      { new: true }
    );
    if (!bal) continue;
    await CreditTransaction.create({
      customerId,
      scopeSalonId: scope,
      type: 'earn',
      source,
      amount: part.amount,
      balanceAfter: bal.earned - bal.used,
      bookingId: extra.bookingId,
      description: extra.description || 'Credits restored (booking cancelled)',
    });
  }
};

// Admin: grant credits to a customer (platform-wide if scopeSalonId omitted).
const adminGrant = async (customerId, amount, scopeSalonId = null, description = 'Admin grant') =>
  earnCredit(customerId, amount, 'admin', { type: 'admin_grant', scopeSalonId, description });

// Admin: remove credits from a customer (reduces available in that scope; never below 0).
const adminRemove = async (customerId, amount, scopeSalonId = null, description = 'Admin removal') => {
  if (!(amount > 0)) throw new Error('INVALID_AMOUNT');
  const scope = norm(scopeSalonId);
  const updated = await CreditBalance.findOneAndUpdate(
    { customerId, scopeSalonId: scope, $expr: { $gte: [{ $subtract: ['$earned', '$used'] }, amount] } },
    { $inc: { used: amount } },
    { new: true }
  );
  if (!updated) {
    const err = new Error('INSUFFICIENT_CREDITS');
    err.code = 'INSUFFICIENT_CREDITS';
    throw err;
  }
  const transaction = await CreditTransaction.create({
    customerId, scopeSalonId: scope, type: 'admin_remove', source: 'admin',
    amount, balanceAfter: updated.earned - updated.used, description,
  });
  return { balance: updated, transaction, available: updated.earned - updated.used };
};

module.exports = {
  getOrCreateBalance,
  earnCredit,
  availableForSalon,
  getBreakdown,
  redeemForSalon,
  restoreCredits,
  adminGrant,
  adminRemove,
};
