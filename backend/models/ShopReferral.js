// models/ShopReferral.js
// Owner-run, per-shop customer referral. Reward (a shop-locked Booking Credit) is paid
// to the referrer after the referred customer's first completed booking at that shop.
const mongoose = require('mongoose');

const shopReferralSchema = new mongoose.Schema(
  {
    shopId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    referrerCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    referredCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    rewardAmount: { type: Number, required: true },
    status:       { type: String, enum: ['pending', 'rewarded'], default: 'pending' },
    rewardTxnId:  { type: mongoose.Schema.Types.ObjectId },
    rewardedAt:   Date,
  },
  { timestamps: true }
);

// One referral reward per (shop, referred customer)
shopReferralSchema.index({ shopId: 1, referredCustomerId: 1 }, { unique: true });
shopReferralSchema.index({ status: 1 });

module.exports = mongoose.model('ShopReferral', shopReferralSchema);
