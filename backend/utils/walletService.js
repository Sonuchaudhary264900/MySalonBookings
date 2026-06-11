// utils/walletService.js
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

// Fetch a wallet, creating it (with zero balance) on first access
const getOrCreateWallet = async (ownerId, ownerType) => {
  let wallet = await Wallet.findOne({ ownerId, ownerType });
  if (!wallet) {
    try {
      wallet = await Wallet.create({ ownerId, ownerType, balance: 0 });
    } catch (e) {
      // Race: another request created it first
      wallet = await Wallet.findOne({ ownerId, ownerType });
    }
  }
  return wallet;
};

// Add money to a wallet and record the ledger entry
const credit = async (ownerId, ownerType, amount, source, extra = {}) => {
  if (!(amount > 0)) throw new Error('INVALID_AMOUNT');

  await getOrCreateWallet(ownerId, ownerType);

  const wallet = await Wallet.findOneAndUpdate(
    { ownerId, ownerType },
    { $inc: { balance: amount } },
    { new: true }
  );

  const transaction = await WalletTransaction.create({
    walletId: wallet._id,
    ownerId,
    ownerType,
    type: 'credit',
    source,
    amount,
    balanceAfter: wallet.balance,
    ...extra,
  });

  return { wallet, transaction };
};

// Remove money from a wallet only if sufficient balance exists; record the ledger entry
const debit = async (ownerId, ownerType, amount, source, extra = {}) => {
  if (!(amount > 0)) throw new Error('INVALID_AMOUNT');

  const wallet = await Wallet.findOneAndUpdate(
    { ownerId, ownerType, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true }
  );

  if (!wallet) {
    const error = new Error('INSUFFICIENT_BALANCE');
    error.code = 'INSUFFICIENT_BALANCE';
    throw error;
  }

  const transaction = await WalletTransaction.create({
    walletId: wallet._id,
    ownerId,
    ownerType,
    type: 'debit',
    source,
    amount,
    balanceAfter: wallet.balance,
    ...extra,
  });

  return { wallet, transaction };
};

// Claw back a previously credited earning (e.g. booking refunded after payout was recorded).
// Unlike debit(), this can take an owner's balance negative — it represents money owed back.
const reverseEarning = async (ownerId, ownerType, amount, source, extra = {}) => {
  if (!(amount > 0)) throw new Error('INVALID_AMOUNT');

  await getOrCreateWallet(ownerId, ownerType);

  const wallet = await Wallet.findOneAndUpdate(
    { ownerId, ownerType },
    { $inc: { balance: -amount } },
    { new: true }
  );

  const transaction = await WalletTransaction.create({
    walletId: wallet._id,
    ownerId,
    ownerType,
    type: 'debit',
    source,
    amount,
    balanceAfter: wallet.balance,
    ...extra,
  });

  return { wallet, transaction };
};

module.exports = { getOrCreateWallet, credit, debit, reverseEarning };
